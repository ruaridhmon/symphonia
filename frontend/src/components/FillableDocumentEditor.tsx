import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import { Extension, Node, mergeAttributes, type Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, Heading1, Heading2, Highlighter, Italic, List, ListOrdered, PaintBucket, Pilcrow, SeparatorHorizontal, Type, Underline as UnderlineIcon, X } from 'lucide-react';
import { emptyStructuredResponse } from '../types/structured-input';
import type { StructuredResponse } from '../types/structured-input';
import DocumentTemplateFieldControl from './DocumentTemplateFieldControl';
import type { DocumentTemplateField } from '../utils/documentTemplate';
import { createDocumentTemplatePlaceholder, createRichFillableDocumentTemplate } from '../utils/documentTemplate';

interface FillableDocumentEditorProps {
  value: string;
  onChange: (value: string) => void;
  previewAnswers: Record<string, StructuredResponse>;
  onPreviewChange?: (key: string, value: StructuredResponse) => void;
}

type CommandOption = {
  id: string;
  label: string;
  description: string;
  field: DocumentTemplateField;
};

type SelectedFieldState = {
  pos: number;
  attrs: {
    key: string;
    label: string;
    showLabel: boolean;
    fieldType: DocumentTemplateField['fieldType'];
    inputType: DocumentTemplateField['inputType'];
    optional: boolean;
    rows: number;
    placeholder: string;
    options: string;
    maxSelections: number | null;
    minValue: number | null;
    maxValue: number | null;
    minLabel: string | null;
    midLabel: string | null;
    maxLabel: string | null;
    allowUnsure: boolean;
  };
};

const COLOR_SWATCHES = ['#172033', '#1d4ed8', '#0f766e', '#b45309', '#be123c', '#6d28d9'];
const FONT_PRESETS = [
  { id: 'editorial', label: 'Editorial', style: { fontFamily: 'Georgia, "Times New Roman", serif' } },
  { id: 'modern', label: 'Modern', style: { fontFamily: '"Aptos", "Segoe UI", sans-serif' } },
  { id: 'technical', label: 'Technical', style: { fontFamily: '"IBM Plex Sans", "Helvetica Neue", sans-serif' } },
] as const;
const SIZE_PRESETS = [
  { id: '14', label: '14', fontSize: '0.875rem' },
  { id: '16', label: '16', fontSize: '1rem' },
  { id: '18', label: '18', fontSize: '1.125rem' },
  { id: '22', label: '22', fontSize: '1.375rem' },
  { id: '28', label: '28', fontSize: '1.75rem' },
] as const;

const FIELD_NODE_NAME = 'fillableField';

function parseFieldOptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function FieldNodePreview({ attrs, selected }: { attrs: SelectedFieldState['attrs']; selected: boolean }) {
  const field = {
    key: attrs.key,
    questionKey: attrs.key,
    label: attrs.label,
    showLabel: attrs.showLabel,
    fieldType: attrs.fieldType,
    inputType: attrs.inputType,
    optional: attrs.optional,
    rows: attrs.rows,
    placeholder: attrs.placeholder,
    options: parseFieldOptions(attrs.options),
    maxSelections: attrs.maxSelections ?? undefined,
    minValue: attrs.minValue ?? undefined,
    maxValue: attrs.maxValue ?? undefined,
    minLabel: attrs.minLabel ?? undefined,
    midLabel: attrs.midLabel ?? undefined,
    maxLabel: attrs.maxLabel ?? undefined,
    allowUnsure: attrs.allowUnsure,
  };

  return (
    <span
      className="symphonia-fillable-node inline-flex max-w-full align-middle"
      contentEditable={false}
      data-question-key={attrs.key}
    >
      <DocumentTemplateFieldControl
        field={field}
        response={emptyStructuredResponse()}
        readOnly={false}
        previewOnly
        highlighted={selected}
        emptyReadOnlyText={attrs.placeholder || 'Enter response'}
      />
    </span>
  );
}

const FillableFieldNodeView = ReactNodeViewRenderer((props) => (
  <NodeViewWrapper as="span" className="inline-flex align-middle">
    <FieldNodePreview attrs={props.node.attrs as SelectedFieldState['attrs']} selected={props.selected} />
  </NodeViewWrapper>
));

const ImportedDocumentStyles = Extension.create({
  name: 'importedDocumentStyles',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style'),
            renderHTML: (attributes) => (attributes.style ? { style: attributes.style } : {}),
          },
        },
      },
      {
        types: ['paragraph', 'heading', FIELD_NODE_NAME],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style'),
            renderHTML: (attributes) => (attributes.style ? { style: attributes.style } : {}),
          },
        },
      },
    ];
  },
});

const FillableFieldNode = Node.create({
  name: FIELD_NODE_NAME,
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      key: { default: 'field' },
      label: { default: 'Field' },
      showLabel: { default: true },
      fieldType: { default: 'short' },
      inputType: { default: 'text' },
      optional: { default: false },
      rows: { default: 4 },
      placeholder: { default: 'Enter response' },
      options: { default: '[]' },
      maxSelections: { default: null },
      minValue: { default: null },
      maxValue: { default: null },
      minLabel: { default: null },
      midLabel: { default: null },
      maxLabel: { default: null },
      allowUnsure: { default: false },
    };
  },

  addNodeView() {
    return FillableFieldNodeView;
  },

  parseHTML() {
    return [{ tag: 'span[data-symphonia-field-key]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-symphonia-field-key': HTMLAttributes.key,
        'data-symphonia-field-label': HTMLAttributes.label,
        'data-symphonia-show-label': HTMLAttributes.showLabel === false ? 'false' : 'true',
        'data-symphonia-field-type': HTMLAttributes.fieldType,
        'data-symphonia-input-type': HTMLAttributes.inputType,
        'data-symphonia-optional': HTMLAttributes.optional ? 'true' : 'false',
        'data-symphonia-rows': String(HTMLAttributes.rows ?? 4),
        'data-symphonia-placeholder': HTMLAttributes.placeholder,
        'data-symphonia-options': HTMLAttributes.options,
        'data-symphonia-max-selections': HTMLAttributes.maxSelections,
        'data-symphonia-min-value': HTMLAttributes.minValue,
        'data-symphonia-max-value': HTMLAttributes.maxValue,
        'data-symphonia-min-label': HTMLAttributes.minLabel,
        'data-symphonia-mid-label': HTMLAttributes.midLabel,
        'data-symphonia-max-label': HTMLAttributes.maxLabel,
        'data-symphonia-allow-unsure': HTMLAttributes.allowUnsure ? 'true' : 'false',
        class: 'symphonia-fillable-chip',
        contenteditable: 'false',
      }),
      `${HTMLAttributes.label} · ${String(HTMLAttributes.fieldType || 'field').replace('_', ' ')}${HTMLAttributes.optional ? ' · optional' : ''}`,
    ];
  },
});

function fieldFromType(type: CommandOption['field']['fieldType'], label: string, optional = false): DocumentTemplateField {
  const placeholder = createDocumentTemplatePlaceholder(type as Exclude<DocumentTemplateField['fieldType'], 'document'>, label, optional);
  const token = placeholder.slice(2, -2);
  const pipeParts = token.split(':');
  const prefix = pipeParts.shift();
  const maybeType = prefix === 'optional' ? pipeParts.shift() : prefix;
  const normalizedType = (maybeType ?? 'short') as DocumentTemplateField['fieldType'];
  const joined = pipeParts.join(':');
  const segments = joined.split('|').map((item) => item.trim()).filter(Boolean);
  const textLabel = segments[0] || label;
  const options = segments.slice(1);
  return {
    key: textLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    label: textLabel,
    fieldType: normalizedType,
    inputType: normalizedType === 'short' ? 'text' : normalizedType === 'long' ? 'textarea' : (normalizedType as DocumentTemplateField['inputType']),
    optional,
    rows: normalizedType === 'short' ? 1 : 6,
    placeholder: `Enter ${textLabel.toLowerCase()}`,
    options: normalizedType === 'single_select' || normalizedType === 'multi_select' || normalizedType === 'likert' ? options : undefined,
    maxSelections: undefined,
    minValue: normalizedType === 'slider' ? Number(options[0] ?? 0) : undefined,
    maxValue: normalizedType === 'slider' ? Number(options[1] ?? 10) : undefined,
    minLabel: normalizedType === 'slider' ? (options[2] ?? 'Low') : undefined,
    midLabel: normalizedType === 'slider' ? (options[3] ?? 'Midpoint') : undefined,
    maxLabel: normalizedType === 'slider' ? (options[4] ?? 'High') : undefined,
    allowUnsure: normalizedType === 'likert',
  };
}

const COMMAND_OPTIONS: CommandOption[] = [
  { id: 'short', label: 'Short text', description: 'Single-line response', field: fieldFromType('short', 'Field name') },
  { id: 'long', label: 'Long text', description: 'Paragraph response', field: fieldFromType('long', 'Section response') },
  { id: 'single-select', label: 'Single select', description: 'Choose one option', field: fieldFromType('single_select', 'Preferred direction') },
  { id: 'multi-select', label: 'Multi select', description: 'Choose several options', field: fieldFromType('multi_select', 'Concerns to monitor') },
  { id: 'slider', label: '0-10 slider', description: 'Score on a numeric scale', field: fieldFromType('slider', 'Priority score') },
  { id: 'likert', label: 'Likert scale', description: 'Agreement or importance scale', field: fieldFromType('likert', 'Importance rating') },
  { id: 'optional-long', label: 'Optional long text', description: 'Skippable paragraph response', field: fieldFromType('long', 'Optional response', true) },
];

function getSlashMenuState(editor: Editor | null) {
  if (!editor) return null;
  const { $from } = editor.state.selection;
  if (!$from.parent.isTextblock) return null;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, '\0', '\0');
  const slashIndex = textBefore.lastIndexOf('/');
  if (slashIndex < 0) return null;
  const query = textBefore.slice(slashIndex + 1);
  if (!/^[a-z\s-]*$/i.test(query)) return null;
  const start = $from.start() + slashIndex;
  const end = $from.pos;
  const labelHint = textBefore.slice(0, slashIndex).split(/\n/).pop()?.trim() ?? '';
  return { start, end, query: query.trim().toLowerCase(), labelHint };
}

function RichToolbarButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
      style={{
        border: active ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1px solid var(--border)',
        backgroundColor: active ? 'color-mix(in srgb, var(--accent) 9%, transparent)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--muted-foreground)',
      }}
    >
      {icon}
    </button>
  );
}

function mergeInlineStyle(existingStyle: string | null | undefined, nextRules: Record<string, string | null | undefined>) {
  const styleMap = new Map<string, string>();
  (existingStyle || '')
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .forEach((rule) => {
      const [rawProperty, ...rawValue] = rule.split(':');
      const property = rawProperty?.trim();
      const value = rawValue.join(':').trim();
      if (property && value) styleMap.set(property, value);
    });

  Object.entries(nextRules).forEach(([property, value]) => {
    if (!value) {
      styleMap.delete(property);
      return;
    }
    styleMap.set(property, value);
  });

  return Array.from(styleMap.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join('; ');
}

export default function FillableDocumentEditor({
  value,
  onChange,
  previewAnswers: _previewAnswers,
  onPreviewChange: _onPreviewChange,
}: FillableDocumentEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const changeTimerRef = useRef<number | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const lastSyncedValueRef = useRef(value);
  const [slashMenu, setSlashMenu] = useState<{ start: number; end: number; query: string; labelHint: string } | null>(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedField, setSelectedField] = useState<SelectedFieldState | null>(null);
  const filteredCommands = COMMAND_OPTIONS.filter((option) =>
    !slashMenu?.query || option.label.toLowerCase().includes(slashMenu.query) || option.description.toLowerCase().includes(slashMenu.query),
  );
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>(FONT_PRESETS[1].style.fontFamily);
  const [selectedFontSize, setSelectedFontSize] = useState<string>(SIZE_PRESETS[1].fontSize);

  function buildInsertedField(option: CommandOption) {
    const labelHint = slashMenu?.labelHint?.trim();
    const label = labelHint || option.field.label;
    return fieldFromType(option.field.fieldType, label, option.field.optional);
  }

  function flushPendingChange() {
    if (changeTimerRef.current !== null) {
      window.clearTimeout(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    if (pendingValueRef.current === null) return;
    const nextValue = pendingValueRef.current;
    pendingValueRef.current = null;
    onChange(createRichFillableDocumentTemplate(nextValue));
  }

  function clearPendingChange() {
    if (changeTimerRef.current !== null) {
      window.clearTimeout(changeTimerRef.current);
      changeTimerRef.current = null;
    }
    pendingValueRef.current = null;
  }

  function scheduleChange(nextHtml: string, immediate = false) {
    pendingValueRef.current = nextHtml;
    if (immediate) {
      flushPendingChange();
      return;
    }
    if (changeTimerRef.current !== null) {
      window.clearTimeout(changeTimerRef.current);
    }
    changeTimerRef.current = window.setTimeout(() => {
      flushPendingChange();
    }, 140);
  }

  const editor = useEditor({
    editable: true,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Underline,
      ImportedDocumentStyles,
      Placeholder.configure({ placeholder: 'Write the document here, then type / to insert fillable fields…' }),
      FillableFieldNode,
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      const nextHtml = currentEditor.getHTML();
      lastSyncedValueRef.current = nextHtml;
      scheduleChange(nextHtml);
      const nextSlash = getSlashMenuState(currentEditor);
      setSlashMenu(nextSlash);
      setSelectedCommandIndex(0);
    },
    onBlur: () => {
      flushPendingChange();
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const nextSlash = getSlashMenuState(currentEditor);
      setSlashMenu(nextSlash);
      if (!nextSlash) setSelectedCommandIndex(0);
      const selection = currentEditor.state.selection;
      if (selection instanceof NodeSelection && selection.node.type.name === FIELD_NODE_NAME) {
        setSelectedField({
          pos: selection.from,
          attrs: selection.node.attrs as SelectedFieldState['attrs'],
        });
      } else {
        setSelectedField(null);
      }
    },
    editorProps: {
      attributes: {
        class: 'symphonia-fillable-editor focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        if (!slashMenu || filteredCommands.length === 0) return false;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedCommandIndex((current) => (current + 1) % filteredCommands.length);
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedCommandIndex((current) => (current - 1 + filteredCommands.length) % filteredCommands.length);
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab' || event.key === 'ArrowRight') {
          event.preventDefault();
          const option = filteredCommands[selectedCommandIndex] ?? filteredCommands[0];
          if (!option || !editor) return true;
          const insertedField = buildInsertedField(option);
          editor.chain().focus().deleteRange({ from: slashMenu.start, to: slashMenu.end }).insertContent({
            type: FIELD_NODE_NAME,
            attrs: {
              ...insertedField,
              options: JSON.stringify(insertedField.options ?? []),
            },
          }).run();
          setSlashMenu(null);
          setSelectedCommandIndex(0);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setSlashMenu(null);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(true);
  }, [editor]);

  useEffect(() => () => {
    clearPendingChange();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as globalThis.Node | null)) {
        flushPendingChange();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  });

  useEffect(() => {
    if (!editor) return;
    const content = value.trimStart().startsWith('<!-- symphonia-document-mode:')
      ? value.replace(/^<!--\s*symphonia-document-mode:\s*fillable-rich\s*-->\s*/i, '')
      : value;
    if (content === lastSyncedValueRef.current) return;
    if (editor.getHTML() === content) {
      clearPendingChange();
      lastSyncedValueRef.current = content;
      return;
    }
    clearPendingChange();
    editor.commands.setContent(content || '<p></p>', false);
    lastSyncedValueRef.current = content;
  }, [editor, value]);

  function setTextColor(color: string) {
    if (!editor) return;
    const currentStyle = (editor.getAttributes('textStyle').style as string | undefined) ?? '';
    editor.chain().focus().setMark('textStyle', {
      style: mergeInlineStyle(currentStyle, { color }),
    }).run();
  }

  function setBlockTextAlign(alignment: 'left' | 'center' | 'right' | 'justify') {
    if (!editor) return;
    const headingStyle = (editor.getAttributes('heading').style as string | undefined) ?? '';
    const paragraphStyle = (editor.getAttributes('paragraph').style as string | undefined) ?? '';
    const nextStyle = { 'text-align': alignment === 'left' ? null : alignment };
    const nextHeadingStyle = mergeInlineStyle(headingStyle, nextStyle);
    const nextParagraphStyle = mergeInlineStyle(paragraphStyle, nextStyle);

    editor.chain().focus().updateAttributes('paragraph', { style: nextParagraphStyle || null }).run();
    editor.chain().focus().updateAttributes('heading', { style: nextHeadingStyle || null }).run();
  }

  function isAligned(alignment: 'left' | 'center' | 'right' | 'justify') {
    const headingStyle = String(editor?.getAttributes('heading').style ?? '');
    const paragraphStyle = String(editor?.getAttributes('paragraph').style ?? '');
    if (alignment === 'left') {
      return !headingStyle.includes('text-align: center')
        && !headingStyle.includes('text-align: right')
        && !headingStyle.includes('text-align: justify')
        && !paragraphStyle.includes('text-align: center')
        && !paragraphStyle.includes('text-align: right')
        && !paragraphStyle.includes('text-align: justify');
    }
    return headingStyle.includes(`text-align: ${alignment}`) || paragraphStyle.includes(`text-align: ${alignment}`);
  }

  function setFontFamily(fontFamily: string) {
    if (!editor) return;
    setSelectedFontFamily(fontFamily);
    const currentStyle = (editor.getAttributes('textStyle').style as string | undefined) ?? '';
    editor.chain().focus().setMark('textStyle', {
      style: mergeInlineStyle(currentStyle, { 'font-family': fontFamily }),
    }).run();
  }

  function setFontSize(fontSize: string) {
    if (!editor) return;
    setSelectedFontSize(fontSize);
    const currentStyle = (editor.getAttributes('textStyle').style as string | undefined) ?? '';
    editor.chain().focus().setMark('textStyle', {
      style: mergeInlineStyle(currentStyle, { 'font-size': fontSize }),
    }).run();
  }

  function insertSectionHeading(level: 1 | 2, title: string) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(`<h${level}>${title}</h${level}><p></p>`)
      .run();
  }

  function insertGuidanceBlock() {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent('<blockquote>Use this section to give context or instructions before the next response field.</blockquote><p></p>')
      .run();
  }

  function insertDivider() {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent('<hr><p></p>')
      .run();
  }

  function updateSelectedField(updates: Partial<SelectedFieldState['attrs']>) {
    if (!editor || !selectedField) return;
    const nextAttrs = { ...selectedField.attrs, ...updates };
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(selectedField.pos, undefined, nextAttrs),
    );
    lastSyncedValueRef.current = editor.getHTML();
    setSelectedField({ pos: selectedField.pos, attrs: nextAttrs });
  }

  function removeSelectedField() {
    if (!editor || !selectedField) return;
    editor.chain().focus().deleteRange({ from: selectedField.pos, to: selectedField.pos + 1 }).run();
    setSelectedField(null);
  }

  const selectedFieldOptions = selectedField
    ? (() => {
        try {
          const parsed = JSON.parse(selectedField.attrs.options || '[]');
          return Array.isArray(parsed) ? parsed.join('\n') : '';
        } catch {
          return '';
        }
      })()
    : '';

  const settingsInputHandlers = {
    onFocus: () => setSlashMenu(null),
    onMouseDown: (event: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => event.stopPropagation(),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => event.stopPropagation(),
  };

  const settingsCheckboxHandlers = {
    onFocus: () => setSlashMenu(null),
    onMouseDown: (event: React.MouseEvent<HTMLInputElement>) => event.stopPropagation(),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => event.stopPropagation(),
  };

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-[1.7rem]"
      style={{
        border: '1px solid color-mix(in srgb, var(--border) 72%, transparent)',
        background:
          'linear-gradient(180deg, color-mix(in srgb, #fbfcff 96%, var(--background)) 0%, color-mix(in srgb, #f1f5fb 88%, var(--background)) 100%)',
      }}
    >
      <style>{`
        .symphonia-fillable-editor > *:first-child { margin-top: 0; }
        .symphonia-fillable-editor h1 { font-size: 1.85rem; line-height: 1.15; margin: 0 0 0.8rem; color: #10223e; font-weight: 700; }
        .symphonia-fillable-editor h2 { font-size: 1.25rem; line-height: 1.2; margin: 1.15rem 0 0.65rem; color: #183153; font-weight: 650; }
        .symphonia-fillable-editor p, .symphonia-fillable-editor li { line-height: 1.75; color: #182333; }
        .symphonia-fillable-editor ul, .symphonia-fillable-editor ol { padding-left: 1.25rem; }
        .symphonia-fillable-editor [style*="text-align: center"] { text-align: center; }
        .symphonia-fillable-editor [style*="text-align: right"] { text-align: right; }
        .symphonia-fillable-editor [style*="text-align: justify"] { text-align: justify; }
        .symphonia-fillable-editor .symphonia-fillable-node { margin: 0.12rem 0.22rem; vertical-align: middle; }
        .symphonia-fillable-editor .ProseMirror-selectednode .symphonia-fillable-node > span > span {
          border-color: color-mix(in srgb, var(--accent) 45%, transparent) !important;
          box-shadow: 0 18px 34px -24px rgba(37,99,235,0.45) !important;
        }
      `}</style>

      <div
        className="flex flex-col gap-3 border-b px-4 py-4"
        style={{ borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)' }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">Document canvas</div>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Edit the document directly here. Type normally for document text, type <code>/</code> to insert fields, and click a field chip to configure it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            >
              Single inline editing surface
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex items-center gap-2 rounded-xl px-2 py-1" style={{ border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.55)' }}>
              <Type size={14} style={{ color: 'var(--muted-foreground)' }} />
              <select
                aria-label="Font family"
                value={selectedFontFamily}
                onChange={(event) => setFontFamily(event.target.value)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                {FONT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.style.fontFamily} style={{ fontFamily: preset.style.fontFamily }}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mr-1 flex items-center gap-2 rounded-xl px-2 py-1" style={{ border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.55)' }}>
              <select
                aria-label="Font size"
                value={selectedFontSize}
                onChange={(event) => setFontSize(event.target.value)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                {SIZE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.fontSize}>
                    {preset.label}px
                  </option>
                ))}
              </select>
            </div>
            <RichToolbarButton label="Bold" active={Boolean(editor?.isActive('bold'))} onClick={() => editor?.chain().focus().toggleBold().run()} icon={<Bold size={14} />} />
            <RichToolbarButton label="Italic" active={Boolean(editor?.isActive('italic'))} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={<Italic size={14} />} />
            <RichToolbarButton label="Underline" active={Boolean(editor?.isActive('underline'))} onClick={() => editor?.chain().focus().toggleUnderline().run()} icon={<UnderlineIcon size={14} />} />
            <RichToolbarButton label="Heading 1" active={Boolean(editor?.isActive('heading', { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={14} />} />
            <RichToolbarButton label="Heading 2" active={Boolean(editor?.isActive('heading', { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={14} />} />
            <RichToolbarButton label="Bullets" active={Boolean(editor?.isActive('bulletList'))} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={<List size={14} />} />
            <RichToolbarButton label="Numbered" active={Boolean(editor?.isActive('orderedList'))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} icon={<ListOrdered size={14} />} />
            <RichToolbarButton label="Align left" active={isAligned('left')} onClick={() => setBlockTextAlign('left')} icon={<AlignLeft size={14} />} />
            <RichToolbarButton label="Align center" active={isAligned('center')} onClick={() => setBlockTextAlign('center')} icon={<AlignCenter size={14} />} />
            <RichToolbarButton label="Align right" active={isAligned('right')} onClick={() => setBlockTextAlign('right')} icon={<AlignRight size={14} />} />
            <RichToolbarButton label="Justify" active={isAligned('justify')} onClick={() => setBlockTextAlign('justify')} icon={<AlignJustify size={14} />} />
            <RichToolbarButton label="Highlight" active={Boolean(editor?.isActive('highlight'))} onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fff3a3' }).run()} icon={<Highlighter size={14} />} />
            <div className="ml-1 flex items-center gap-1 rounded-xl px-2 py-1" style={{ border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.55)' }}>
              <PaintBucket size={14} style={{ color: 'var(--muted-foreground)' }} />
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setTextColor(color)}
                  aria-label={`Set text color ${color}`}
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: color, border: '1px solid rgba(15,23,42,0.14)' }}
                />
              ))}
            </div>
            <div className="ml-1 flex flex-wrap items-center gap-1 rounded-xl px-2 py-1" style={{ border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.55)' }}>
              <button
                type="button"
                onClick={() => insertSectionHeading(1, 'New section')}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                <Heading1 size={13} />
                Section
              </button>
              <button
                type="button"
                onClick={() => insertSectionHeading(2, 'Subsection')}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                <Pilcrow size={13} />
                Subsection
              </button>
              <button
                type="button"
                onClick={insertGuidanceBlock}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                <Type size={13} />
                Guidance
              </button>
              <button
                type="button"
                onClick={insertDivider}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                style={{ border: '1px solid var(--border)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                <SeparatorHorizontal size={13} />
                Divider
              </button>
            </div>
        </div>
      </div>

      <div
        className="relative px-4 py-5"
        style={{
          background:
            'radial-gradient(circle at top, rgba(186,205,235,0.22), transparent 34%), linear-gradient(180deg, #f5f8fc 0%, #eef3f9 100%)',
        }}
      >
        <div className="mx-auto max-w-[1280px]">
            <div
              data-testid="document-template-rich-editor"
              className="relative rounded-[1.4rem] border bg-white px-8 py-10 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]"
              style={{ borderColor: 'rgba(148, 163, 184, 0.28)' }}
            >
              <EditorContent editor={editor} />
              {slashMenu && filteredCommands.length > 0 ? (
                <div
                  className="absolute left-8 top-8 z-10 w-[min(32rem,calc(100%-4rem))] rounded-2xl p-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.97)',
                    border: '1px solid rgba(148,163,184,0.26)',
                    boxShadow: '0 26px 60px -34px rgba(15,23,42,0.42)',
                  }}
                >
                  {filteredCommands.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (!editor || !slashMenu) return;
                        const insertedField = buildInsertedField(option);
                        editor.chain().focus().deleteRange({ from: slashMenu.start, to: slashMenu.end }).insertContent({
                          type: FIELD_NODE_NAME,
                          attrs: {
                            ...insertedField,
                            options: JSON.stringify(insertedField.options ?? []),
                          },
                        }).run();
                        setSlashMenu(null);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left"
                      style={{
                        border: 'none',
                        backgroundColor: index === selectedCommandIndex ? 'rgba(37,99,235,0.08)' : 'transparent',
                        color: 'var(--foreground)',
                      }}
                    >
                      <div>
                        <div className="text-sm font-semibold">{option.label}</div>
                        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{option.description}</div>
                      </div>
                      <ChevronDown size={14} style={{ transform: 'rotate(-90deg)', color: 'var(--muted-foreground)' }} />
                    </button>
                  ))}
                </div>
              ) : null}

              {selectedField ? (
                <div
                  className="absolute right-5 top-5 z-10 w-[min(22rem,calc(100%-2.5rem))] rounded-[1.25rem] border p-3"
                  style={{
                    borderColor: 'rgba(148, 163, 184, 0.22)',
                    backgroundColor: 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 24px 55px -34px rgba(15,23,42,0.42)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Field settings</div>
                      <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                        Edit this field without leaving the document canvas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedField(null);
                        editor?.commands.focus();
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        border: '1px solid color-mix(in srgb, var(--border) 84%, transparent)',
                        backgroundColor: 'rgba(255,255,255,0.85)',
                        color: 'var(--muted-foreground)',
                      }}
                      aria-label="Close field settings"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                        Label
                      </label>
                      <input
                        value={selectedField.attrs.label}
                        {...settingsInputHandlers}
                        onChange={(event) =>
                          updateSelectedField({
                            label: event.target.value,
                            key: event.target.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'field',
                            placeholder: `Enter ${event.target.value.trim().toLowerCase() || 'response'}`,
                          })
                        }
                        className="w-full rounded-xl px-3 py-2 text-sm"
                        style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                        Placeholder
                      </label>
                      <input
                        value={selectedField.attrs.placeholder}
                        {...settingsInputHandlers}
                        onChange={(event) => updateSelectedField({ placeholder: event.target.value })}
                        className="w-full rounded-xl px-3 py-2 text-sm"
                        style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                      <input
                        type="checkbox"
                        checked={selectedField.attrs.optional}
                        {...settingsCheckboxHandlers}
                        onChange={(event) => updateSelectedField({ optional: event.target.checked })}
                      />
                      Optional field
                    </label>

                    {(selectedField.attrs.fieldType === 'long' || selectedField.attrs.fieldType === 'short') ? (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                          Rows
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={selectedField.attrs.rows}
                          {...settingsInputHandlers}
                          onChange={(event) => updateSelectedField({ rows: Number(event.target.value) || 1 })}
                          className="w-full rounded-xl px-3 py-2 text-sm"
                          style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                        />
                      </div>
                    ) : null}

                    {(selectedField.attrs.fieldType === 'single_select' || selectedField.attrs.fieldType === 'multi_select' || selectedField.attrs.fieldType === 'likert') ? (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                          Options
                        </label>
                        <textarea
                          value={selectedFieldOptions}
                          {...settingsInputHandlers}
                          onChange={(event) =>
                            updateSelectedField({
                              options: JSON.stringify(
                                event.target.value
                                  .split('\n')
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              ),
                            })
                          }
                          rows={6}
                          className="w-full rounded-xl px-3 py-2 text-sm"
                          style={{ border: '1px solid var(--input)', backgroundColor: 'white', resize: 'vertical' }}
                        />
                      </div>
                    ) : null}

                    {selectedField.attrs.fieldType === 'multi_select' ? (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                          Max selections
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={selectedField.attrs.maxSelections ?? ''}
                          {...settingsInputHandlers}
                          onChange={(event) =>
                            updateSelectedField({
                              maxSelections: event.target.value ? Number(event.target.value) : null,
                            })
                          }
                          className="w-full rounded-xl px-3 py-2 text-sm"
                          style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                        />
                      </div>
                    ) : null}

                    {selectedField.attrs.fieldType === 'slider' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                            Min
                          </label>
                          <input
                            type="number"
                            value={selectedField.attrs.minValue ?? 0}
                            {...settingsInputHandlers}
                            onChange={(event) => updateSelectedField({ minValue: Number(event.target.value) })}
                            className="w-full rounded-xl px-3 py-2 text-sm"
                            style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                            Max
                          </label>
                          <input
                            type="number"
                            value={selectedField.attrs.maxValue ?? 10}
                            {...settingsInputHandlers}
                            onChange={(event) => updateSelectedField({ maxValue: Number(event.target.value) })}
                            className="w-full rounded-xl px-3 py-2 text-sm"
                            style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                            Min label
                          </label>
                          <input
                            value={selectedField.attrs.minLabel ?? ''}
                            {...settingsInputHandlers}
                            onChange={(event) => updateSelectedField({ minLabel: event.target.value })}
                            className="w-full rounded-xl px-3 py-2 text-sm"
                            style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                            Max label
                          </label>
                          <input
                            value={selectedField.attrs.maxLabel ?? ''}
                            {...settingsInputHandlers}
                            onChange={(event) => updateSelectedField({ maxLabel: event.target.value })}
                            className="w-full rounded-xl px-3 py-2 text-sm"
                            style={{ border: '1px solid var(--input)', backgroundColor: 'white' }}
                          />
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={removeSelectedField}
                      className="w-full rounded-xl px-3 py-2 text-sm font-medium"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--destructive) 8%, transparent)',
                        color: 'var(--destructive)',
                        border: '1px solid color-mix(in srgb, var(--destructive) 20%, transparent)',
                      }}
                    >
                      Remove field
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
        </div>
      </div>
    </div>
  );
}
