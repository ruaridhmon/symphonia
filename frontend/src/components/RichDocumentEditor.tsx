import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
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
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
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
          minHeight,
          color: 'var(--foreground)',
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
