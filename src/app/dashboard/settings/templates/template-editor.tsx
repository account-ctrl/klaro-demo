
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Type, Image as ImageIcon, PenTool, LayoutTemplate, 
    Move, X, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Trash2, AlertTriangle 
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- Types ---

type ElementType = 'text' | 'image' | 'signature' | 'placeholder';

interface EditorElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    content: string; // Text content or Image URL
    style?: React.CSSProperties;
    placeholder?: string; // For dynamic fields
}

interface TemplateEditorProps {
    initialContent?: string; // HTML string to parse
    onChange?: (html: string) => void; // Live update
}

// --- Constants ---

const PAGE_WIDTH = 794; // A4 width in px at 96 DPI (approx)
const PAGE_HEIGHT = 1123; // A4 height in px

const PLACEHOLDERS = [
    { label: 'Resident First Name', value: '{{ resident.firstName }}' },
    { label: 'Resident Last Name', value: '{{ resident.lastName }}' },
    { label: 'Resident Full Name', value: '{{ resident.firstName }} {{ resident.lastName }}' },
    { label: 'Resident Address', value: '{{ resident.address }}' },
    { label: 'Purpose', value: '{{ request.purpose }}' },
    { label: 'Date Issued', value: "{{ 'now' | date: 'long' }}" },
    { label: 'Barangay Name', value: '{{ barangay.name }}' },
    { label: 'Captain Name', value: '{{ captain.name }}' },
];

export function TemplateEditor({ initialContent, onChange }: TemplateEditorProps) {
    const [elements, setElements] = useState<EditorElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, initialX: number, initialY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    
    // Stability Refs
    const isLoaded = useRef(false);
    const isDirty = useRef(false); // Track if user has modified the canvas
    const lastGeneratedHtml = useRef('');
    
    const [hasParseError, setHasParseError] = useState(false);

    // 1. Initial Load / Parse
    useEffect(() => {
        // Only run once on mount or if initialContent changes drastically (e.g. reset) and we haven't loaded yet
        if (initialContent && !isLoaded.current) {
            
            // Heuristic: Does it look like our generated HTML?
            if (initialContent.includes('data-editor-element')) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(initialContent, 'text/html');
                    const loadedElements: EditorElement[] = [];
                    
                    doc.querySelectorAll('[data-editor-element]').forEach((el) => {
                        if (el instanceof HTMLElement) {
                            // Extract styles safely
                            const x = parseInt(el.style.left || '0', 10);
                            const y = parseInt(el.style.top || '0', 10);
                            const width = parseInt(el.style.width || '200', 10);
                            const height = parseInt(el.style.height || '50', 10);

                            loadedElements.push({
                                id: el.getAttribute('id') || Math.random().toString(36).substr(2, 9),
                                type: (el.getAttribute('data-type') as ElementType) || 'text',
                                x: isNaN(x) ? 50 : x,
                                y: isNaN(y) ? 50 : y,
                                width: isNaN(width) ? 200 : width,
                                height: isNaN(height) ? 50 : height,
                                content: el.tagName === 'IMG' ? (el as HTMLImageElement).src : el.innerText,
                                style: {
                                    textAlign: el.style.textAlign as any,
                                    fontWeight: el.style.fontWeight,
                                    fontStyle: el.style.fontStyle,
                                    fontSize: el.style.fontSize,
                                    color: el.style.color
                                }
                            });
                        }
                    });
                    
                    if (loadedElements.length > 0) {
                        setElements(loadedElements);
                        // Do NOT set isDirty here, as we just loaded what's there
                    }
                } catch (e) {
                    console.error("Failed to parse visual template", e);
                    setHasParseError(true);
                }
            } else if (initialContent.trim().length > 0) {
                // Content exists but isn't in visual format.
                setHasParseError(true); // Treat as "Cannot edit visually without overwriting"
            }
            
            isLoaded.current = true;
        }
    }, [initialContent]);

    // 2. Generate HTML on Change (Only if dirty)
    useEffect(() => {
        if (isDirty.current && elements.length > 0 && onChange) {
            const htmlBody = elements.map(el => {
                const commonStyle = `position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;`;
                
                if (el.type === 'image') {
                    return `<img id="${el.id}" data-editor-element="true" data-type="image" src="${el.content}" style="${commonStyle} object-fit: contain;" />`;
                }
                
                // Text based
                const textStyle = `font-family: sans-serif; font-size: ${el.style?.fontSize || '14px'}; text-align: ${el.style?.textAlign || 'left'}; font-weight: ${el.style?.fontWeight || 'normal'}; font-style: ${el.style?.fontStyle || 'normal'}; color: ${el.style?.color || 'black'};`;
                
                // Use innerText-like content, preserving newlines if possible
                return `<div id="${el.id}" data-editor-element="true" data-type="${el.type}" style="${commonStyle} ${textStyle}">
                    ${el.content}
                </div>`;
            }).join('\n');

            const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { margin: 0; padding: 0; background: white; width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px; position: relative; }
        @media print {
            body { -webkit-print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    ${htmlBody}
</body>
</html>`;
            
            // Prevent redundant updates
            if (fullHtml !== lastGeneratedHtml.current) {
                lastGeneratedHtml.current = fullHtml;
                onChange(fullHtml);
            }
        }
    }, [elements, onChange]);

    // --- Actions (Mark Dirty) ---

    const markDirty = () => {
        isDirty.current = true;
        if (hasParseError) setHasParseError(false); // Clear error once user takes action (overwriting)
    };

    const addElement = (type: ElementType, content: string = 'New Text', x: number = 50, y: number = 50) => {
        markDirty();
        const newElement: EditorElement = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x,
            y,
            width: type === 'image' ? 100 : 300,
            height: type === 'image' ? 100 : 40,
            content,
            style: {
                textAlign: 'left',
                fontSize: '14px',
                color: '#000000'
            }
        };
        setElements(prev => [...prev, newElement]);
        setSelectedId(newElement.id);
    };

    const updateElement = (id: string, updates: Partial<EditorElement>) => {
        markDirty();
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const updateStyle = (id: string, styleUpdates: React.CSSProperties) => {
        markDirty();
        setElements(prev => prev.map(el => el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el));
    };

    const deleteElement = (id: string) => {
        markDirty();
        setElements(prev => prev.filter(el => el.id !== id));
        setSelectedId(null);
    };

    // --- Dragging Logic ---

    const handleMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const el = elements.find(e => e.id === id);
        if (!el) return;
        
        setSelectedId(id);
        setDragState({
            id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: el.x,
            initialY: el.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState) return;
        
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        
        // Don't mark dirty on every pixel move, only on drop? 
        // No, we need live update. But optimize?
        // Let's mark dirty on Drop/MouseUp to reduce re-renders of parent?
        // For visual smoothness, we update local state.
        // We can defer the "markDirty" to mouseUp if needed, but for now let's keep it sync.
        
        // Actually, we should NOT trigger onChange during drag if possible to avoid lag.
        // But updating 'elements' state triggers the effect.
        // Let's defer isDirty to mouseUp.
        
        setElements(prev => prev.map(el => el.id === dragState.id ? {
            ...el,
            x: dragState.initialX + dx,
            y: dragState.initialY + dy
        } : el));
    };

    const handleMouseUp = () => {
        if (dragState) {
            markDirty(); // Trigger save only when drag ends
            setDragState(null);
        }
    };

    // --- Sidebar Drag Logic ---

    const handleSidebarDragStart = (e: React.DragEvent, type: ElementType, content: string) => {
        e.dataTransfer.setData('type', type);
        e.dataTransfer.setData('content', content);
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('type') as ElementType;
        const content = e.dataTransfer.getData('content');
        
        if (type && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            addElement(type, content, x - 50, y - 10);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const selectedElement = elements.find(el => el.id === selectedId);

    return (
        <div 
            className="flex h-[600px] border rounded-md overflow-hidden bg-slate-100" 
            onMouseMove={handleMouseMove} 
            onMouseUp={handleMouseUp} 
            onMouseLeave={handleMouseUp}
        >
            {/* Sidebar Tools */}
            <div className="w-64 bg-white border-r p-4 flex flex-col gap-4 overflow-y-auto">
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground">Components</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            draggable="true"
                            onDragStart={(e) => handleSidebarDragStart(e, 'text', 'Double click to edit')}
                            onClick={() => addElement('text', 'Double click to edit')} 
                            className="justify-start cursor-grab active:cursor-grabbing"
                        >
                            <Type className="mr-2 h-4 w-4" /> Text
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            draggable="true"
                            onDragStart={(e) => handleSidebarDragStart(e, 'image', 'https://placehold.co/100x100')}
                            onClick={() => addElement('image', 'https://placehold.co/100x100')} 
                            className="justify-start cursor-grab active:cursor-grabbing"
                        >
                            <ImageIcon className="mr-2 h-4 w-4" /> Image
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            draggable="true"
                            onDragStart={(e) => handleSidebarDragStart(e, 'placeholder', '{{ PLACEHOLDER }}')}
                            onClick={() => addElement('placeholder', '{{ PLACEHOLDER }}')} 
                            className="justify-start cursor-grab active:cursor-grabbing"
                        >
                            <LayoutTemplate className="mr-2 h-4 w-4" /> Field
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            draggable="true"
                            onDragStart={(e) => handleSidebarDragStart(e, 'signature', '(Signature)')}
                            onClick={() => addElement('signature', '(Signature)')} 
                            className="justify-start cursor-grab active:cursor-grabbing"
                        >
                            <PenTool className="mr-2 h-4 w-4" /> Sign
                        </Button>
                    </div>
                </div>

                {selectedElement && (
                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Properties</Label>
                        
                        <div className="space-y-2">
                            <Label>Content / Text</Label>
                            {selectedElement.type === 'image' ? (
                                <Input value={selectedElement.content} onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} placeholder="Image URL" />
                            ) : (
                                <Textarea 
                                    value={selectedElement.content} 
                                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} 
                                    className="min-h-[80px]"
                                />
                            )}
                        </div>

                        {selectedElement.type !== 'image' && (
                            <div className="space-y-2">
                                <Label>Insert Variable</Label>
                                <Select onValueChange={(val) => updateElement(selectedElement.id, { content: selectedElement.content + val })}>
                                    <SelectTrigger><SelectValue placeholder="Select field..." /></SelectTrigger>
                                    <SelectContent>
                                        {PLACEHOLDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Styling</Label>
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-md">
                                <Button type="button" variant={selectedElement.style?.textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateStyle(selectedElement.id, { textAlign: 'left' })}><AlignLeft className="h-4 w-4"/></Button>
                                <Button type="button" variant={selectedElement.style?.textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateStyle(selectedElement.id, { textAlign: 'center' })}><AlignCenter className="h-4 w-4"/></Button>
                                <Button type="button" variant={selectedElement.style?.textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateStyle(selectedElement.id, { textAlign: 'right' })}><AlignRight className="h-4 w-4"/></Button>
                                <div className="w-px bg-slate-300 mx-1"></div>
                                <Button type="button" variant={selectedElement.style?.fontWeight === 'bold' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateStyle(selectedElement.id, { fontWeight: selectedElement.style?.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold className="h-4 w-4"/></Button>
                                <Button type="button" variant={selectedElement.style?.fontStyle === 'italic' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => updateStyle(selectedElement.id, { fontStyle: selectedElement.style?.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic className="h-4 w-4"/></Button>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <div className="flex-1">
                                    <Label className="text-[10px]">Font Size</Label>
                                    <Input type="text" value={selectedElement.style?.fontSize} onChange={(e) => updateStyle(selectedElement.id, { fontSize: e.target.value })} placeholder="14px" className="h-8" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div><Label className="text-[10px]">Width</Label><Input type="number" value={selectedElement.width} onChange={(e) => updateElement(selectedElement.id, { width: parseInt(e.target.value) })} className="h-8"/></div>
                            <div><Label className="text-[10px]">Height</Label><Input type="number" value={selectedElement.height} onChange={(e) => updateElement(selectedElement.id, { height: parseInt(e.target.value) })} className="h-8"/></div>
                        </div>

                        <Button type="button" variant="destructive" size="sm" onClick={() => deleteElement(selectedElement.id)} className="w-full mt-4">
                            <Trash2 className="mr-2 h-4 w-4"/> Remove Item
                        </Button>
                    </div>
                )}
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-slate-200 p-8 flex justify-center relative">
                <div 
                    ref={canvasRef}
                    className="bg-white shadow-lg relative transition-all"
                    style={{ 
                        width: `${PAGE_WIDTH}px`, 
                        height: `${PAGE_HEIGHT}px`,
                        minWidth: `${PAGE_WIDTH}px`,
                        minHeight: `${PAGE_HEIGHT}px`,
                    }}
                    onClick={() => setSelectedId(null)}
                    onDrop={handleCanvasDrop}
                    onDragOver={handleDragOver}
                >
                    {/* Grid/Guides could go here */}
                    {hasParseError && elements.length === 0 && (
                        <Alert variant="destructive" className="absolute top-4 left-4 right-4 z-50 shadow-md">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Incompatible Content</AlertTitle>
                            <AlertDescription>
                                The existing template contains custom HTML code that cannot be edited in Visual Mode. 
                                Adding elements here will overwrite the existing code.
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {!hasParseError && elements.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-bold text-4xl uppercase tracking-widest">
                            Blank Template
                        </div>
                    )}
                    {elements.map(el => (
                        <div
                            key={el.id}
                            className={`absolute group cursor-move hover:outline hover:outline-blue-400 ${selectedId === el.id ? 'outline outline-2 outline-blue-600 z-10' : 'z-0'}`}
                            style={{
                                left: el.x,
                                top: el.y,
                                width: el.width,
                                height: el.height,
                                ...el.style
                            }}
                            onMouseDown={(e) => handleMouseDown(e, el.id)}
                        >
                            {el.type === 'image' ? (
                                <img src={el.content} className="w-full h-full object-contain pointer-events-none" alt="element" />
                            ) : (
                                <div className="w-full h-full overflow-hidden whitespace-pre-wrap pointer-events-none">
                                    {el.content}
                                </div>
                            )}
                            
                            {/* Resize Handle (Simplified - strictly visual for now, dragging logic usually separate) */}
                            {selectedId === el.id && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-600 cursor-nwse-resize"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
