import {
  DEFAULT_LIKERT_OPTIONS,
  type ConfigurableQuestion,
  type SurveyInputType,
} from './questions';
import {
  createRichFillableDocumentTemplate,
  serializeRichDocumentField,
  slugifyDocumentFieldKey,
  type DocumentTemplateField,
} from './documentTemplate';

export interface QuestionnaireImportResult {
  questions: ConfigurableQuestion[];
  warnings: string[];
  importedRoundLabel: string | null;
  skippedRoundLabels: string[];
  introParagraphs: string[];
}

export interface QuestionnaireRichTemplateResult extends QuestionnaireImportResult {
  template: string;
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
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .split('\n')
    .map((line) => line.trim());
}

function stripListMarker(line: string): string {
  return line.replace(/^(?:[•●▪◦*-]|\d+[.)]|[a-z][.)])\s+/, '').trim();
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
  if (/choose\s+up\s+to\s+\d+/i.test(source)) return 'multi_select';
  if (source.includes('likert') || source.includes('five-point') || source.includes('five point')) {
    return 'likert';
  }
  if (
    source.includes('select one') ||
    source.includes('select 1') ||
    source.includes('choose one') ||
    source.includes('choose 1') ||
    source.includes('single choice')
  ) {
    return 'single_select';
  }
  if (source.includes('slider') || /0\s*-\s*10/i.test(source) || /0\s*to\s*10/i.test(source)) return 'slider';
  if (/0\s*=\s*.+10\s*=\s*/i.test(label)) return 'slider';
  if (source.includes('free text')) {
    const wordsMatch = source.match(/max\s+(\d+)\s+words?/);
    return wordsMatch && Number(wordsMatch[1]) <= 25 ? 'text' : 'textarea';
  }
  return 'textarea';
}

function parseDelimitedLabels(source: string): string[] {
  return source
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^['"]|['"]$/g, '').trim());
}

function extractLikertScale(
  responseType: string | null,
  optionLines: string[],
): { options: string[]; allowUnsure: boolean } | null {
  const explicitOptions = optionLines.filter(Boolean);
  const normalizedExplicit = explicitOptions.map((option) => option.trim());
  const explicitUnsure = normalizedExplicit.find((option) => /don't know|dont know|unsure/i.test(option));
  const explicitScale = normalizedExplicit.filter((option) => !/don't know|dont know|unsure/i.test(option));
  if (explicitScale.length >= 5) {
    return {
      options: explicitScale,
      allowUnsure: !!explicitUnsure,
    };
  }

  if (!responseType) {
    return null;
  }

  const scaleMatch = responseType.match(/\(([^)]+)\)/);
  const parsed = scaleMatch ? parseDelimitedLabels(scaleMatch[1]) : [];
  const allowUnsure =
    /don't know|dont know|unsure/i.test(responseType) ||
    parsed.some((item) => /don't know|dont know|unsure/i.test(item));
  const options = parsed.filter((item) => !/don't know|dont know|unsure/i.test(item));

  if (options.length >= 5) {
    return { options, allowUnsure };
  }

  if (/likert|five-point|five point/i.test(responseType)) {
    return {
      options: [...DEFAULT_LIKERT_OPTIONS],
      allowUnsure,
    };
  }

  return null;
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
  return /populate this dynamically|dynamic list|top 8 issues|items selected in q\d+|selected item/i.test(text);
}

function shouldSkipDynamicSubQuestions(block: QuestionBlock): boolean {
  const source = [block.label, ...block.lines].join(' ');
  return (
    /selected in q\d+|selected item/i.test(source) &&
    /for each|following\s+(?:three|\d+)\s+dimensions/i.test(source)
  );
}

function buildHelpText(
  routing: string | null,
  extraNotes: string[],
): string | null {
  const parts = [routing ? `Routing: ${routing}` : null, ...extraNotes]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part);
  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildQuestionBase(
  block: QuestionBlock,
  overrides: Partial<ConfigurableQuestion>,
): ConfigurableQuestion {
  const normalizedLabel = block.label.trim();
  const isOptional = /^optional[:\s]/i.test(normalizedLabel);
  return {
    label: block.label,
    requireEvidence: false,
    requireCounterarguments: false,
    requireConfidence: false,
    questionId: block.questionId,
    sectionTitle: block.sectionTitle,
    importedFromQuestionnaire: true,
    fieldType: null,
    rows: null,
    placeholder: null,
    optional: isOptional,
    conditionalOnQuestionId: null,
    conditionalOnOption: null,
    ...overrides,
  };
}

function extractRoutingCondition(routing: string | null): { questionId: string; option: string } | null {
  if (!routing) return null;
  const match = routing.match(/only if\s+[‘'"]?(.+?)[’'"]?\s+selected in\s+(Q\d+[a-zA-Z]?)/i);
  if (!match) return null;
  return {
    option: match[1].trim(),
    questionId: match[2].trim(),
  };
}

function inferFollowUpRows(source: string): number {
  const match = source.match(/max\s+(\d+)\s+words?/i);
  if (!match) return 3;
  const maxWords = Number(match[1]);
  if (maxWords <= 30) return 2;
  if (maxWords <= 80) return 3;
  return 4;
}

function extractOptionFollowUp(option: string): { optionLabel: string; label: string; prompt: string; rows: number } | null {
  const trimmed = option.trim();
  if (!trimmed) return null;

  if (/^other$/i.test(trimmed)) {
    return {
      optionLabel: trimmed,
      label: 'Other: Please specify',
      prompt: 'Please specify',
      rows: 2,
    };
  }

  const match = trimmed.match(/^(.*?)(?:\s*\((.+)\))$/);
  if (!match) return null;

  const baseLabel = match[1].trim();
  const suffix = match[2].trim();
  const looksLikeFollowUp =
    /^other$/i.test(baseLabel) ||
    /please specify|free text|self-describe|self describe/i.test(suffix) ||
    /please specify|self-describe|self describe/i.test(baseLabel);
  if (!looksLikeFollowUp) return null;

  const prompt = /^other$/i.test(baseLabel)
    ? 'Please specify'
    : /self-describe|self describe/i.test(baseLabel)
      ? 'Please describe'
      : 'Please specify';
  return {
    optionLabel: trimmed,
    label: `${baseLabel}: ${prompt}`,
    prompt,
    rows: inferFollowUpRows(suffix),
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
  const routingCondition = extractRoutingCondition(routing);
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
  const optionLines = contentLines
    .filter((line) => !/^Optional:|^Before Q\d+|^Populate this dynamically/i.test(line))
    .map((line) => stripListMarker(line))
    .filter(Boolean);
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
  const likertScale = inputType === 'likert' ? extractLikertScale(responseType, resolvedOptions) : null;
  const helpText = buildHelpText(routing, extraNotes);
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
        helpText: buildHelpText(routing, extraNotes),
        groupPrompt: block.label,
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

  const otherSpecify = (inputType === 'single_select' || inputType === 'multi_select')
    ? resolvedOptions
        .map((option) => extractOptionFollowUp(option))
        .find((item): item is { optionLabel: string; label: string; prompt: string; rows: number } => !!item) ?? null
    : null;

  const question = buildQuestionBase(block, {
    helpText,
    inputType,
    conditionalOnQuestionId: routingCondition?.questionId ?? null,
    conditionalOnOption: routingCondition?.option ?? null,
    options:
      inputType === 'single_select' || inputType === 'multi_select'
        ? resolvedOptions
        : inputType === 'likert'
          ? (likertScale?.options ?? [...DEFAULT_LIKERT_OPTIONS])
          : null,
    allowUnsure: inputType === 'likert' ? (likertScale?.allowUnsure ?? false) : null,
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

  const questions: ConfigurableQuestion[] = [question];

  if (otherSpecify) {
    questions.push(
      buildQuestionBase(block, {
        label: otherSpecify.label,
        questionId: `${block.questionId}_other`,
        inputType: 'text',
        rows: null,
        placeholder: otherSpecify.prompt,
        helpText: null,
        optional: false,
        conditionalOnQuestionId: block.questionId,
        conditionalOnOption: otherSpecify.optionLabel,
      }),
    );
  }

  return {
    questions,
    warnings,
    exportedOptions:
      inputType === 'single_select' || inputType === 'multi_select' || inputType === 'slider'
        ? resolvedOptions
        : inputType === 'likert'
          ? (likertScale?.options ?? [...DEFAULT_LIKERT_OPTIONS])
        : undefined,
  };
}

export function parseQuestionnaireText(text: string): QuestionnaireImportResult {
  const lines = normalizeLines(text);
  const blocks: QuestionBlock[] = [];
  const skippedRoundLabels: string[] = [];
  let importedRoundLabel: string | null = null;
  const introParagraphs: string[] = [];
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
    } else if (currentSection === null) {
      introParagraphs.push(line);
    }
  }

  if (currentBlock && importEnabled) {
    blocks.push(currentBlock);
  }

  const questions: ConfigurableQuestion[] = [];
  const warnings: string[] = [];
  const optionRegistry = new Map<string, string[]>();
  let skipSubQuestionsForPrefix: string | null = null;

  for (const block of blocks) {
    const normalizedQuestionId = block.questionId.trim().toLowerCase();
    if (
      skipSubQuestionsForPrefix &&
      normalizedQuestionId !== skipSubQuestionsForPrefix &&
      normalizedQuestionId.startsWith(skipSubQuestionsForPrefix)
    ) {
      warnings.push(
        `${block.questionId} was skipped because it belongs to a dynamic repeated question block that cannot be built statically.`,
      );
      continue;
    }
    if (skipSubQuestionsForPrefix && !normalizedQuestionId.startsWith(skipSubQuestionsForPrefix)) {
      skipSubQuestionsForPrefix = null;
    }

    const parsed = parseBlock(block, optionRegistry);
    questions.push(...parsed.questions);
    warnings.push(...parsed.warnings);
    if (parsed.exportedOptions && parsed.exportedOptions.length > 0) {
      optionRegistry.set(block.questionId, parsed.exportedOptions);
    }
    if (
      parsed.questions.length === 0 &&
      parsed.warnings.some((warning) => warning.includes('dynamic or routed list generation')) &&
      shouldSkipDynamicSubQuestions(block)
    ) {
      skipSubQuestionsForPrefix = normalizedQuestionId;
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
    introParagraphs,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function questionToDocumentField(question: ConfigurableQuestion, fallbackKey: string): DocumentTemplateField {
  const inputType = question.inputType ?? 'textarea';
  const fieldType: DocumentTemplateField['fieldType'] =
    inputType === 'text'
      ? 'short'
      : inputType === 'textarea'
        ? 'long'
        : inputType;

  return {
    key: slugifyDocumentFieldKey(question.questionId?.trim() || fallbackKey),
    questionId: question.questionId?.trim() || undefined,
    label: question.label,
    showLabel: false,
    fieldType,
    inputType,
    optional: question.optional ?? false,
    rows: question.rows ?? (inputType === 'text' ? 1 : 4),
    placeholder:
      question.placeholder ??
      (inputType === 'text' ? 'Write a short response' : 'Write your response here'),
    options: question.options ?? undefined,
    maxSelections: question.maxSelections ?? undefined,
    minValue: question.minValue ?? undefined,
    maxValue: question.maxValue ?? undefined,
    minLabel: question.minLabel ?? undefined,
    midLabel: question.midLabel ?? undefined,
    maxLabel: question.maxLabel ?? undefined,
    allowUnsure: question.allowUnsure ?? undefined,
    conditionalOnQuestionId: question.conditionalOnQuestionId ?? undefined,
    conditionalOnOption: question.conditionalOnOption ?? undefined,
  };
}

export function convertQuestionnaireTextToRichTemplate(text: string): QuestionnaireRichTemplateResult {
  const parsed = parseQuestionnaireText(text);
  const htmlParts: string[] = [];
  const questionLabelById = new Map(
    parsed.questions
      .filter((question) => question.questionId)
      .map((question) => [question.questionId as string, question.label]),
  );

  if (parsed.importedRoundLabel && !/full question set/i.test(parsed.importedRoundLabel)) {
    htmlParts.push(`<h1>${escapeHtml(parsed.importedRoundLabel)}</h1>`);
  }

  parsed.introParagraphs.forEach((paragraph) => {
    htmlParts.push(
      `<p style="font-size: 1rem; line-height: 1.8; color: #32455f;">${escapeHtml(paragraph)}</p>`,
    );
  });

  let currentSection: string | null = null;
  let currentGroupPrompt: string | null = null;

  parsed.questions.forEach((question, index) => {
    if (question.sectionTitle && question.sectionTitle !== currentSection) {
      currentSection = question.sectionTitle;
      currentGroupPrompt = null;
      htmlParts.push(`<h2 style="margin-top: 1.4rem;">${escapeHtml(question.sectionTitle)}</h2>`);
    }

    if (question.groupPrompt && question.groupPrompt !== currentGroupPrompt) {
      currentGroupPrompt = question.groupPrompt;
      htmlParts.push(
        `<div style="margin: 0.8rem 0 0.65rem; padding: 0.8rem 1rem; border-radius: 1rem; background: #f3f7fb; border: 1px solid #d7e3f0;"><strong>${escapeHtml(question.groupPrompt)}</strong></div>`,
      );
    }

    const field = questionToDocumentField(question, `field-${index + 1}`);
    const fieldHtml = serializeRichDocumentField(field);
    const helpBits = [
      question.helpText,
      question.maxSelections && question.inputType === 'multi_select'
        ? `Select up to ${question.maxSelections}.`
        : null,
      question.conditionalOnQuestionId && question.conditionalOnOption
        ? `Shown when “${question.conditionalOnOption}” is selected for ${questionLabelById.get(question.conditionalOnQuestionId) ?? 'the earlier question'}.`
        : null,
    ].filter((value): value is string => !!value && value.trim() !== '');

    htmlParts.push(
      `<div style="margin: 0 0 1rem; padding: 1rem 1rem 1.05rem; border-radius: 1.15rem; border: 1px solid #dbe4ef; background: rgba(255,255,255,0.84);">
        <div style="margin-bottom: 0.55rem; font-size: 0.76rem; letter-spacing: 0.08em; text-transform: uppercase; color: #6a7b90;">${escapeHtml(question.questionId ?? `Question ${index + 1}`)}</div>
        <div style="margin-bottom: 0.75rem; font-size: 1rem; line-height: 1.65; font-weight: 600; color: #16263e;">${escapeHtml(question.label)}</div>
        <div>${fieldHtml}</div>
        ${helpBits.length > 0 ? `<div style="margin-top: 0.7rem; font-size: 0.84rem; line-height: 1.55; color: #58708a;">${escapeHtml(helpBits.join(' '))}</div>` : ''}
      </div>`,
    );
  });

  const templateHtml = htmlParts.join('');
  return {
    ...parsed,
    template: createRichFillableDocumentTemplate(templateHtml || '<p></p>'),
  };
}
