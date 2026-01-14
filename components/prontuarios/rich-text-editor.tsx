'use client'

/**
 * CLINIGO PREMIUM - Rich Text Editor for Medical Records
 * TipTap integration with AutoSave
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useAutoSave } from '@/lib/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/prontuarios/autosave-indicator'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import {
    Bold,
    Italic,
    List,
    ListOrdered,
    Undo,
    Redo,
    Heading2,
} from 'lucide-react'

interface RichTextEditorProps {
    recordId: string
    field: string
    initialContent?: string
    placeholder?: string
    onSave?: (content: string) => void
    className?: string
}

export function RichTextEditor({
    recordId,
    field,
    initialContent = '',
    placeholder = 'Digite aqui...',
    onSave,
    className = ''
}: RichTextEditorProps) {

    const { triggerSave, forceSave, state } = useAutoSave(recordId, 'consultations')

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            CharacterCount.configure({
                limit: 10000,
            }),
        ],
        content: initialContent,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            const json = editor.getJSON()

            // Trigger auto-save with debounce
            triggerSave({
                [field]: html,
                [`${field}_json`]: json,
            })

            onSave?.(html)
        },
    })

    // Initialize with content
    useEffect(() => {
        if (editor && initialContent && !editor.getText()) {
            editor.commands.setContent(initialContent)
        }
    }, [editor, initialContent])

    if (!editor) {
        return <div className="h-[200px] bg-muted animate-pulse rounded-md" />
    }

    const characterCount = editor.storage.characterCount.characters()
    const characterLimit = 10000

    return (
        <div className={`border rounded-lg ${className}`}>
            {/* Toolbar */}
            <div className="border-b bg-muted/30 p-2 flex items-center gap-1 flex-wrap">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={editor.isActive('bold') ? 'bg-muted' : ''}
                >
                    <Bold className="h-4 w-4" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={editor.isActive('italic') ? 'bg-muted' : ''}
                >
                    <Italic className="h-4 w-4" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
                >
                    <Heading2 className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={editor.isActive('bulletList') ? 'bg-muted' : ''}
                >
                    <List className="h-4 w-4" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={editor.isActive('orderedList') ? 'bg-muted' : ''}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                >
                    <Undo className="h-4 w-4" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                >
                    <Redo className="h-4 w-4" />
                </Button>

                {/* AutoSave Indicator */}
                <div className="ml-auto flex items-center gap-2">
                    <AutoSaveIndicator
                        isSaving={state.isSaving}
                        lastSaved={state.lastSaved}
                        hasUnsavedChanges={state.hasUnsavedChanges}
                        error={state.error}
                        isOnline={typeof window !== 'undefined' && navigator.onLine}
                    />
                </div>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />

            {/* Footer */}
            <div className="border-t p-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                    {characterCount} / {characterLimit} caracteres
                </span>

                {state.lastSaved && (
                    <span>
                        Última modificação: {state.lastSaved.toLocaleTimeString('pt-BR')}
                    </span>
                )}
            </div>
        </div>
    )
}
