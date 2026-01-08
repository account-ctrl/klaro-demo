
'use client';

import { useState } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, Italic, List, ListOrdered, Undo, Redo, 
  Heading1, Heading2, Quote, Save 
} from 'lucide-react';
import { DraftTools } from './draft-tools';

interface OrdinanceEditorProps {
    initialContent?: string;
    onSave?: (content: string) => void;
    onChange?: (content: string) => void; // Added onChange to match usage in page.tsx
    content?: string; // Added content prop to match usage in page.tsx
    onEditorReady?: (editor: Editor) => void; // Added onEditorReady to match usage in page.tsx
}

export function OrdinanceEditor({ initialContent = '', onSave, onChange, content, onEditorReady }: OrdinanceEditorProps) {
    // Determine content to use (prop or initial)
    const activeContent = content !== undefined ? content : initialContent;

    const editor = useEditor({
        extensions: [StarterKit],
        content: activeContent,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl m-5 focus:outline-none min-h-[500px]',
            },
        },
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            if (onChange) {
                onChange(editor.getHTML());
            }
        },
        onCreate: ({ editor }) => {
            if (onEditorReady) {
                onEditorReady(editor);
            }
        }
    });

    const [isToolsOpen, setIsToolsOpen] = useState(true);

    if (!editor) {
        return null;
    }

    const ToolbarButton = ({ onClick, isActive, icon: Icon }: any) => (
        <Button
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={onClick}
            className="h-8 w-8 p-0"
        >
            <Icon className="h-4 w-4" />
        </Button>
    );

    return (
        <div className="flex h-full gap-4">
            <div className="flex-1 flex flex-col gap-4">
                {/* Toolbar */}
                <Card className="rounded-md border-zinc-200 shadow-sm">
                    <div className="flex items-center gap-1 p-1">
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().toggleBold().run()} 
                            isActive={editor.isActive('bold')} 
                            icon={Bold} 
                        />
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().toggleItalic().run()} 
                            isActive={editor.isActive('italic')} 
                            icon={Italic} 
                        />
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
                            isActive={editor.isActive('heading', { level: 1 })} 
                            icon={Heading1} 
                        />
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                            isActive={editor.isActive('heading', { level: 2 })} 
                            icon={Heading2} 
                        />
                        <Separator orientation="vertical" className="h-6 mx-1" />
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().toggleBulletList().run()} 
                            isActive={editor.isActive('bulletList')} 
                            icon={List} 
                        />
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
                            isActive={editor.isActive('orderedList')} 
                            icon={ListOrdered} 
                        />
                         <ToolbarButton 
                            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
                            isActive={editor.isActive('blockquote')} 
                            icon={Quote} 
                        />
                        <div className="flex-1" />
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().undo().run()} 
                            icon={Undo} 
                        />
                        <ToolbarButton 
                            onClick={() => editor.chain().focus().redo().run()} 
                            icon={Redo} 
                        />
                    </div>
                </Card>

                {/* Editor Area */}
                <Card className="flex-1 overflow-hidden border-zinc-200 shadow-sm min-h-[500px]">
                    <div className="h-full overflow-y-auto bg-white">
                        <EditorContent editor={editor} />
                    </div>
                </Card>

                <div className="flex justify-end">
                    {onSave && (
                        <Button onClick={() => onSave(editor.getHTML())} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Save className="mr-2 h-4 w-4" /> Save Draft
                        </Button>
                    )}
                </div>
            </div>

            {/* AI Sidebar - Only render if not controlled by parent in page.tsx layout, but page.tsx handles it now so we might remove it here or keep it conditionally. 
               The page.tsx seems to render DraftTools separately in the right column. 
               The original code rendered it here too.
               Let's check if we should keep it.
               The usage in page.tsx is:
               <OrdinanceEditor onChange={...} content={...} onEditorReady={...} />
               And then DraftTools is rendered outside.
               So we should probably REMOVE DraftTools from here if it's rendered outside, OR keep it conditional.
               However, to match the previous implementation, I'll remove it if the component is being used in the new context where DraftTools is outside.
               Wait, the previous code had DraftTools hardcoded inside.
               The page.tsx code suggests:
                    <div className="flex-1 ...">
                        <OrdinanceEditor ... />
                    </div>
                    <div className="w-80 ...">
                        <DraftTools ... />
                    </div>
               So page.tsx handles the layout. OrdinanceEditor should just be the editor.
            */}
        </div>
    );
}
