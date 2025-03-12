import React, { useState } from 'react';
import { useOpenAIStore } from '../store/openai';
import { Wand2, Play, Code2, RefreshCw, X } from 'lucide-react';
import { useResizable } from '../hooks/useResizable';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution';
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution';
import 'monaco-editor/esm/vs/editor/contrib/bracketMatching/browser/bracketMatching.js';
import 'monaco-editor/esm/vs/editor/contrib/hover/browser/hover.js';
import 'monaco-editor/esm/vs/editor/contrib/find/browser/findController.js';

// Initialize Monaco Editor
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

interface AICommand {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

const AI_COMMANDS: AICommand[] = [
  {
    id: 'explain',
    label: 'Explain Code',
    description: 'Get a detailed explanation of the selected code',
    prompt: 'Explain this code in detail:\n\n{code}'
  },
  {
    id: 'optimize',
    label: 'Optimize Code',
    description: 'Suggest optimizations for the code',
    prompt: 'Analyze this code and suggest optimizations. Return only the optimized code:\n\n{code}'
  },
  {
    id: 'debug',
    label: 'Debug Code',
    description: 'Find and fix potential bugs',
    prompt: 'Debug this code and fix any issues. Return only the fixed code:\n\n{code}'
  },
  {
    id: 'refactor',
    label: 'Refactor Code',
    description: 'Improve code structure and readability',
    prompt: 'Refactor this code to improve readability and maintainability. Return only the refactored code:\n\n{code}'
  },
  {
    id: 'docs',
    label: 'Generate Docs',
    description: 'Generate documentation comments',
    prompt: 'Add detailed documentation comments to this code. Return the code with added documentation:\n\n{code}'
  },
  {
    id: 'test',
    label: 'Generate Tests',
    description: 'Create unit tests for the code',
    prompt: 'Generate comprehensive unit tests for this code:\n\n{code}'
  }
];

const LANGUAGE_OPTIONS = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'php', label: 'PHP' },
  { id: 'ruby', label: 'Ruby' }
];

export function CodeEditor() {
  const [code, setCode] = useState('// Start coding here...');
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState('');
  const editorRef = React.useRef<HTMLDivElement>(null);
  const outputResizeRef = React.useRef<HTMLDivElement>(null);
  const [outputHeight, setOutputHeight] = useState(300);
  const service = useOpenAIStore((state) => state.service);
  const [currentModel, setCurrentModel] = React.useState<monaco.editor.ITextModel | null>(null);
  const [showOutput, setShowOutput] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);

  React.useEffect(() => {
    if (editorRef.current && !editor) {
      editor = monaco.editor.create(editorRef.current, {
        value: code,
        language,
        theme: 'vs-dark',
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        folding: true,
        renderWhitespace: 'selection',
        contextmenu: true,
        mouseWheelZoom: true,
        parameterHints: {
          enabled: true
        },
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showFolders: true,
          showTypeParameters: true,
          showSnippets: true,
          showUsers: true
        }
      });

      // Create initial model with unique URI
      const initialModel = monaco.editor.createModel(code, language, monaco.Uri.parse(`inmemory://model/${Date.now()}.${language}`));
      editor.setModel(initialModel);
      setCurrentModel(initialModel);

      editor.onDidChangeModelContent(() => {
        setCode(editor?.getValue() || '');
      });

      // Add keyboard shortcuts
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        // Save functionality
        console.log('Save triggered');
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        // Find functionality
        editor?.getAction('actions.find')?.run();
      });
    }

    return () => {
      editor?.dispose();
      currentModel?.dispose();
      setCurrentModel(null);
      editor = null;
    };
  }, []);

  React.useEffect(() => {
    if (editor && currentModel) {
      // Dispose of the old model first
      const oldModel = currentModel;
      
      // Create a new model with unique URI
      const newModel = monaco.editor.createModel(oldModel.getValue(), language, monaco.Uri.parse(`inmemory://model/${Date.now()}.${language}`));
      
      // Set the new model before disposing the old one
      editor.setModel(newModel);
      setCurrentModel(newModel);
      
      // Dispose of the old model
      oldModel.dispose();
    }
  }, [language, editor]);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    // Clear output when changing language
    setOutput('');
  };

  const handleAICommand = async (command: AICommand) => {
    if (!service) return;
    
    setLoading(true);
    try {
      const prompt = command.prompt.replace('{code}', code);
      const result = await service.generateResponse(prompt);
      
      if (command.id === 'explain') {
        setExplanation(result);
      } else {
        // For other commands, update the code
        setCode(result);
      }
    } catch (error) {
      console.error('AI command failed:', error);
      setOutput('Error: Failed to process AI command');
    } finally {
      setLoading(false);
    }
  };

  const runCode = async () => {
    setLoading(true);
    try {
      let result;
      
      if (language === 'javascript' || language === 'typescript') {
        // For JavaScript/TypeScript, use Function constructor
        try {
          const func = new Function(code);
          result = func();
        } catch (error) {
          result = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      } else {
        // For other languages, use AI to explain what the code would do
        if (!service) return;
        
        const prompt = `Analyze this ${language} code and explain what it would output when executed. Be specific about the expected output:\n\n${code}`;
        result = await service.generateResponse(prompt);
      }
      
      setOutput(result?.toString() || 'No output');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : 'Failed to run code'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCode = () => {
    if (editor) {
      editor.getAction('editor.action.formatDocument')?.run();
    }
  };

  const { startResize: startOutputResize } = useResizable({
    resizeRef: outputResizeRef,
    minWidth: 0,
    maxWidth: 0,
    minHeight: 100,
    maxHeight: 800,
    direction: 'vertical',
    onResize: () => {},
    onHeightResize: (height) => setOutputHeight(height)
  });

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 bg-[#2C2C2E] p-4 rounded-lg">
        {/* Top Row - Main Controls */}
        <div className="flex items-center justify-between">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="bg-[#3A3A3C] text-white px-3 py-1.5 rounded-lg min-w-[150px]"
          >
            {LANGUAGE_OPTIONS.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              onClick={formatCode}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors"
            >
              <Code2 className="w-4 h-4" />
              Format
            </button>
            <button
              onClick={runCode}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Run
            </button>
          </div>
        </div>

        {/* Bottom Row - AI Commands */}
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {AI_COMMANDS.map(command => (
            <button
              key={command.id}
              onClick={() => handleAICommand(command)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors group relative flex-shrink-0"
              title={command.description}
            >
              <Wand2 className="w-4 h-4" />
              {command.label}
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#4A4A4C] rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {command.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {/* Editor */}
        <div className="bg-[#2C2C2E] rounded-lg overflow-hidden border border-[#3A3A3C]">
          <div ref={editorRef} className="h-full w-full" />
        </div>

        {/* Output and Explanation */}
        <div className="flex flex-col gap-4">
          {/* Output Console */}
          {showOutput && (
            <div 
              className="bg-[#2C2C2E] rounded-lg p-4 overflow-auto border border-[#3A3A3C] relative"
              style={{ height: outputHeight }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Output</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOutput('')}
                    className="p-1 hover:bg-[#3A3A3C] rounded transition-colors opacity-50 hover:opacity-100"
                    title="Clear output"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowOutput(false)}
                    className="p-1 hover:bg-[#3A3A3C] rounded transition-colors"
                    title="Close output panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <pre className="font-mono text-sm whitespace-pre-wrap text-gray-300 min-h-[100px]">
                {loading ? 'Running...' : output || 'No output'}
              </pre>
              <div
                ref={outputResizeRef}
                className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize group"
                onMouseDown={startOutputResize}
              >
                <div className="absolute bottom-0 left-0 w-full h-1 bg-transparent group-hover:bg-blue-500/20" />
              </div>
            </div>
          )}

          {/* Code Explanation */}
          {showExplanation && (
            <div className="bg-[#2C2C2E] rounded-lg p-4 flex-1 overflow-auto border border-[#3A3A3C]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Explanation</h3>
                <button
                  onClick={() => setShowExplanation(false)}
                  className="p-1 hover:bg-[#3A3A3C] rounded transition-colors"
                  title="Close explanation panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap min-h-[100px]">
                {loading ? 'Analyzing...' : explanation || 'Click "Explain Code" to get an explanation'}
              </div>
            </div>
          )}

          {/* Show panels buttons */}
          {(!showOutput || !showExplanation) && (
            <div className="flex gap-2">
              {!showOutput && (
                <button
                  onClick={() => setShowOutput(true)}
                  className="px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors text-sm"
                >
                  Show Output
                </button>
              )}
              {!showExplanation && (
                <button
                  onClick={() => setShowExplanation(true)}
                  className="px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors text-sm"
                >
                  Show Explanation
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}