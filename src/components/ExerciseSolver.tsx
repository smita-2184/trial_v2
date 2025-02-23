import React, { useState, useRef, useEffect } from 'react';
import { useOpenAIStore } from '../store/openai';
import { Upload, SendHorizontal, RefreshCw, Calculator, ChevronRight, Download, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { BlockMath } from 'react-katex';
import { useDropzone } from 'react-dropzone';

const DEEPSEEK_API_KEY = 'sk-84bedb070f484479be0d09dca0bf142b';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface ExamSubmission {
  question: string;
  studentAnswer: string;
  answerFile?: File;
  feedback?: {
    score: number;
    comments: string[];
    corrections: string[];
    suggestions: string[];
  };
}

type Mode = 'exercise' | 'exam';

interface Solution {
  question: string;
  steps: {
    explanation: string;
    latex?: string;
    hint?: string;
  }[];
  finalAnswer: string;
  relatedConcepts: string[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface ExerciseSolverProps {
  documentText: string;
}

export function ExerciseSolver({ documentText }: ExerciseSolverProps) {
  const [question, setQuestion] = useState<string>('');
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [mode, setMode] = useState<Mode>('exercise');
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<{ solutionIndex: number; stepIndex: number }[]>([]);
  const service = useOpenAIStore((state) => state.service);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to generate questions from document
  const generateQuestionsFromDocument = async () => {
    if (!service || !documentText) return;
    
    setLoading(true);
    try {
      const prompt = `Generate 3 practice questions based on this document content. Format as JSON:
      {
        "questions": [
          {
            "question": "Detailed question text",
            "type": "conceptual|calculation|analysis",
            "difficulty": "Easy|Medium|Hard",
            "topic": "Main topic or concept being tested",
            "expectedAnswer": "Key points or solution approach"
          }
        ]
      }

      Document content:
      ${documentText}

      Guidelines:
      1. Create diverse question types
      2. Focus on key concepts
      3. Include calculation problems where relevant
      4. Ensure questions test understanding
      5. Vary difficulty levels`;

      const response = await service.generateResponse(prompt);
      const { questions } = JSON.parse(response);
      
      // Set the first question
      if (questions.length > 0) {
        setQuestion(questions[0].question);
      }

    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to handle document text updates
  useEffect(() => {
    if (documentText) {
      // Clear any existing questions/solutions when document changes
      setQuestion('');
      setSolutions([]);
      generateQuestionsFromDocument();
    }
  }, [documentText, service]);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onAnswerFileDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setAnswerFile(file);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const { getRootProps: getAnswerRootProps, getInputProps: getAnswerInputProps } = useDropzone({
    onDrop: onAnswerFileDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const analyzeAnswer = async () => {
    if (!service || (!currentAnswer && !answerFile) || !question) return;
    setLoading(true);

    try {
      let answerText = currentAnswer;
      
      // If there's an answer file, we need to extract its text first
      if (answerFile) {
        // Here you would extract text from the file
        // For now, we'll just use the filename
        answerText = `[Answer from file: ${answerFile.name}] ${currentAnswer}`;
      }
      
      // Use DeepSeek API for enhanced answer analysis
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-coder',
          messages: [{
            role: 'user',
            content: `Analyze this exam answer with detailed feedback:

            Question: ${question}
            Student Answer: ${answerText}
            ${documentText ? `\nContext from document:\n${documentText}` : ''}

            Provide a detailed analysis in this JSON format:
            {
              "score": number (0-100),
              "comments": [
                "Detailed comment 1",
                "Detailed comment 2"
              ],
              "corrections": [
                "Correction 1",
                "Correction 2"
              ],
              "suggestions": [
                "Improvement suggestion 1",
                "Improvement suggestion 2"
              ],
              "conceptualUnderstanding": {
                "strengths": ["List of well-understood concepts"],
                "weaknesses": ["List of concepts needing improvement"]
              },
              "learningResources": [
                {
                  "topic": "Topic name",
                  "description": "Resource description",
                  "type": "video|article|exercise"
                }
              ]
            }`
          }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      const feedback = JSON.parse(data.choices[0].message.content);

      setExamSubmissions(prev => [...prev, {
        question,
        studentAnswer: answerText,
        answerFile,
        feedback
      }]);

      // Reset form
      setQuestion('');
      setCurrentAnswer('');
      setAnswerFile(null);
      setUploadedImage(null);

    } catch (error) {
      console.error('Failed to analyze answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !service || loading) return;
    
    const contextPrompt = documentText 
      ? `Context from document:\n${documentText}\n\nQuestion: ${question}`
      : question;

    setLoading(true);
    try {
      const prompt = `Solve this ${documentText ? 'question from the document' : 'exercise'} with detailed step-by-step explanations:

${contextPrompt}

Format the response as JSON with this EXACT structure:
{
  "question": "Original question text",
  "steps": [
    {
      "explanation": "Clear explanation of this step",
      "latex": "Mathematical notation in LaTeX (if applicable)",
      "hint": "Helpful hint for understanding this step",
      "visualization": {
        "type": "graph|diagram|plot",
        "data": {
          "points": [[x1, y1], [x2, y2]],
          "functions": ["x^2", "sin(x)"],
          "labels": ["A", "B", "C"]
        }
      }
    }
  ],
  "finalAnswer": "Complete final answer",
  "relatedConcepts": ["Concept 1", "Concept 2"],
  "difficulty": "Easy|Medium|Hard",
  "practiceProblems": [
    {
      "question": "Similar practice question",
      "solution": "Step-by-step solution",
      "difficulty": "Easy|Medium|Hard"
    }
  ],
  "furtherReading": [
    {
      "topic": "Related topic",
      "description": "Why this is relevant",
      "resources": ["Resource 1", "Resource 2"]
    }
  ]
}

Guidelines:
1. Break down the solution into clear, logical steps
2. Include mathematical notation in LaTeX where appropriate
3. Add helpful hints for understanding each step
4. Suggest visualizations where they would help
5. Include practice problems of varying difficulty
6. Link to related concepts and resources
7. Maintain academic rigor and clarity`;

      const response = await service.generateResponse(prompt);
      const parsed = JSON.parse(response);

      setSolutions(prev => [parsed, ...prev]);
      setQuestion('');
      
      // Scroll to the new solution
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Failed to generate solution:', error);
      setSolutions(prev => [{
        question: question,
        steps: [{
          explanation: "Sorry, I encountered an error generating the solution. Please try again.",
          hint: "If the problem persists, try rephrasing your question."
        }],
        finalAnswer: "Error occurred",
        relatedConcepts: [],
        difficulty: "Medium"
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStepExpansion = (solutionIndex: number, stepIndex: number) => {
    setExpandedSteps(prev => {
      const isExpanded = prev.some(
        step => step.solutionIndex === solutionIndex && step.stepIndex === stepIndex
      );
      
      if (isExpanded) {
        return prev.filter(
          step => !(step.solutionIndex === solutionIndex && step.stepIndex === stepIndex)
        );
      } else {
        return [...prev, { solutionIndex, stepIndex }];
      }
    });
  };

  const isStepExpanded = (solutionIndex: number, stepIndex: number) => {
    return expandedSteps.some(
      step => step.solutionIndex === solutionIndex && step.stepIndex === stepIndex
    );
  };

  const downloadSolution = (solution: Solution) => {
    const content = `Exercise Solution

Question:
${solution.question}

Step-by-Step Solution:
${solution.steps.map((step, index) => `
Step ${index + 1}:
${step.explanation}
${step.hint ? `\nHint: ${step.hint}` : ''}`).join('\n')}

Final Answer:
${solution.finalAnswer}

Related Concepts:
${solution.relatedConcepts.join(', ')}

Difficulty: ${solution.difficulty}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exercise-solution.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-[#1C1C1E] rounded-lg">
      {/* Header */}
      <div className="bg-[#2C2C2E] p-4 rounded-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Exercise Solver</h2>
        </div>
          <div className="flex items-center gap-4">
            {documentText && (
              <button
                onClick={generateQuestionsFromDocument}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Generate New Questions
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('exercise')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                mode === 'exercise' ? 'bg-blue-500' : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
              }`}
            >
              Exercise Mode
            </button>
            <button
              onClick={() => setMode('exam')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                mode === 'exam' ? 'bg-blue-500' : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
              }`}
            >
              Practice Exam
            </button>
          </div>
        <p className="text-sm text-gray-400 mt-1">
          {mode === 'exercise' 
            ? 'Upload an image of your exercise or type your question to get a detailed step-by-step solution'
            : 'Upload your exam question and answer for detailed feedback and scoring'
          }
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-[#2C2C2E] p-4 rounded-lg">
        {/* Question Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={documentText ? "Type your question about the document..." : "Type your question here..."}
            className="flex-1 bg-[#1C1C1E] rounded-lg px-4 py-3 border-2 border-[#3A3A3C] focus:border-blue-500 focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Solving...
              </>
            ) : (
              <>
                <SendHorizontal className="w-4 h-4" />
                Solve
              </>
            )}
          </button>
        </div>
      </form>

      {/* Solutions */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {mode === 'exam' && (
          <div className="bg-[#2C2C2E] rounded-lg p-6 border border-[#3A3A3C]">
            <h3 className="text-lg font-medium mb-4">Practice Exam</h3>
            
            {/* Question Input */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Enter or paste the exam question here..."
                  className="w-full h-32 bg-[#1C1C1E] rounded-lg px-4 py-3 border-2 border-[#3A3A3C] focus:border-blue-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Answer Section */}
              <div>
                <label className="block text-sm font-medium mb-2">Your Answer</label>
                <div className="space-y-4">
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Write your answer here..."
                    className="w-full h-48 bg-[#1C1C1E] rounded-lg px-4 py-3 border-2 border-[#3A3A3C] focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  />
                  
                  {/* File Upload for Answer */}
                  <div 
                    {...getAnswerRootProps()} 
                    className="border-2 border-dashed border-[#3A3A3C] rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <input {...getAnswerInputProps()} />
                    {answerFile ? (
                      <div className="flex items-center justify-center gap-2 text-blue-400">
                        <FileText className="w-6 h-6" />
                        <div>
                          <p className="font-medium">{answerFile.name}</p>
                          <p className="text-sm text-gray-400">
                            {(answerFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnswerFile(null);
                          }}
                          className="p-1 hover:bg-[#3A3A3C] rounded-full ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400">Upload your answer file (optional)</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Supports PDF, images, and text files
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={analyzeAnswer}
                disabled={loading || (!currentAnswer && !answerFile) || !question}
                className="w-full px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center gap-2 justify-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SendHorizontal className="w-4 h-4" />
                    Analyze Answer
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {solutions.map((solution, solutionIndex) => (
          <div key={solutionIndex} className="bg-[#2C2C2E] rounded-lg p-6 border border-[#3A3A3C]">
            {/* Question */}
            <div className="flex items-center justify-between pb-4 border-b border-[#3A3A3C]">
              <div>
                <h3 className="font-medium">Question</h3>
                <p className="text-gray-400 mt-1">{solution.question}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  solution.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                  solution.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {solution.difficulty}
                </span>
                <button
                  onClick={() => downloadSolution(solution)}
                  className="p-2 hover:bg-[#3A3A3C] rounded-lg transition-colors"
                  title="Download solution"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="mt-4 space-y-4">
              <h3 className="font-medium">Solution Steps</h3>
              {solution.steps.map((step, stepIndex) => (
                <div key={stepIndex} className="bg-[#1C1C1E] rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-none w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-medium">
                      {stepIndex + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-gray-300">{step.explanation}</p>
                          {step.latex && (
                            <div className="mt-2">
                              <BlockMath math={step.latex} />
                            </div>
                          )}
                        </div>
                        {step.hint && (
                          <button
                            onClick={() => toggleStepExpansion(solutionIndex, stepIndex)}
                            className={`p-2 rounded-lg transition-colors ${
                              isStepExpanded(solutionIndex, stepIndex)
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-[#3A3A3C] hover:bg-[#4A4A4C]'
                            }`}
                            title="Show hint"
                          >
                            <ChevronRight 
                              className={`w-4 h-4 transition-transform ${
                                isStepExpanded(solutionIndex, stepIndex) ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>
                      {isStepExpanded(solutionIndex, stepIndex) && step.hint && (
                        <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <p className="text-sm text-blue-400">{step.hint}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Answer */}
            <div className="mt-6 p-4 bg-[#1C1C1E] rounded-lg border border-[#3A3A3C]">
              <h3 className="font-medium mb-2">Final Answer</h3>
              <p className="text-gray-300">{solution.finalAnswer}</p>
            </div>

            {/* Related Concepts */}
            <div className="mt-4">
              <h3 className="font-medium mb-2">Related Concepts</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {solution.relatedConcepts.map((concept, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-[#3A3A3C] rounded text-sm"
                  >
                    {concept}
                  </span>
                ))}
              </div>
              
              {/* Practice Problems */}
              {solution.practiceProblems && solution.practiceProblems.length > 0 && (
                <div className="mt-4 p-4 bg-[#1C1C1E] rounded-lg">
                  <h4 className="font-medium mb-2">Practice Problems</h4>
                  <div className="space-y-4">
                    {solution.practiceProblems.map((problem, index) => (
                      <div key={index} className="p-4 bg-[#2C2C2E] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium">Practice Question {index + 1}</h5>
                          <span className={`px-2 py-1 rounded text-sm ${
                            problem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                            problem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {problem.difficulty}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-2">{problem.question}</p>
                        <div className="text-gray-400 text-sm">{problem.solution}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Further Reading */}
              {solution.furtherReading && solution.furtherReading.length > 0 && (
                <div className="mt-4 p-4 bg-[#1C1C1E] rounded-lg">
                  <h4 className="font-medium mb-2">Further Reading</h4>
                  <div className="space-y-4">
                    {solution.furtherReading.map((reading, index) => (
                      <div key={index} className="space-y-1">
                        <h5 className="font-medium text-blue-400">{reading.topic}</h5>
                        <p className="text-gray-300 text-sm">{reading.description}</p>
                        <ul className="list-disc list-inside text-gray-400 text-sm">
                          {reading.resources.map((resource, i) => (
                            <li key={i}>{resource}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Exam Submissions */}
        {mode === 'exam' && examSubmissions.map((submission, index) => (
          <div key={index} className="bg-[#2C2C2E] rounded-lg p-6 border border-[#3A3A3C]">
            {/* Question and Answer */}
            <div className="space-y-4 pb-4 border-b border-[#3A3A3C]">
              <div>
                <h3 className="font-medium mb-2">Question</h3>
                <p className="text-gray-400">{submission.question}</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">Your Answer</h3>
                <p className="text-gray-400">{submission.studentAnswer}</p>
                {submission.answerFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <FileText className="w-4 h-4" />
                    {submission.answerFile.name}
                  </div>
                )}
              </div>

              {/* Feedback */}
              {submission.feedback && (
                <div className="mt-4 pt-4 border-t border-[#3A3A3C]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-2xl font-bold">
                      {submission.feedback.score}
                    </div>
                    <div className="text-sm text-gray-400">
                      out of 100 points
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="space-y-4">
                    {submission.feedback.comments.map((comment, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="p-1 rounded-full bg-blue-500/20">
                          <FileText className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-gray-300">{comment}</p>
                      </div>
                    ))}
                  </div>

                  {/* Corrections */}
                  {submission.feedback.corrections.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Corrections</h4>
                      <ul className="space-y-2">
                        {submission.feedback.corrections.map((correction, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="p-1 rounded-full bg-red-500/20">
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            </div>
                            <p className="text-gray-300">{correction}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {submission.feedback.suggestions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Suggestions</h4>
                      <ul className="space-y-2">
                        {submission.feedback.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <div className="p-1 rounded-full bg-green-500/20">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            </div>
                            <p className="text-gray-300">{suggestion}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}