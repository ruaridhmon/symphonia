export function normalizeImportedDocumentHtml(sourceHtml: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(sourceHtml, 'text/html');

  document.querySelectorAll('script, style').forEach((node) => node.remove());

  document.querySelectorAll('*').forEach((element) => {
    const allowedAttributes = new Set(['href', 'colspan', 'rowspan', 'class', 'style']);
    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      if (!allowedAttributes.has(attributeName)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (attributeName === 'href') {
        const href = attribute.value.trim();
        if (!/^(https?:|mailto:|tel:|#)/i.test(href)) {
          element.removeAttribute(attribute.name);
        }
      }

      if (attributeName === 'style') {
        const safeStyles = attribute.value
          .split(';')
          .map((rule) => rule.trim())
          .filter(Boolean)
          .filter((rule) => {
            const [property = ''] = rule.split(':');
            return [
              'color',
              'background-color',
              'text-align',
              'font-weight',
              'font-style',
              'text-decoration',
              'text-decoration-line',
              'text-decoration-color',
              'border',
              'border-top',
              'border-right',
              'border-bottom',
              'border-left',
            ].includes(property.trim().toLowerCase());
          });

        if (safeStyles.length > 0) {
          element.setAttribute('style', safeStyles.join('; '));
        } else {
          element.removeAttribute('style');
        }
      }
    }
  });

  if (!document.body.innerHTML.trim()) {
    return '<p></p>';
  }

  return document.body.innerHTML
    .replace(/<p>\s*<\/p>/g, '<p></p>')
    .trim();
}

const QUESTIONNAIRE_SOURCE_COMMENT_RE = /<!--\s*symphonia-questionnaire-source:([\s\S]*?)-->/i;

export function attachQuestionnaireSourceToHtml(sourceHtml: string, questionnaireText: string): string {
  const normalizedSourceHtml = stripQuestionnaireSourceFromHtml(sourceHtml).trim();
  const normalizedQuestionnaireText = questionnaireText.trim();
  if (!normalizedQuestionnaireText) {
    return normalizedSourceHtml;
  }

  const encoded = encodeURIComponent(normalizedQuestionnaireText);
  return `<!-- symphonia-questionnaire-source:${encoded} -->\n${normalizedSourceHtml}`.trim();
}

export function extractQuestionnaireSourceFromHtml(sourceHtml: string): string | null {
  const match = sourceHtml.match(QUESTIONNAIRE_SOURCE_COMMENT_RE);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1].trim());
    return decoded.trim() || null;
  } catch {
    return null;
  }
}

export function stripQuestionnaireSourceFromHtml(sourceHtml: string): string {
  return sourceHtml.replace(QUESTIONNAIRE_SOURCE_COMMENT_RE, '').trim();
}

function extractLineFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === 'br') {
    return '\n';
  }

  const children = Array.from(element.childNodes).map(extractLineFromNode).join('');
  return children;
}

export function extractQuestionnaireTextFromHtml(sourceHtml: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(sourceHtml, 'text/html');
  const lines: string[] = [];

  function pushLine(value: string, prefix = '') {
    const normalizedChunks = value
      .split(/\n+/)
      .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (normalizedChunks.length === 0) return;
    normalizedChunks.forEach((chunk, index) => {
      lines.push(index === 0 && prefix ? `${prefix}${chunk}` : chunk);
    });
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      pushLine(node.textContent ?? '');
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (tag === 'ul' || tag === 'ol') {
      Array.from(element.children).forEach((child, index) => {
        if (child.tagName.toLowerCase() !== 'li') {
          walk(child);
          return;
        }
        const marker = tag === 'ol' ? `${index + 1}. ` : '• ';
        pushLine(extractLineFromNode(child), marker);
      });
      return;
    }

    if (tag === 'table') {
      element.querySelectorAll('tr').forEach((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'))
          .map((cell) => extractLineFromNode(cell))
          .map((value) => value.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (cells.length > 0) {
          lines.push(cells.join(' | '));
        }
      });
      return;
    }

    if (['p', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      pushLine(extractLineFromNode(element));
      return;
    }

    if (tag === 'div') {
      Array.from(element.childNodes).forEach(walk);
      return;
    }

    Array.from(element.childNodes).forEach(walk);
  }

  Array.from(document.body.childNodes).forEach(walk);

  const cleanedLines: string[] = [];
  let previousBlank = false;
  for (const line of lines) {
    const normalized = line.trim();
    const isBlank = !normalized;
    if (isBlank && previousBlank) continue;
    cleanedLines.push(normalized);
    previousBlank = isBlank;
  }

  return cleanedLines.join('\n').trim();
}

function normalizeQuestionnaireRawText(source: string): string {
  return source
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function inlineDocxImportStyles(container: HTMLElement): string {
  const styleProperties = [
    'color',
    'background-color',
    'text-align',
    'font-weight',
    'font-style',
    'text-decoration',
    'text-decoration-line',
    'text-decoration-color',
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
  ];

  container.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const computed = window.getComputedStyle(element);
    const rules = styleProperties
      .map((property) => {
        const value = computed.getPropertyValue(property).trim();
        if (!value) return null;
        if (property === 'color' && value === 'rgb(0, 0, 0)') return null;
        if (property === 'background-color' && /rgba?\(0,\s*0,\s*0,\s*0\)/.test(value)) return null;
        if (property.startsWith('border') && (value === '0px none rgb(0, 0, 0)' || value === 'none')) return null;
        if ((property === 'text-decoration' || property === 'text-decoration-line') && value === 'none') return null;
        if (property === 'font-weight' && value === '400') return null;
        if (property === 'font-style' && value === 'normal') return null;
        if (property === 'text-align' && value === 'start') return null;
        return `${property}: ${value}`;
      })
      .filter((rule): rule is string => Boolean(rule));

    if (rules.length > 0) {
      element.setAttribute('style', rules.join('; '));
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name === 'class' && attribute.value.startsWith('docx')) {
        continue;
      }
      if (name.startsWith('data-')) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  const documentRoot = container.querySelector<HTMLElement>('.docx');
  return documentRoot?.innerHTML || container.innerHTML;
}

export async function importDocxAsHtml(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const docxPreview = await import('docx-preview');
  const container = document.createElement('div');
  await docxPreview.renderAsync(arrayBuffer, container, undefined, {
    className: 'docx',
    inWrapper: false,
    ignoreWidth: true,
    ignoreHeight: true,
    breakPages: false,
    renderFootnotes: false,
    renderEndnotes: false,
    renderHeaders: false,
    renderFooters: false,
    useBase64URL: true,
  });

  return normalizeImportedDocumentHtml(inlineDocxImportStyles(container));
}

export async function extractQuestionnaireTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import('mammoth/mammoth.browser');
  const result = await mammoth.extractRawText({ arrayBuffer });
  return normalizeQuestionnaireRawText(result.value ?? '');
}
