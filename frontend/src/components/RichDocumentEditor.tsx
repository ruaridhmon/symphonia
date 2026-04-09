import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered } from 'lucide-react';

interface RichDocumentEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
}

export default function RichDocumentEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Write here…',
  minHeight = '18rem',
}: RichDocumentEditorProps) {
  const editor = useEditor({
    editable: !readOnly,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'symphonia-rich-editor focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        border: '1px solid var(--input)',
        backgroundColor: 'var(--background)',
      }}
    >
      <style>{`
        .symphonia-rich-editor > *:first-child {
          margin-top: 0;
        }
        .symphonia-rich-editor h1,
        .symphonia-rich-editor h2,
        .symphonia-rich-editor h3 {
          line-height: 1.2;
          color: #10223e;
        }
        .symphonia-rich-editor p,
        .symphonia-rich-editor li {
          line-height: 1.7;
        }
        .symphonia-rich-editor table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          table-layout: fixed;
        }
        .symphonia-rich-editor th,
        .symphonia-rich-editor td {
          border: 1px solid #d5deea;
          padding: 0.65rem 0.75rem;
          vertical-align: top;
        }
        .symphonia-rich-editor th {
          background: #eef4fb;
          font-weight: 600;
        }
        .symphonia-rich-editor ul,
        .symphonia-rich-editor ol {
          padding-left: 1.25rem;
        }
        .symphonia-rich-editor blockquote {
          border-left: 3px solid #9db5d1;
          margin: 1rem 0;
          padding-left: 1rem;
          color: #42526b;
        }
      `}</style>
      {!readOnly ? (
        <div
          className="flex flex-wrap items-center gap-2 border-b px-3 py-2"
          style={{ borderColor: 'var(--border)', backgroundColor: 'color-mix(in srgb, var(--foreground) 2%, var(--card))' }}
        >
          {[
            {
              label: 'Bold',
              icon: <Bold size={14} />,
              active: Boolean(editor?.isActive('bold')),
              onClick: () => editor?.chain().focus().toggleBold().run(),
            },
            {
              label: 'Italic',
              icon: <Italic size={14} />,
              active: Boolean(editor?.isActive('italic')),
              onClick: () => editor?.chain().focus().toggleItalic().run(),
            },
            {
              label: 'Underline',
              icon: <UnderlineIcon size={14} />,
              active: Boolean(editor?.isActive('underline')),
              onClick: () => editor?.chain().focus().toggleUnderline().run(),
            },
            {
              label: 'Bullets',
              icon: <List size={14} />,
              active: Boolean(editor?.isActive('bulletList')),
              onClick: () => editor?.chain().focus().toggleBulletList().run(),
            },
            {
              label: 'Numbered list',
              icon: <ListOrdered size={14} />,
              active: Boolean(editor?.isActive('orderedList')),
              onClick: () => editor?.chain().focus().toggleOrderedList().run(),
            },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md"
              aria-label={action.label}
              title={action.label}
              style={{
                border: action.active ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1px solid var(--border)',
                backgroundColor: action.active ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
                color: action.active ? 'var(--accent)' : 'var(--muted-foreground)',
              }}
            >
              {action.icon}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="prose prose-sm max-w-none px-4 py-4"
        style={{
          color: 'var(--foreground)',
          backgroundColor: 'color-mix(in srgb, #ffffff 96%, var(--background))',
          minHeight: `calc(${minHeight} + 2rem)`,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          className="w-full max-w-[860px] rounded-lg px-6 py-7 sm:px-10 sm:py-9"
          style={{
            minHeight,
            backgroundColor: '#fff',
            color: '#172033',
            boxShadow: '0 12px 40px color-mix(in srgb, var(--foreground) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--border) 75%, transparent)',
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
