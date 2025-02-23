import { useState, useEffect } from 'react';
import { useOpenAIStore } from '../store/openai';
import { Edit2, Save, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface Concept {
  title: string;
  description: string;
  examples: string[];
}

interface Section {
  title: string;
  concepts: Concept[];
}

interface KeyConceptsProps {
  text: string;
}

export function KeyConcepts({ text }: KeyConceptsProps) {
  const [sections, setSections] = useState<Section[]>([{
    title: 'Loading...',
    concepts: []
  }]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingConcept, setEditingConcept] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const service = useOpenAIStore((state) => state.service);

  useEffect(() => {
    if (!text || !service) return;
    
    async function generateConcepts() {
      setLoading(true);
      try {
        const prompt = `Analyze the text and create a structured outline of key concepts.
        Format the response as JSON with the following structure:
        {
          "sections": [
            {
              "title": "Section Title",
              "concepts": [
                {
                  "title": "Concept Title",
                  "description": "Clear explanation of the concept",
                  "examples": ["Example 1", "Example 2"]
                }
              ]
            }
          ]
        }
        
        Group related concepts into logical sections. Include practical examples where possible.
        
        Text: ${text}`;

        const result = await service?.generateResponse(prompt);
        const parsed = JSON.parse(result);
        setSections(parsed.sections);
        setExpandedSections([0]); // Expand first section by default
      } catch (error) {
        console.error('Failed to generate concepts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    generateConcepts();
  }, [text, service]);

  const toggleSection = (index: number) => {
    setExpandedSections(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleEdit = (sectionIndex: number, conceptIndex: number) => {
    setEditingSection(sectionIndex);
    setEditingConcept(conceptIndex);
    setEditMode(true);
  };

  const handleSave = async (sectionIndex: number, conceptIndex: number) => {
    if (!service || !sections[sectionIndex]?.concepts[conceptIndex]) return;

    const concept = sections[sectionIndex].concepts[conceptIndex];
    setLoading(true);

    try {
      const prompt = `Review and improve this concept explanation while maintaining accuracy:
      
      ${JSON.stringify(concept, null, 2)}
      
      Return the improved version in the same JSON format.`;

      const result = await service.generateResponse(prompt);
      if (!result) return;
      
      const improved = JSON.parse(result);

      setSections(prev => {
        const updated = [...prev];
        updated[sectionIndex].concepts[conceptIndex] = improved;
        return updated;
      });
    } catch (error) {
      console.error('Failed to improve concept:', error);
    } finally {
      setLoading(false);
      setEditMode(false);
      setEditingSection(null);
      setEditingConcept(null);
    }
  };

  const exportConcepts = () => {
    const content = sections.map(section => `
# ${section.title}

${section.concepts.map(concept => `
## ${concept.title}

${concept.description}

Examples:
${concept.examples.map(ex => `- ${ex}`).join('\n')}
`).join('\n')}
`).join('\n');

    const blob = new Blob([content.trim()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'key-concepts.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#2C2C2E] rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Key Concepts</h2>
        <div className="flex gap-2">
          <button
            onClick={exportConcepts}
            className="p-2 hover:bg-[#3A3A3C] rounded-lg transition-colors"
            title="Export as Markdown"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-gray-400">Extracting key concepts...</div>
        </div>
      ) : sections.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <div className="text-gray-400">Upload a document to extract key concepts.</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {sections?.map((section, sectionIndex) => (
            <div key={sectionIndex} className="bg-[#3A3A3C] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(sectionIndex)}
                className="w-full p-4 flex items-center justify-between hover:bg-[#4A4A4C] transition-colors"
              >
                <h3 className="font-medium">{section.title}</h3>
                {expandedSections.includes(sectionIndex) ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </button>

              {expandedSections.includes(sectionIndex) && (
                <div className="p-4 space-y-4">
                  {section.concepts?.map((concept, conceptIndex) => (
                    <div key={conceptIndex} className="bg-[#2C2C2E] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{concept.title}</h4>
                        {editMode && editingSection === sectionIndex && editingConcept === conceptIndex ? (
                          <button
                            onClick={() => handleSave(sectionIndex, conceptIndex)}
                            className="p-2 hover:bg-[#3A3A3C] rounded-lg transition-colors"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEdit(sectionIndex, conceptIndex)}
                            className="p-2 hover:bg-[#3A3A3C] rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-gray-400 mb-4">{concept.description}</p>

                      {concept.examples?.length > 0 && (
                        <div>
                          <h5 className="font-medium mb-2">Examples:</h5>
                          <ul className="list-disc list-inside text-gray-400">
                            {concept.examples?.map((example, i) => (
                              <li key={i}>{example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}