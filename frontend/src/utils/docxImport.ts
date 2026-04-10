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
