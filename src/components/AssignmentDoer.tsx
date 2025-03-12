import React, { useState, useRef } from 'react';
import { SendHorizontal, Copy, Download, RefreshCw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOpenAIStore } from '../store/openai';

interface Assignment {
  question: string;
  answer: string;
  isStreaming?: boolean;
  steps?: string[];
  isResearchPaper?: boolean;
  outline?: {
    title: string;
    sections: {
      heading: string;
      content: string;
      subsections?: { heading: string; content: string; }[];
    }[];
  };
}

export function AssignmentDoer() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const service = useOpenAIStore((state) => state.service);

  const generateResearchSteps = async (topic: string) => {
    if (!service) return;
    
    const defaultSteps = [
      "Research and gather relevant sources",
      "Create detailed outline and structure",
      "Write introduction and background",
      "Develop methodology section",
      "Present findings and analysis",
      "Write discussion and conclusion",
      "Format and add references",
      "Review and revise"
    ];

    try {
      const response = await service.generateResponse(`
        Generate a detailed step-by-step plan for writing a research paper on this topic:
        ${topic}

        Return an array of 8-10 detailed steps as a JSON array of strings.
        Include steps for:
        1. Initial research and planning
        2. Outline creation
        3. Research methodology
        4. Data collection/analysis if applicable
        5. Writing process
        6. Review and formatting
      `);

      let steps;
      try {
        steps = JSON.parse(response);
        // Validate that steps is an array of strings
        if (!Array.isArray(steps) || !steps.every(step => typeof step === 'string')) {
          throw new Error('Invalid steps format');
        }
      } catch (parseError) {
        console.error('Error parsing steps:', parseError);
        steps = defaultSteps;
      }

      setCurrentSteps(steps);
      setShowSteps(true);
      setIsConfirming(true);
    } catch (error) {
      console.error('Error generating steps:', error);
      setCurrentSteps(defaultSteps);
      setShowSteps(true);
      setIsConfirming(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !service || isStreaming) return;

    if (isResearchMode && !showSteps) {
      await generateResearchSteps(input);
      return;
    }

    const newAssignment: Assignment = {
      question: input,
      answer: '',
      isStreaming: true,
      isResearchPaper: isResearchMode,
      steps: isResearchMode ? currentSteps : undefined
    };

    setAssignments(prev => [...prev, newAssignment]);
    setInput('');
    setIsStreaming(true);
    setShowSteps(false);
    setIsConfirming(false);

    try {
      let streamedContent = '';
      const prompt = isResearchMode 
        ? `Write a detailed research paper following this outline and these steps:

           Topic: ${input}

           Steps to follow:
          ${currentSteps.map((step, i) => `${i + 1}. ${step}`).join('\n\n')}

           Format the paper with:
           - Clear title and abstract
           - Properly formatted sections and subsections
           - In-text citations (APA style)
           - Tables and figures where appropriate
           - References section
           - Professional academic tone
           
           Important:
           1. Use proper academic language and formatting
           2. Include relevant citations and references
           3. Structure the paper logically following the steps
           4. Use clear headings and subheadings
           5. Provide detailed explanations and analysis`
        : `Please solve this assignment question with detailed explanations and steps:
           
           ${input}
           
           Format your response with:
           - Clear step-by-step explanations
           - Relevant formulas or concepts
           - Example calculations if applicable
           - Final answer clearly stated
           - Citations or references if needed`;
      
      await service.generateStreamingResponse(prompt, (chunk) => {
          streamedContent += chunk;
          setAssignments(prev => {
            const newAssignments = [...prev];
            const lastAssignment = newAssignments[newAssignments.length - 1];
            lastAssignment.answer = streamedContent;
            return newAssignments;
          });
        }
      );

      setAssignments(prev => {
        const newAssignments = [...prev];
        const lastAssignment = newAssignments[newAssignments.length - 1];
        lastAssignment.isStreaming = false;
        lastAssignment.answer = streamedContent;
        return newAssignments;
      });
    } catch (error) {
      console.error('Streaming error:', error);
      setAssignments(prev => {
        const newAssignments = [...prev];
        const lastAssignment = newAssignments[newAssignments.length - 1];
        lastAssignment.answer = 'Sorry, I encountered an error. Please try again.';
        lastAssignment.isStreaming = false;
        return newAssignments;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const copyToClipboard = () => {
    const formattedText = assignments.map(assignment => {
      const header = assignment.isResearchPaper ? 'Research Topic' : 'Question';
      const content = assignment.isResearchPaper ? 'Research Paper' : 'Answer';
      return `${header}:\n${assignment.question}\n\n${content}:\n${assignment.answer}\n\n---\n\n`;
    }).join('');
    
    navigator.clipboard.writeText(formattedText);
  };

  const downloadPDF = () => {
    const formattedText = assignments.map(assignment => {
      const header = assignment.isResearchPaper ? 'Research Topic' : 'Question';
      const content = assignment.isResearchPaper ? 'Research Paper' : 'Answer';
      return `${header}:\n${assignment.question}\n\n${content}:\n${assignment.answer}\n\n---\n\n`;
    }).join('');
    
    const element = document.createElement('a');
    const file = new Blob([formattedText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = isResearchMode ? 'research-papers.txt' : 'assignments.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#2C2C2E] border-b border-[#3A3A3C]">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-medium">Assignment Helper</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsResearchMode(!isResearchMode);
                setShowSteps(false);
                setCurrentSteps([]);
                setIsConfirming(false);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                isResearchMode 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Research Paper Mode
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy All
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Assignments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {showSteps && (
          <div className="bg-[#2C2C2E] rounded-lg overflow-hidden mb-6">
            <div className="p-4 bg-[#3A3A3C] flex items-center justify-between">
              <h3 className="text-lg font-medium">Research Paper Steps</h3>
              {isConfirming && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Proceed with these steps
                  </button>
                  <button
                    onClick={() => {
                      setShowSteps(false);
                      setCurrentSteps([]);
                      setIsConfirming(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              <ol className="space-y-2">
                {currentSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="flex-none w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1 text-gray-300">{step}</div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {assignments.map((assignment, index) => (
          <div key={index} className="bg-[#2C2C2E] rounded-lg overflow-hidden">
            {/* Question */}
            <div className="p-4 bg-[#3A3A3C]">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                {assignment.isResearchPaper ? 'Research Topic' : `Question ${index + 1}`}
              </h3>
              <p className="text-white">{assignment.question}</p>
            </div>
            
            {/* Answer */}
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                {assignment.isResearchPaper ? 'Research Paper' : 'Answer'}
              </h3>
              <div className="text-gray-300 whitespace-pre-wrap prose prose-invert max-w-none">
                {assignment.answer}
                {assignment.isStreaming && (
                  <span className="ml-1 inline-block w-2 h-4 bg-blue-500 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#3A3A3C] bg-[#2C2C2E]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isResearchMode
                ? showSteps
                  ? "Review the steps above and click 'Proceed' to generate the paper..."
                  : "Enter your research topic..."
                : "Type your assignment question..."
            }
            className="flex-1 bg-[#1C1C1E] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#3A3A3C]"
            disabled={isStreaming || (showSteps && isConfirming)}
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim() || (showSteps && isConfirming)}
            className="p-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500"
          >
            {isStreaming ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <SendHorizontal className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {isStreaming 
            ? isResearchMode 
              ? 'Writing research paper...' 
              : 'Generating answer...'
            : isResearchMode
              ? showSteps
                ? 'Review the steps and proceed when ready'
                : 'Enter your research topic to get started'
              : 'Type your question and press enter'
          }
        </p>
      </form>
    </div>
  );
}