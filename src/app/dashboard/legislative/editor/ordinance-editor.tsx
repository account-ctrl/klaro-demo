
'use client'

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextAlign } from '@tiptap/extension-text-align'
import { Button } from "@/components/ui/button"
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, 
  Table as TableIcon, Undo, Redo 
} from 'lucide-react'
import { Toggle } from "@/components/ui/toggle"
import { useEffect } from 'react'

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="border-b p-2 flex flex-wrap gap-1 sticky top-0 bg-background z-10">
      <Toggle 
        size="sm" 
        pressed={editor.isActive('bold')} 
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle 
        size="sm" 
        pressed={editor.isActive('italic')} 
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle 
        size="sm" 
        pressed={editor.isActive('strike')} 
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      
      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Toggle 
        size="sm" 
        pressed={editor.isActive('heading', { level: 1 })} 
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle 
        size="sm" 
        pressed={editor.isActive('heading', { level: 2 })} 
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle 
        size="sm" 
        pressed={editor.isActive('heading', { level: 3 })} 
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Toggle 
        size="sm" 
        pressed={editor.isActive('bulletList')} 
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle 
        size="sm" 
        pressed={editor.isActive('orderedList')} 
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Toggle 
        size="sm" 
        pressed={editor.isActive({ textAlign: 'left' })} 
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle 
        size="sm" 
        pressed={editor.isActive({ textAlign: 'center' })} 
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle 
        size="sm" 
        pressed={editor.isActive({ textAlign: 'right' })} 
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().undo().run()}>
        <Undo className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => editor.chain().focus().redo().run()}>
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function OrdinanceEditor({ content, onChange, onEditorReady }: { content?: string, onChange?: (html: string) => void, onEditorReady?: (editor: Editor) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content, // Initial content only
    onUpdate: ({ editor }) => {
        // Only trigger onChange if content actually changed to avoid loops if needed, 
        // though Tiptap usually handles this well.
        onChange?.(editor.getHTML())
    },
    immediatelyRender: false,
    editorProps: {
        attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-8 bg-white dark:bg-zinc-950 shadow-sm border rounded-b-md my-4',
        },
    },
  })

  // Sync content prop to editor state (Fix for external updates)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      // Only update if significantly different to avoid cursor jumping and loops
      if (currentContent !== content) {
         // Optionally check for semantic difference, but direct comparison works for simple cases
         editor.commands.setContent(content);
      }
    }
  }, [content, editor])

  // Expose editor instance to parent
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor)
    }
  }, [editor, onEditorReady])

  return (
    <div className="border rounded-md shadow-sm bg-background flex flex-col h-full">
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto bg-muted/10 p-4">
         <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  )
}
