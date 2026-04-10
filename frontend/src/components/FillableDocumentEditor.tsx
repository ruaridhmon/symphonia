import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Node, mergeAttributes, type Editor } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { Bold, ChevronDown, Heading1, Heading2, Highlighter, Italic, List, ListOrdered, PaintBucket, Underline as UnderlineIcon } from 'lucide-react';
import type { StructuredResponse } from '../types/structured-input';
import type { DocumentTemplateField } from '../utils/documentTemplate';
import { createDocumentTemplatePlaceholder, createRichFillableDocumentTemplate } from '../utils/documentTemplate';
import DocumentTemplateResponse from './DocumentTemplateResponse';

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

const COLOR_SWATCHES = ['#172033', '#1d4ed8', '#0f766e', '#b45309', '#be123c', '#6d28d9'];

const FIELD_NODE_NAME = 'fillableField';

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
      fieldType: { default: 'short' },
      inputType: { default: 'text' },
      optional: { default: false },
      rows: { default: 4 },
      placeholder: { default: 'Enter response' },
      options: { default: '[]' },
      minValue: { default: null },
      maxValue: { default: null },
      minLabel: { default: null },
      midLabel: { default: null },
      maxLabel: { default: null },
      allowUnsure: { default: false },
    };
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
        'data-symphonia-field-type': HTMLAttributes.fieldType,
        'data-symphonia-input-type': HTMLAttributes.inputType,
        'data-symphonia-optional': HTMLAttributes.optional ? 'true' : 'false',
        'data-symphonia-rows': String(HTMLAttributes.rows ?? 4),
        'data-symphonia-placeholder': HTMLAttributes.placeholder,
        'data-symphonia-options': HTMLAttributes.options,
        'data-symphonia-min-value': HTMLAttributes.minValue,
        'data-symphonia-max-value': HTMLAttributes.maxValue,
        'data-symphonia-min-label': HTMLAttributes.minLabel,
        'data-symphonia-mid-label': HTMLAttributes.midLabel,
        'data-symphonia-max-label': HTMLAttributes.maxLabel,
        'data-symphonia-allow-unsure': HTMLAttributes.allowUnsure ? 'true' : 'false',
        class: 'symphonia-fillable-chip',
        contenteditable: 'false',
      }),
      `${HTMLAttributes.label}${HTMLAttributes.optional ? ' · optional' : ''}`,
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

export default function FillableDocumentEditor({
  value,
  onChange,
  previewAnswers,
  onPreviewChange,
}: FillableDocumentEditorProps) {
  const lastSyncedValueRef = useRef(value);
  const [slashMenu, setSlashMenu] = useState<{ start: number; end: number; query: string; labelHint: string } | null>(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'author' | 'participant'>('author');
  const filteredCommands = COMMAND_OPTIONS.filter((option) =>
    !slashMenu?.query || option.label.toLowerCase().includes(slashMenu.query) || option.description.toLowerCase().includes(slashMenu.query),
  );

  function buildInsertedField(option: CommandOption) {
    const labelHint = slashMenu?.labelHint?.trim();
    const label = labelHint || option.field.label;
    return fieldFromType(option.field.fieldType, label, option.field.optional);
  }

  const editor = useEditor({
    editable: viewMode === 'author',
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Underline,
      Placeholder.configure({ placeholder: 'Write the document here, then type / to insert fillable fields…' }),
      FillableFieldNode,
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      const nextHtml = currentEditor.getHTML();
      lastSyncedValueRef.current = nextHtml;
      onChange(createRichFillableDocumentTemplate(nextHtml));
      const nextSlash = getSlashMenuState(currentEditor);
      setSlashMenu(nextSlash);
      setSelectedCommandIndex(0);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const nextSlash = getSlashMenuState(currentEditor);
      setSlashMenu(nextSlash);
      if (!nextSlash) setSelectedCommandIndex(0);
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
    editor.setEditable(viewMode === 'author');
  }, [editor, viewMode]);

  useEffect(() => {
    if (!editor) return;
    const content = value.trimStart().startsWith('<!-- symphonia-document-mode:')
      ? value.replace(/^<!--\s*symphonia-document-mode:\s*fillable-rich\s*-->\s*/i, '')
      : value;
    if (content === lastSyncedValueRef.current) return;
    if (editor.getHTML() === content) {
      lastSyncedValueRef.current = content;
      return;
    }
    editor.commands.setContent(content || '<p></p>', false);
    lastSyncedValueRef.current = content;
  }, [editor, value]);

  function setTextColor(color: string) {
    editor?.chain().focus().setMark('textStyle', { style: `color: ${color}` }).run();
  }

  return (
    <div
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
        .symphonia-fillable-editor .symphonia-fillable-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.32rem 0.72rem;
          margin: 0 0.15rem;
          border-radius: 999px;
          border: 1px solid rgba(45, 99, 182, 0.18);
          background: rgba(45, 99, 182, 0.08);
          color: #1f4ea3;
          font-size: 0.82rem;
          font-weight: 600;
          white-space: nowrap;
        }
      `}</style>

      <div
        className="flex flex-col gap-3 border-b px-4 py-4"
        style={{ borderColor: 'color-mix(in srgb, var(--border) 75%, transparent)' }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex overflow-hidden rounded-xl" style={{ border: '1px solid var(--border)' }}>
            {[
              { id: 'author', label: 'Authoring view' },
              { id: 'participant', label: 'Participant preview' },
            ].map((option) => {
              const active = viewMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setViewMode(option.id as 'author' | 'participant')}
                  className="px-3 py-2 text-sm font-medium"
                  style={{
                    border: 'none',
                    borderRight: option.id === 'author' ? '1px solid var(--border)' : 'none',
                    backgroundColor: active ? '#fff' : 'transparent',
                    color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
            >
              Type `/` for field commands
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <RichToolbarButton label="Bold" active={Boolean(editor?.isActive('bold'))} onClick={() => editor?.chain().focus().toggleBold().run()} icon={<Bold size={14} />} />
          <RichToolbarButton label="Italic" active={Boolean(editor?.isActive('italic'))} onClick={() => editor?.chain().focus().toggleItalic().run()} icon={<Italic size={14} />} />
          <RichToolbarButton label="Underline" active={Boolean(editor?.isActive('underline'))} onClick={() => editor?.chain().focus().toggleUnderline().run()} icon={<UnderlineIcon size={14} />} />
          <RichToolbarButton label="Heading 1" active={Boolean(editor?.isActive('heading', { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} icon={<Heading1 size={14} />} />
          <RichToolbarButton label="Heading 2" active={Boolean(editor?.isActive('heading', { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} icon={<Heading2 size={14} />} />
          <RichToolbarButton label="Bullets" active={Boolean(editor?.isActive('bulletList'))} onClick={() => editor?.chain().focus().toggleBulletList().run()} icon={<List size={14} />} />
          <RichToolbarButton label="Numbered" active={Boolean(editor?.isActive('orderedList'))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} icon={<ListOrdered size={14} />} />
          <RichToolbarButton label="Highlight" active={Boolean(editor?.isActive('highlight'))} onClick={() => editor?.chain().focus().toggleHighlight({ color: '#fff3a3' }).run()} icon={<Highlighter size={14} />} />
          <div className="ml-1 flex items-center gap-1 rounded-xl px-2 py-1" style={{ border: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.55)' }}>
            <PaintBucket size={14} style={{ color: 'var(--muted-foreground)' }} />
            {COLOR_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setTextColor(color)}
                aria-label={`Set text color ${color}`}
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: color, border: '1px solid rgba(15,23,42,0.14)' }}
              />
            ))}
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
        {viewMode === 'author' ? (
          <div
            data-testid="document-template-rich-editor"
            className="mx-auto max-w-[900px] rounded-[1.4rem] border bg-white px-8 py-10 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]"
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
          </div>
        ) : (
          <div className="mx-auto max-w-[900px]">
            <DocumentTemplateResponse
              template={createRichFillableDocumentTemplate(editor?.getHTML() || '')}
              answers={previewAnswers}
              onChange={onPreviewChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
