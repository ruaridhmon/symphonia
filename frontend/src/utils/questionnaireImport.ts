import type { ConfigurableQuestion, SurveyInputType } from './questions';

export interface QuestionnaireImportResult {
  questions: ConfigurableQuestion[];
  warnings: string[];
  importedRoundLabel: string | null;
  skippedRoundLabels: string[];
}

interface QuestionBlock {
  questionId: string;
  label: string;
  sectionTitle: string | null;
  lines: string[];
}

const QUESTION_START_RE = /^(Q\d+[a-zA-Z]?)\.\s+(.*)$/;
const ROUND_START_RE = /^Round\s+(\d+)\s*:\s*(.+)$/i;
const SECTION_RE = /^Section\s+[A-Z0-9]+\.\s*(.+)$/i;

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim());
}

function parseAnchorLabels(line: string | null): Pick<ConfigurableQuestion, 'minLabel' | 'midLabel' | 'maxLabel'> {
  if (!line) {
    return {
      minLabel: null,
      midLabel: null,
      maxLabel: null,
    };
  }

  const minMatch = line.match(/0\s*=\s*([^,]+?)(?=,\s*5\s*=|,\s*10\s*=|$)/i);
  const midMatch = line.match(/5\s*=\s*([^,]+?)(?=,\s*10\s*=|$)/i);
  const maxMatch = line.match(/10\s*=\s*(.+)$/i);

  return {
    minLabel: minMatch?.[1]?.trim() ?? null,
    midLabel: midMatch?.[1]?.trim() ?? null,
    maxLabel: maxMatch?.[1]?.trim() ?? null,
  };
}

function detectInputType(responseType: string | null, label: string): SurveyInputType {
  const source = `${responseType ?? ''} ${label}`.toLowerCase();
  if (source.includes('select up to')) return 'multi_select';
  if (source.includes('select one') || source.includes('select 1')) return 'single_select';
  if (source.includes('slider')) return 'slider';
  if (/0\s*=\s*.+10\s*=\s*/i.test(label)) return 'slider';
  if (source.includes('free text')) {
    const wordsMatch = source.match(/max\s+(\d+)\s+words?/);
    return wordsMatch && Number(wordsMatch[1]) <= 25 ? 'text' : 'textarea';
  }
  return 'textarea';
}

function extractMaxSelections(responseType: string | null): number | null {
  if (!responseType) return null;
  const match = responseType.match(/select up to\s+(\d+)/i);
  return match ? Number(match[1]) : null;
}

function extractReferenceId(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(/same list as\s+(Q\d+[a-zA-Z]?)/i);
  return match?.[1] ?? null;
}

function isDynamicQuestion(text: string): boolean {
  return /populate this dynamically|dynamic list|top 8 issues|selected in q\d+|selected item/i.test(text);
}

function buildHelpText(
  sectionTitle: string | null,
  routing: string | null,
  extraNotes: string[],
): string | null {
  const parts = [sectionTitle, routing ? `Routing: ${routing}` : null, ...extraNotes]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildQuestionBase(
  block: QuestionBlock,
  overrides: Partial<ConfigurableQuestion>,
): ConfigurableQuestion {
  return {
    label: block.label,
    requireEvidence: false,
    requireCounterarguments: false,
    requireConfidence: false,
    questionId: block.questionId,
    importedFromQuestionnaire: true,
    fieldType: null,
    rows: null,
    placeholder: null,
    ...overrides,
  };
}

function parseBlock(
  block: QuestionBlock,
  optionRegistry: Map<string, string[]>,
): { questions: ConfigurableQuestion[]; warnings: string[]; exportedOptions?: string[] } {
  const warnings: string[] = [];
  const responseTypeLine = block.lines.find((line) => /^Response type:/i.test(line)) ?? null;
  const routingLine = block.lines.find((line) => /^Routing:/i.test(line)) ?? null;
  const anchorLine = block.lines.find((line) => /^Anchor labels:/i.test(line)) ?? null;

  const responseType = responseTypeLine?.replace(/^Response type:\s*/i, '').trim() ?? null;
  const routing = routingLine?.replace(/^Routing:\s*/i, '').trim() ?? null;
  const anchorLabels = parseAnchorLabels(anchorLine?.replace(/^Anchor labels:\s*/i, '').trim() ?? null);

  const contentLines = block.lines.filter((line) => {
    return (
      line &&
      !/^Response type:/i.test(line) &&
      !/^Routing:/i.test(line) &&
      !/^Anchor labels:/i.test(line)
    );
  });

  const extraNotes = contentLines.filter((line) => /^Optional:|^Before Q\d+|^Populate this dynamically/i.test(line));
  const optionLines = contentLines.filter((line) => !/^Optional:|^Before Q\d+|^Populate this dynamically/i.test(line));
  const referenceId =
    extractReferenceId(responseType) ??
    extractReferenceId(routing) ??
    optionLines.flatMap((line) => (extractReferenceId(line) ? [extractReferenceId(line)!] : []))[0] ??
    null;

  const resolvedOptions = referenceId ? optionRegistry.get(referenceId) ?? [] : optionLines;
  const detectedInputType = detectInputType(responseType, block.label);
  const inputType =
    !responseType && optionLines.length >= 2 && detectedInputType === 'textarea'
      ? 'single_select'
      : detectedInputType;
  const helpText = buildHelpText(block.sectionTitle, routing, extraNotes);
  const dynamicSource = [block.label, responseType, routing, ...contentLines].filter(Boolean).join(' ');

  if (isDynamicQuestion(dynamicSource)) {
    warnings.push(`${block.questionId} was skipped because it depends on dynamic or routed list generation.`);
    return { questions: [], warnings };
  }

  if (inputType === 'slider' && /for each item/i.test(responseType ?? '') && resolvedOptions.length > 0) {
    const questions = resolvedOptions.map((item, index) =>
      buildQuestionBase(block, {
        label: item,
        questionId: `${block.questionId}_${index + 1}`,
        helpText: buildHelpText(
          block.sectionTitle,
          routing,
          [block.label, ...extraNotes].filter(Boolean),
        ),
        inputType: 'slider',
        minValue: 0,
        maxValue: 10,
        minLabel: anchorLabels.minLabel,
        midLabel: anchorLabels.midLabel,
        maxLabel: anchorLabels.maxLabel,
      }),
    );
    return { questions, warnings, exportedOptions: resolvedOptions };
  }

  if ((inputType === 'single_select' || inputType === 'multi_select') && resolvedOptions.length === 0) {
    warnings.push(`${block.questionId} was imported as free text because no options could be resolved.`);
    return {
      questions: [
        buildQuestionBase(block, {
          helpText,
          inputType: 'textarea',
          rows: 4,
          placeholder: 'Write your response here',
        }),
      ],
      warnings,
    };
  }

  const question = buildQuestionBase(block, {
    helpText,
    inputType,
    options: inputType === 'single_select' || inputType === 'multi_select' ? resolvedOptions : null,
    maxSelections: inputType === 'multi_select' ? extractMaxSelections(responseType) : null,
    minValue: inputType === 'slider' ? 0 : null,
    maxValue: inputType === 'slider' ? 10 : null,
    minLabel: inputType === 'slider' ? anchorLabels.minLabel : null,
    midLabel: inputType === 'slider' ? anchorLabels.midLabel : null,
    maxLabel: inputType === 'slider' ? anchorLabels.maxLabel : null,
    rows: inputType === 'textarea' ? 4 : null,
    placeholder:
      inputType === 'text'
        ? 'Write a short response'
        : inputType === 'textarea'
          ? 'Write your response here'
          : null,
  });

  return {
    questions: [question],
    warnings,
    exportedOptions:
      inputType === 'single_select' || inputType === 'multi_select' || inputType === 'slider'
        ? resolvedOptions
        : undefined,
  };
}

export function parseQuestionnaireText(text: string): QuestionnaireImportResult {
  const lines = normalizeLines(text);
  const blocks: QuestionBlock[] = [];
  const skippedRoundLabels: string[] = [];
  let importedRoundLabel: string | null = null;
  let currentSection: string | null = null;
  let currentBlock: QuestionBlock | null = null;
  let importEnabled = true;

  for (const line of lines) {
    if (!line) {
      if (currentBlock) currentBlock.lines.push(line);
      continue;
    }

    const roundMatch = line.match(ROUND_START_RE);
    if (roundMatch) {
      if (currentBlock && importEnabled) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      const roundLabel = `Round ${roundMatch[1]}: ${roundMatch[2].trim()}`;
      if (importedRoundLabel === null) {
        importedRoundLabel = roundLabel;
        importEnabled = roundMatch[1] === '1';
      } else if (roundMatch[1] !== '1') {
        skippedRoundLabels.push(roundLabel);
        importEnabled = false;
      }
      continue;
    }

    if (!importEnabled) {
      continue;
    }

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const questionMatch = line.match(QUESTION_START_RE);
    if (questionMatch) {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = {
        questionId: questionMatch[1],
        label: questionMatch[2].trim(),
        sectionTitle: currentSection,
        lines: [],
      };
      continue;
    }

    if (currentBlock) {
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock && importEnabled) {
    blocks.push(currentBlock);
  }

  const questions: ConfigurableQuestion[] = [];
  const warnings: string[] = [];
  const optionRegistry = new Map<string, string[]>();

  for (const block of blocks) {
    const parsed = parseBlock(block, optionRegistry);
    questions.push(...parsed.questions);
    warnings.push(...parsed.warnings);
    if (parsed.exportedOptions && parsed.exportedOptions.length > 0) {
      optionRegistry.set(block.questionId, parsed.exportedOptions);
    }
  }

  if (skippedRoundLabels.length > 0) {
    warnings.push(`Later rounds were not imported into the active form: ${skippedRoundLabels.join(', ')}.`);
  }

  if (questions.length === 0) {
    warnings.push('No importable questions were found in the uploaded questionnaire.');
  }

  return {
    questions,
    warnings,
    importedRoundLabel,
    skippedRoundLabels,
  };
}
