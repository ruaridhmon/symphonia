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
import { convertQuestionnaireTextToRichTemplate } from '../utils/questionnaireImport';

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

const COLOR_OPTIONS = [
  { value: '#172033', label: 'Ink' },
  { value: '#1d4ed8', label: 'Blue' },
  { value: '#0f766e', label: 'Teal' },
  { value: '#b45309', label: 'Amber' },
  { value: '#be123c', label: 'Rose' },
  { value: '#6d28d9', label: 'Violet' },
] as const;
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl transition-colors"
      style={{
        border: active ? '1px solid color-mix(in srgb, var(--accent) 28%, transparent)' : '1px solid color-mix(in srgb, var(--border) 82%, transparent)',
        backgroundColor: active ? 'color-mix(in srgb, var(--accent) 9%, white)' : 'rgba(255,255,255,0.88)',
        color: active ? 'var(--accent)' : 'var(--muted-foreground)',
        boxShadow: active
          ? '0 14px 28px -22px rgba(37,99,235,0.45)'
          : '0 10px 24px -24px rgba(15,23,42,0.22)',
      }}
    >
      {icon}
    </button>
  );
}

function ToolbarGroup({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl px-2.5 py-2"
      style={{
        border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)',
        background: 'rgba(255,255,255,0.94)',
        boxShadow: '0 12px 28px -28px rgba(15,23,42,0.18)',
      }}
    >
      {children}
    </div>
  );
}

function QuickInsertButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium"
      style={{
        border: '1px solid color-mix(in srgb, var(--border) 80%, transparent)',
        backgroundColor: 'rgba(255,255,255,0.92)',
        color: 'var(--foreground)',
        boxShadow: '0 10px 24px -24px rgba(15,23,42,0.22)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function SegmentedToolbar({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-2xl"
      style={{
        border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)',
        backgroundColor: 'rgba(248,250,252,0.92)',
        boxShadow: '0 10px 24px -24px rgba(15,23,42,0.22)',
      }}
    >
      {children}
    </div>
  );
}

function SegmentedToolbarButton({
  label,
  active,
  onClick,
  icon,
  first = false,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
  first?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center transition-colors"
      style={{
        border: 'none',
        borderLeft: first ? 'none' : '1px solid color-mix(in srgb, var(--border) 76%, transparent)',
        backgroundColor: active ? 'color-mix(in srgb, var(--accent) 10%, white)' : 'transparent',
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
  const workAreaRef = useRef<HTMLDivElement | null>(null);
  const changeTimerRef = useRef<number | null>(null);
  const pendingValueRef = useRef<string | null>(null);
  const lastSyncedValueRef = useRef(value);
  const [slashMenu, setSlashMenu] = useState<{ start: number; end: number; query: string; labelHint: string } | null>(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedField, setSelectedField] = useState<SelectedFieldState | null>(null);
  const [selectedFieldOptionsDraft, setSelectedFieldOptionsDraft] = useState('');
  const [inspectorStyle, setInspectorStyle] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  const filteredCommands = COMMAND_OPTIONS.filter((option) =>
    !slashMenu?.query || option.label.toLowerCase().includes(slashMenu.query) || option.description.toLowerCase().includes(slashMenu.query),
  );
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>(FONT_PRESETS[1].style.fontFamily);
  const [selectedFontSize, setSelectedFontSize] = useState<string>(SIZE_PRESETS[1].fontSize);
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0].value);

  function buildInsertedField(option: CommandOption) {
    const labelHint = slashMenu?.labelHint?.trim();
    const label = labelHint || option.field.label;
    return fieldFromType(option.field.fieldType, label, option.field.optional);
  }

  function applyQuestionnaireConversion(sourceText: string) {
    if (!editor) return false;
    const converted = convertQuestionnaireTextToRichTemplate(sourceText);
    if (converted.questions.length === 0) return false;
    const nextValue = converted.template.replace(/^<!--\s*symphonia-document-mode:\s*fillable-rich\s*-->\s*/i, '');
    clearPendingChange();
    editor.commands.setContent(nextValue || '<p></p>', false);
    lastSyncedValueRef.current = nextValue;
    onChange(createRichFillableDocumentTemplate(nextValue));
    setSlashMenu(null);
    setSelectedCommandIndex(0);
    return true;
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
      handlePaste: (_view, event) => {
        const plainText = event.clipboardData?.getData('text/plain')?.trim();
        if (!plainText || plainText.length < 30) return false;
        if (!/(^|\n)\s*Q\d+[a-z]?\.\s+/i.test(plainText) || !/response type:/i.test(plainText)) return false;
        if (!editor) return false;
        let existingFieldCount = 0;
        editor.state.doc.descendants((node) => {
          if (node.type.name === FIELD_NODE_NAME) existingFieldCount += 1;
        });
        const currentText = editor.getText().trim();
        const shouldReplaceWholeDocument = currentText.length < 160 && existingFieldCount === 0;
        if (!shouldReplaceWholeDocument) {
          return false;
        }
        const didConvert = applyQuestionnaireConversion(plainText);
        if (didConvert) {
          event.preventDefault();
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

  useEffect(() => {
    if (!selectedField) {
      setSelectedFieldOptionsDraft('');
      return;
    }
    try {
      const parsed = JSON.parse(selectedField.attrs.options || '[]');
      setSelectedFieldOptionsDraft(Array.isArray(parsed) ? parsed.join('\n') : '');
    } catch {
      setSelectedFieldOptionsDraft('');
    }
  }, [selectedField]);

  useEffect(() => {
    function updateInspectorPosition() {
      if (!selectedField || !editor || !workAreaRef.current) {
        setInspectorStyle(null);
        return;
      }

      const areaRect = workAreaRef.current.getBoundingClientRect();
      const coords = editor.view.coordsAtPos(selectedField.pos);
      const gutter = 18;
      const inspectorWidth = Math.min(352, Math.max(280, areaRect.width - 32));
      const preferredRight = coords.right - areaRect.left + gutter;
      const preferredLeft = coords.left - areaRect.left - inspectorWidth - gutter;
      let left = preferredRight;

      if (left + inspectorWidth > areaRect.width - 16) {
        left = preferredLeft;
      }
      if (left < 16) {
        left = Math.max(16, areaRect.width - inspectorWidth - 16);
      }

      let top = coords.top - areaRect.top - 18;
      const maxHeight = Math.max(320, areaRect.height - 32);
      top = Math.max(16, Math.min(top, areaRect.height - Math.min(maxHeight, 520) - 16));

      setInspectorStyle({
        top,
        left,
        maxHeight: Math.max(280, areaRect.height - top - 16),
      });
    }

    updateInspectorPosition();
    if (!selectedField) return;

    window.addEventListener('resize', updateInspectorPosition);
    window.addEventListener('scroll', updateInspectorPosition, true);
    return () => {
      window.removeEventListener('resize', updateInspectorPosition);
      window.removeEventListener('scroll', updateInspectorPosition, true);
    };
  }, [editor, selectedField]);

  function setTextColor(color: string) {
    if (!editor) return;
    setSelectedColor(color);
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

  function updateSelectedFieldOptionsDraft(nextDraft: string) {
    setSelectedFieldOptionsDraft(nextDraft);
    updateSelectedField({
      options: JSON.stringify(
        nextDraft
          .split('\n')
          .map((item) => item.replace(/\r/g, ''))
          .filter((item) => item.trim().length > 0)
          .map((item) => item.trim()),
      ),
    });
  }

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
      className="overflow-visible rounded-[1.7rem]"
      style={{
        border: '1px solid color-mix(in srgb, #d7e0ea 92%, transparent)',
        background:
          'linear-gradient(180deg, #f7f5f1 0%, #edf3f7 42%, #eef4f8 100%)',
        boxShadow: '0 30px 70px -52px rgba(15,23,42,0.28)',
      }}
    >
      <style>{`
        .symphonia-fillable-editor > *:first-child { margin-top: 0; }
        .symphonia-fillable-editor .ProseMirror { min-height: 32rem; }
        .symphonia-fillable-editor h1 { font-size: 2rem; line-height: 1.08; margin: 0 0 0.95rem; color: #102038; font-weight: 700; letter-spacing: -0.03em; }
        .symphonia-fillable-editor h2 { font-size: 1.28rem; line-height: 1.2; margin: 1.35rem 0 0.72rem; color: #1d3552; font-weight: 650; letter-spacing: -0.02em; }
        .symphonia-fillable-editor h3 { font-size: 1.05rem; line-height: 1.28; margin: 1rem 0 0.55rem; color: #27415f; font-weight: 650; }
        .symphonia-fillable-editor p, .symphonia-fillable-editor li { line-height: 1.85; color: #1a2433; font-size: 1rem; }
        .symphonia-fillable-editor ul, .symphonia-fillable-editor ol { padding-left: 1.4rem; }
        .symphonia-fillable-editor blockquote {
          margin: 1rem 0;
          padding: 0.9rem 1.1rem;
          border-left: 3px solid rgba(28, 99, 171, 0.28);
          background: linear-gradient(180deg, rgba(240,246,251,0.92) 0%, rgba(247,250,252,0.92) 100%);
          color: #35516e;
          border-radius: 1rem;
        }
        .symphonia-fillable-editor hr {
          border: none;
          border-top: 1px solid rgba(193, 205, 217, 0.72);
          margin: 1.3rem 0;
        }
        .symphonia-fillable-editor [style*="text-align: center"] { text-align: center; }
        .symphonia-fillable-editor [style*="text-align: right"] { text-align: right; }
        .symphonia-fillable-editor [style*="text-align: justify"] { text-align: justify; }
        .symphonia-fillable-editor .symphonia-fillable-node { margin: 0.18rem 0.28rem; vertical-align: middle; }
        .symphonia-fillable-editor .ProseMirror-selectednode .symphonia-fillable-node > span > span {
          border-color: color-mix(in srgb, var(--accent) 45%, transparent) !important;
          box-shadow: 0 18px 34px -24px rgba(37,99,235,0.45) !important;
        }
      `}</style>

      <div
        className="flex flex-col gap-4 border-b px-5 py-5"
        style={{ borderColor: 'color-mix(in srgb, #d6e0ea 88%, transparent)' }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ backgroundColor: 'rgba(255,255,255,0.8)', color: '#5a6b80' }}
            >
              Fillable document studio
            </div>
            <div className="mt-3 text-lg font-semibold text-foreground">Document canvas</div>
            <p className="mt-1.5 max-w-2xl text-sm" style={{ color: '#617489', lineHeight: 1.7 }}>
              Compose the final participant-facing document here. Type normally for content, use <code>/</code> for fields, and configure only the selected field in the side inspector.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.82)', border: '1px solid rgba(193,205,217,0.78)', color: '#5c6f84' }}
            >
              One editing surface, one live document view
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarGroup>
            <div className="mr-1 flex items-center gap-2 rounded-2xl px-2 py-1.5" style={{ border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)', backgroundColor: 'rgba(248,250,252,0.92)' }}>
              <Type size={14} style={{ color: 'var(--muted-foreground)' }} />
              <select
                aria-label="Font family"
                value={selectedFontFamily}
                onChange={(event) => setFontFamily(event.target.value)}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium"
                style={{ border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                {FONT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.style.fontFamily} style={{ fontFamily: preset.style.fontFamily }}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mr-1 flex items-center gap-2 rounded-2xl px-2 py-1.5" style={{ border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)', backgroundColor: 'rgba(248,250,252,0.92)' }}>
              <span className="text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>Size</span>
              <select
                aria-label="Font size"
                value={selectedFontSize}
                onChange={(event) => setFontSize(event.target.value)}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium"
                style={{ border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                {SIZE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.fontSize}>
                    {preset.label}px
                  </option>
                ))}
              </select>
            </div>
            <div className="mr-1 flex items-center gap-2 rounded-2xl px-2 py-1.5" style={{ border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)', backgroundColor: 'rgba(248,250,252,0.92)' }}>
              <PaintBucket size={14} style={{ color: selectedColor }} />
              <select
                aria-label="Text color"
                value={selectedColor}
                onChange={(event) => setTextColor(event.target.value)}
                className="rounded-xl px-2.5 py-1.5 text-xs font-medium"
                style={{ border: '1px solid color-mix(in srgb, var(--border) 76%, transparent)', backgroundColor: 'white', color: 'var(--foreground)' }}
              >
                {COLOR_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <RichToolbarButton label="Bold" active={Boolean(editor?.isActive('bold'))} onClick={() => editor?.chain().focus().toggleBold().run()} icon={<Bold size={14} />} />
            <RichToolbarButton label="Italic" active={Boolean(editor?.isActive('italic'))} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={<Italic size={14} />} />
            <RichToolbarButton label="Underline" active={Boolean(editor?.isActive('underline'))} onClick={() => editor?.chain().focus().toggleUnderline().run()} icon={<UnderlineIcon size={14} />} />
            <RichToolbarButton label="Heading 1" active={Boolean(editor?.isActive('heading', { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={14} />} />
            <RichToolbarButton label="Heading 2" active={Boolean(editor?.isActive('heading', { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={14} />} />
          </ToolbarGroup>

          <ToolbarGroup>
            <RichToolbarButton label="Bullets" active={Boolean(editor?.isActive('bulletList'))} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={<List size={14} />} />
            <RichToolbarButton label="Numbered" active={Boolean(editor?.isActive('orderedList'))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} icon={<ListOrdered size={14} />} />
            <SegmentedToolbar>
              <SegmentedToolbarButton label="Align left" active={isAligned('left')} onClick={() => setBlockTextAlign('left')} icon={<AlignLeft size={14} />} first />
              <SegmentedToolbarButton label="Align center" active={isAligned('center')} onClick={() => setBlockTextAlign('center')} icon={<AlignCenter size={14} />} />
              <SegmentedToolbarButton label="Align right" active={isAligned('right')} onClick={() => setBlockTextAlign('right')} icon={<AlignRight size={14} />} />
              <SegmentedToolbarButton label="Justify" active={isAligned('justify')} onClick={() => setBlockTextAlign('justify')} icon={<AlignJustify size={14} />} />
            </SegmentedToolbar>
            <RichToolbarButton label="Highlight" active={Boolean(editor?.isActive('highlight'))} onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fff3a3' }).run()} icon={<Highlighter size={14} />} />
          </ToolbarGroup>

          <ToolbarGroup>
            <QuickInsertButton label="Section" icon={<Heading1 size={13} />} onClick={() => insertSectionHeading(1, 'New section')} />
            <QuickInsertButton label="Subsection" icon={<Pilcrow size={13} />} onClick={() => insertSectionHeading(2, 'Subsection')} />
            <QuickInsertButton label="Guidance" icon={<Type size={13} />} onClick={insertGuidanceBlock} />
            <QuickInsertButton label="Divider" icon={<SeparatorHorizontal size={13} />} onClick={insertDivider} />
          </ToolbarGroup>
        </div>
      </div>

      <div
        className="px-4 py-6"
        style={{
          background:
            'radial-gradient(circle at top, rgba(188,205,219,0.32), transparent 34%), linear-gradient(180deg, #edf3f6 0%, #eef2f5 100%)',
        }}
      >
        <div ref={workAreaRef} className="mx-auto max-w-[1440px]">
            <div className="rounded-[2rem] border px-4 py-4" style={{ borderColor: 'rgba(196,206,216,0.7)', background: 'linear-gradient(180deg, rgba(255,255,255,0.46) 0%, rgba(241,245,248,0.55) 100%)' }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#6c7c8e' }}>Live document view</div>
                  <div className="mt-1 text-sm font-medium text-foreground">This is the surface participants will experience.</div>
                </div>
                <div className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.88)', border: '1px solid rgba(193,205,217,0.82)', color: '#5d7085' }}>
                  Type <code className="mx-1">/</code> for fields
                </div>
              </div>

              <div
                data-testid="document-template-rich-editor"
                className="relative overflow-visible rounded-[1.8rem] border bg-white px-10 py-12 shadow-[0_30px_70px_-42px_rgba(15,23,42,0.4)]"
                style={{ borderColor: 'rgba(168, 182, 196, 0.24)' }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-[1.8rem]" style={{ background: 'linear-gradient(180deg, rgba(244,247,249,0.92) 0%, rgba(255,255,255,0) 100%)' }} />
                <div className="pointer-events-none absolute left-10 top-5 right-10 flex items-center justify-between text-[11px] uppercase tracking-[0.16em]" style={{ color: '#7a8797' }}>
                  <span>Participant document</span>
                  <span>Editable fill fields</span>
                </div>
                <div className="relative">
                  <EditorContent editor={editor} />
                </div>
              {slashMenu && filteredCommands.length > 0 ? (
                <div
                  className="absolute left-8 top-14 z-40 w-[min(34rem,calc(100%-4rem))] rounded-[1.45rem] p-2"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
                    border: '1px solid rgba(186,198,210,0.42)',
                    boxShadow: '0 30px 70px -36px rgba(15,23,42,0.38)',
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
                      className="flex w-full items-center justify-between rounded-[1rem] px-3.5 py-3 text-left"
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
            </div>
          </div>
            {selectedField && inspectorStyle ? (
              <div
                aria-label="Field settings inspector"
                className="absolute z-30 w-[min(22rem,calc(100%-2rem))] rounded-[1.45rem] border p-4"
                style={{
                  top: inspectorStyle.top,
                  left: inspectorStyle.left,
                  maxHeight: inspectorStyle.maxHeight,
                  borderColor: 'rgba(176, 190, 202, 0.4)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(246,248,250,0.97) 100%)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 28px 65px -42px rgba(15,23,42,0.28)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Field settings</div>
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                      Adjust the selected field from the side so the document stays fully visible.
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

                <div
                  className="mt-3 rounded-[1.2rem] border px-3.5 py-3.5"
                  style={{
                    borderColor: 'rgba(196,206,216,0.7)',
                    background: 'linear-gradient(180deg, rgba(245,248,250,0.92) 0%, rgba(255,255,255,0.95) 100%)',
                  }}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted-foreground)' }}>
                    Selected field
                  </div>
                  <div className="mt-2 text-sm font-semibold text-foreground">{selectedField.attrs.label || 'Untitled field'}</div>
                  <div className="mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)' }}>
                    {String(selectedField.attrs.fieldType).replace('_', ' ')}
                  </div>
                </div>

                <div className="mt-4 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: inspectorStyle.maxHeight - 110 }}>
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
                          aria-label="Field options"
                          value={selectedFieldOptionsDraft}
                          {...settingsInputHandlers}
                          onChange={(event) => updateSelectedFieldOptionsDraft(event.target.value)}
                          rows={6}
                          className="w-full rounded-xl px-3 py-2 text-sm"
                          style={{ border: '1px solid var(--input)', backgroundColor: 'white', resize: 'vertical' }}
                        />
                        <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                          Put one option on each line. Spaces inside an option are preserved.
                        </p>
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
                      className="w-full rounded-[1rem] px-3 py-2.5 text-sm font-medium"
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
  );
}
