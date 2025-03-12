import { useEffect, useState, useCallback } from 'react';
import { useOpenAIStore } from '../store/openai';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { InlineMath, BlockMath } from 'react-katex';
import Placeholder from '@tiptap/extension-placeholder';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Sparkles,
  ChevronRight,
  Quote,
  Wand2
} from 'lucide-react';

interface NotesProps {
  text?: string;
}

interface AICommand {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

const AI_COMMANDS: AICommand[] = [
  {
    id: 'complete',
    label: 'Complete sentence',
    description: 'Complete the current sentence using AI',
    prompt: 'Complete this sentence naturally: "{text}"'
  },
  {
    id: 'expand',
    label: 'Expand paragraph',
    description: 'Add more details and examples',
    prompt: 'Expand this text with more details, examples, and explanations. Maintain the same formatting structure: "{text}"'
  },
  {
    id: 'simplify',
    label: 'Simplify',
    description: 'Make the text simpler and clearer',
    prompt: 'Simplify this text while keeping the main points. Use clear bullet points and examples: "{text}"'
  },
  {
    id: 'academic',
    label: 'Make academic',
    description: 'Convert to academic style',
    prompt: 'Convert this text to academic style with proper citations and terminology. Maintain structured format: "{text}"'
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Create a brief summary',
    prompt: 'Create a structured summary with main points and key takeaways: "{text}"'
  },
  {
    id: 'organize',
    label: 'Reorganize',
    description: 'Improve structure and organization',
    prompt: 'Reorganize this content into a clear, hierarchical structure with sections, subsections, and bullet points: "{text}"'
  }
];

export function Notes({ text }: NotesProps) {
  const [loading, setLoading] = useState(false);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiMenuPosition, setAiMenuPosition] = useState({ x: 0, y: 0 });
  const service = useOpenAIStore((state) => state.service);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        history: {
          depth: 100,
          newGroupDelay: 500
        }
      }),
      Placeholder.configure({
        placeholder: 'Type / for commands or right-click for options...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg prose-invert max-w-none focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (!text || !service || !editor) return;

    async function generateNotes() {
      setLoading(true);
      try {
        const result = await service.generateResponse(
          `Create detailed, well-structured study notes from this text. Format the output EXACTLY as shown in this example:

          # Main Topic Title

          ## 1. Key Concept
          • Important point about the concept
            ◦ Supporting detail or example
            ◦ Additional explanation
          • Another important point
            ◦ Specific example: [example details]
            ◦ Related information

          ### Summary
          • Brief recap of key points
          • Main takeaways

          ## 2. Another Key Concept
          • Definition: [clear, concise definition]
          • Key characteristics:
            ◦ First characteristic
            ◦ Second characteristic
          • Real-world applications:
            ◦ Example 1: [specific example]
            ◦ Example 2: [specific example]

          ### Summary
          • Quick summary of this section
          • Important implications

          Follow these rules strictly:
          1. Use # for main title
          2. Use ## for numbered sections
          3. Use ### for subsections
          4. Use • for main bullet points
          5. Use ◦ for sub-bullet points
          6. Bold all key terms using **term**
          7. Include a Summary subsection after each main section
          8. Keep points concise and clear
          9. Use proper hierarchical structure
          10. Include specific examples where relevant
          
          ${text}`
        );
        editor.commands.setContent(result);
      } catch (error) {
        console.error('Failed to generate notes:', error);
      } finally {
        setLoading(false);
      }
    }

    generateNotes();
  }, [text, service, editor]);

  const handleAICommand = async (command: AICommand) => {
    if (!editor || !service) return;

    let { from, to } = editor.state.selection;
    let selectedText = '';
    
    // Get the selected text or current line
    if (editor.state.selection.empty) {
      // No selection - get current line
      const pos = editor.state.selection.$head;
      const line = pos.parent;
      from = pos.start();
      to = pos.end();
      selectedText = line.textContent;
    } else {
      // Use selected text
      selectedText = editor.state.doc.textBetween(from, to, ' ');
    }
    
    setLoading(true);
    try {
      const promptText = command.prompt.replace('{text}', selectedText.trim() || 'Start writing about') +
        '\n\nRules for formatting:\n' +
        '1. Use Markdown syntax for formatting\n' +
        '2. Use $...$ for inline math expressions\n' +
        '3. Use $$...$$$ for block math expressions\n' +
        '4. Use **text** for bold\n' +
        '5. Use *text* for italic\n' +
        '6. Use # for h1, ## for h2, etc.\n' +
        '7. Preserve all mathematical notation exactly';
      
      if (command.id === 'complete') {
        // For sentence completion, use streaming response
        let generatedText = selectedText;
        await service.generateStreamingResponse(promptText, (chunk) => {
          // Process chunk to handle math expressions
          const processedChunk = processText(chunk);
          generatedText += chunk;
          editor.chain().focus()
            .command(({ tr }) => {
              tr.insertText(selectedText + processedChunk, from, to);
              return true as const;
            })
            .run();
        });
      } else {
        // For other commands, use regular response
        const result = await service.generateResponse(promptText);
        const processedResult = processText(result);
        editor.chain().focus()
          .command(({ tr }) => {
            tr.insertText(processedResult, from, to);
            return true as const;
          })
          .run();
      }
      
    } catch (error) {
      console.error('AI command failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to process text and handle math expressions
  const processText = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\$\$.*?\$\$|\$.*?\$)/gs);
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return <BlockMath key={index} math={part.slice(2, -2)} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={index} math={part.slice(1, -1)} />;
      }
      // Process markdown-style formatting
      return part
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>');
    });
  };

  const handleSlashCommand = useCallback((e: KeyboardEvent) => {
    if (e.key === '/' && editor) {
      const { top, left } = editor.view.coordsAtPos(editor.state.selection.from);
      setAiMenuPosition({ x: left, y: top + 20 });
      setShowAIMenu(true);
    }
  }, [editor]);

  useEffect(() => {
    if (editor) {
      editor.view.dom.addEventListener('keydown', handleSlashCommand);
      return () => editor.view.dom.removeEventListener('keydown', handleSlashCommand);
    }
  }, [editor, handleSlashCommand]);

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col bg-[#2C2C2E] rounded-lg">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b border-[#3A3A3C] bg-[#2C2C2E] sticky top-0 z-10">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-[#3A3A3C] ${
            editor?.isActive('bold') ? 'bg-[#3A3A3C]' : ''
          }`}
        >
          <Bold className="w-4 h-4" />
          <span className="sr-only">Bold</span>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-[#3A3A3C] ${
            editor?.isActive('italic') ? 'bg-[#3A3A3C]' : ''
          }`}
        >
          <Italic className="w-4 h-4" />
          <span className="sr-only">Italic</span>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-[#3A3A3C] ${
            editor?.isActive('bulletList') ? 'bg-[#3A3A3C]' : ''
          }`}
        >
          <List className="w-4 h-4" />
          <span className="sr-only">Bullet List</span>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-[#3A3A3C] ${
            editor?.isActive('heading', { level: 1 }) ? 'bg-[#3A3A3C]' : ''
          }`}
        >
          <Heading1 className="w-4 h-4" />
          <span className="sr-only">Heading 1</span>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-[#3A3A3C] ${
            editor?.isActive('heading', { level: 2 }) ? 'bg-[#3A3A3C]' : ''
          }`}
        >
          <Heading2 className="w-4 h-4" />
          <span className="sr-only">Heading 2</span>
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-[#3A3A3C] ${
            editor?.isActive('blockquote') ? 'bg-[#3A3A3C]' : ''
          }`}
        >
          <Quote className="w-4 h-4" />
          <span className="sr-only">Quote</span>
        </button>
      </div>

      {/* Editor */}
      <ContextMenu.Root>
        <ContextMenu.Trigger className="flex-1">
          <div className="h-[calc(100vh-300px)] p-8 overflow-y-auto bg-[#1C1C1E]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-400 animate-pulse">Generating notes...</div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto overflow-y-auto">
                <EditorContent 
                  editor={editor} 
                  className="prose prose-lg prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-300 prose-blockquote:border-l-4 prose-blockquote:border-gray-500 prose-blockquote:pl-4 prose-blockquote:italic prose-strong:text-white prose-code:text-white prose-pre:bg-[#2C2C2E] prose-pre:text-white katex-display" 
                />
              </div>
            )}
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>
          <ContextMenu.Content
            className="min-w-[220px] bg-[#2C2C2E] rounded-lg p-1 shadow-xl"
          >
            <ContextMenu.Sub>
              <ContextMenu.SubTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-[#3A3A3C]">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  Ask AI
                </div>
                <ChevronRight className="w-4 h-4" />
              </ContextMenu.SubTrigger>
              
              <ContextMenu.Portal>
                <ContextMenu.SubContent
                  className="min-w-[220px] bg-[#2C2C2E] rounded-lg p-1 shadow-xl"
                >
                  {AI_COMMANDS.map((command) => (
                    <ContextMenu.Item
                      key={command.id}
                      className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-[#3A3A3C] cursor-pointer"
                      onClick={() => handleAICommand(command)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      <div>
                        <div>{command.label}</div>
                        <div className="text-xs text-gray-400">{command.description}</div>
                      </div>
                    </ContextMenu.Item>
                  ))}
                </ContextMenu.SubContent>
              </ContextMenu.Portal>
            </ContextMenu.Sub>

            <ContextMenu.Separator className="h-px bg-[#3A3A3C] my-1" />
            
            <ContextMenu.Item
              className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-[#3A3A3C] cursor-pointer"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="w-4 h-4 mr-2" />
              Bold
            </ContextMenu.Item>
            
            <ContextMenu.Item
              className="flex items-center px-2 py-1.5 text-sm rounded hover:bg-[#3A3A3C] cursor-pointer"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="w-4 h-4 mr-2" />
              Italic
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>

      {/* AI Command Menu */}
      {showAIMenu && (
        <div
          className="fixed bg-[#2C2C2E] rounded-lg shadow-xl p-1 min-w-[280px] z-50 border border-[#3A3A3C]"
          style={{ top: aiMenuPosition.y, left: aiMenuPosition.x }}
        >
          {AI_COMMANDS.map((command) => (
            <button
              key={command.id}
              className="flex items-center w-full px-3 py-2 text-sm rounded-lg hover:bg-[#3A3A3C] transition-colors group"
              onClick={() => {
                handleAICommand(command);
                setShowAIMenu(false);
              }}
            >
              <Sparkles className="w-4 h-4 mr-3 text-blue-400 group-hover:text-blue-300" />
              <div>
                <div className="font-medium">{command.label}</div>
                <div className="text-xs text-gray-400">{command.description}</div>
              </div>
            </button>
          ))}
          <div className="px-3 py-2 text-xs text-gray-500 border-t border-[#3A3A3C] mt-1">
            Press Esc to close
          </div>
        </div>
      )}
    </div>
  );
}