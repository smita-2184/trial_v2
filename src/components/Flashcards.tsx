import React from 'react';
import { useOpenAIStore } from '../store/openai';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardsProps {
  text: string;
}

export function Flashcards({ text }: FlashcardsProps) {
  const [flashcards, setFlashcards] = React.useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const service = useOpenAIStore((state) => state.service);

  React.useEffect(() => {
    if (!text || loading) return;
    if (!service) {
      console.error('OpenAI service not initialized');
      return;
    }
    if (!service) {
      console.error('OpenAI service not initialized');
      return;
    }
    
    async function generateFlashcards() {
      setLoading(true);
      try {
        const prompt = `Create 5 flashcards based on this text. Format EXACTLY as follows:
Q: [Question]
A: [Concise Answer]

Rules:
1. Each Q&A pair must be separated by a blank line
2. Questions should test key concepts
3. Answers should be clear and concise
4. Use Q: and A: prefixes exactly as shown
5. Cover main ideas and important details

Text: ${text}`;

        const result = await service?.generateResponse(prompt);
        if (!result) {
          throw new Error('No response from AI service');
        }
        
        // Parse the response into flashcard objects
        const cards: Flashcard[] = result.split('\n\n')
          .filter((card: string) => 
            card.trim().startsWith('Q:') && 
            card.includes('\nA:')
          )
          .map((card: string) => {
            const parts = card.split('\nA:');
            if (parts.length !== 2) {
              console.error('Invalid flashcard format:', card);
              return null;
            }
            return {
              question: parts[0].replace('Q:', '').trim(),
              answer: parts[1].trim()
            };
          })
          .filter((card: Flashcard | null): card is Flashcard => card !== null);

        if (cards.length === 0) {
          throw new Error('No valid flashcards could be generated');
        }

        setFlashcards(cards);
      } catch (error) {
        console.error('Failed to generate flashcards:', error);
        setFlashcards([{
          question: 'Error generating flashcards',
          answer: 'Please try again or check if the document contains enough content.',
        }]);
      } finally {
        setLoading(false);
      }
    }
    
    generateFlashcards();
  }, [text, service]);

  const goToNextCard = () => {
    if (isFlipped) setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 200);
  };

  const goToPreviousCard = () => {
    if (isFlipped) setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    }, 200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Generating flashcards...</div>
      </div>
    );
  }

  if (!flashcards.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Upload a document to generate flashcards.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      <div 
        className="relative w-[400px] h-[250px] perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`absolute w-full h-full transition-transform duration-500 transform-style-preserve-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front of card */}
          <div className="absolute w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 backface-hidden shadow-xl">
            <div className="flex flex-col h-full items-center justify-center text-white">
              <div className="text-sm mb-4 opacity-80">Question</div>
              <div className="text-xl text-center font-medium">
                {flashcards[currentIndex]?.question}
              </div>
            </div>
          </div>

          {/* Back of card */}
          <div className="absolute w-full h-full bg-gradient-to-br from-purple-600 to-indigo-500 rounded-xl p-6 rotate-y-180 backface-hidden shadow-xl">
            <div className="flex flex-col h-full items-center justify-center text-white">
              <div className="text-sm mb-4 opacity-80">Answer</div>
              <div className="text-xl text-center font-medium">
                {flashcards[currentIndex]?.answer}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPreviousCard();
          }}
          className="p-2 hover:bg-[#3A3A3C] rounded-full transition-colors"
          disabled={flashcards.length <= 1}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-sm text-gray-400">
          Card {currentIndex + 1} of {flashcards.length}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNextCard();
          }}
          className="p-2 hover:bg-[#3A3A3C] rounded-full transition-colors"
          disabled={flashcards.length <= 1}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}