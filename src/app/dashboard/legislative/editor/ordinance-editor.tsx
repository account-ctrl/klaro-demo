
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { Button } from "@/components/ui/button"
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, 
  Table as TableIcon, Undo, Redo 
} from 'lucide-react'
import { Toggle } from "@/components/ui/toggle"

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

export default function OrdinanceEditor({ content, onChange }: { content?: string, onChange?: (html: string) => void }) {
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
    content: content || `
      <h1>Republic of the Philippines</h1>
      <h2>Barangay San Isidro</h2>
      <h3>OFFICE OF THE SANGGUNIANG BARANGAY</h3>
      <hr>
      <p><strong>ORDINANCE NO. ____ SERIES OF 20__</strong></p>
      <p><strong>AN ORDINANCE [TITLE HERE]</strong></p>
      <p><strong>WHEREAS</strong>, [Reason 1];</p>
      <p><strong>WHEREAS</strong>, [Reason 2];</p>
      <p><strong>NOW THEREFORE</strong>, be it ordained by the Sangguniang Barangay of San Isidro that:</p>
      <p><strong>SECTION 1. TITLE.</strong> This ordinance shall be known as...</p>
      <p><strong>SECTION 2. SCOPE.</strong> ...</p>
      <p><strong>SECTION 3. PENALTY CLAUSE.</strong> ...</p>
      <p><strong>SECTION 4. EFFECTIVITY.</strong> This ordinance shall take effect immediately upon approval.</p>
    `,
    onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
    },
    editorProps: {
        attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4 bg-white dark:bg-zinc-950 shadow-sm border rounded-b-md',
        },
    },
  })

  return (
    <div className="border rounded-md shadow-sm bg-background flex flex-col h-full">
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto bg-muted/10">
         <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  )
}
