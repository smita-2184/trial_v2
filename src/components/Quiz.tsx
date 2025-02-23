import React, { useState, useEffect } from 'react';
import { useOpenAIStore } from '../store/openai';
import { Check, X, ChevronRight, ChevronLeft, RotateCcw } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface QuizProps {
  text: string;
}

export function Quiz({ text }: QuizProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const service = useOpenAIStore((state) => state.service);

  useEffect(() => {
    if (!text || !service) return;
    
    async function generateQuiz() {
      setLoading(true);
      try {
        const prompt = `Generate a quiz with 5 multiple choice questions based on this text. Format as JSON:
        {
          "questions": [
            {
              "question": "Question text",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correctAnswer": 0,
              "explanation": "Why this answer is correct"
            }
          ]
        }
        
        Text: ${text}`;

        const result = await service.generateResponse(prompt);
        const parsedQuiz = JSON.parse(result);
        setQuestions(parsedQuiz.questions);
      } catch (error) {
        console.error('Failed to generate quiz:', error);
      } finally {
        setLoading(false);
      }
    }
    
    generateQuiz();
  }, [text, service]);

  const handleAnswer = (answerIndex: number) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answerIndex);
    setIsAnswered(true);
    
    if (answerIndex === questions[currentQuestion].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
  };

  return (
    <div className="h-full flex flex-col p-4 bg-[#2C2C2E] rounded-lg">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Generating quiz questions...</div>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Upload a document to generate a quiz.</div>
        </div>
      ) : (
        <>
          {/* Progress and Score */}
          <div className="flex items-center justify-between mb-6 p-4 bg-[#3A3A3C] rounded-lg">
            <div className="text-sm text-gray-400">
              Question {currentQuestion + 1} of {questions.length}
            </div>
            <div className="text-sm font-medium">
              Score: {score}/{questions.length}
            </div>
          </div>

          {/* Question */}
          <div className="flex-1">
            <h3 className="text-lg font-medium mb-4">
              {questions[currentQuestion].question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {questions[currentQuestion].options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    isAnswered
                      ? index === questions[currentQuestion].correctAnswer
                        ? 'bg-green-500/20 border-green-500'
                        : index === selectedAnswer
                        ? 'bg-red-500/20 border-red-500'
                        : 'bg-[#2C2C2E] opacity-50'
                      : 'bg-[#2C2C2E] hover:bg-[#3A3A3C]'
                  } ${
                    selectedAnswer === index ? 'border-2' : 'border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {isAnswered && (
                      index === questions[currentQuestion].correctAnswer ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : index === selectedAnswer ? (
                        <X className="w-5 h-5 text-red-500" />
                      ) : null
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Explanation */}
            {isAnswered && (
              <div className="mt-4 p-4 bg-[#3A3A3C] rounded-lg">
                <h4 className="font-medium mb-2">Explanation</h4>
                <p className="text-gray-400">
                  {questions[currentQuestion].explanation}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
              className="p-2 rounded-lg hover:bg-[#3A3A3C] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={resetQuiz}
              className="flex items-center gap-2 px-4 py-2 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C]"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Quiz
            </button>

            <button
              onClick={nextQuestion}
              disabled={currentQuestion === questions.length - 1}
              className="p-2 rounded-lg hover:bg-[#3A3A3C] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}