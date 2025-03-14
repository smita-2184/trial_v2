import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { FileUpload } from "./components/FileUpload";
import { BookOpen, Brain, MessageSquare, Calculator, Library, FileText, Upload, X, PresentationIcon, Activity } from "lucide-react";
import { Chat } from './components/Chat';
import { Quiz } from './components/Quiz';
import { Flashcards } from './components/Flashcards';
import { Notes } from './components/Notes';
import { Summary } from './components/Summary';
import { KeyConcepts } from './components/KeyConcepts';
import { PDFViewer } from './components/PDFViewer';
import { PresentationMaker } from './components/PresentationMaker';
import { useOpenAIStore } from './store/openai';
import { useResizable } from './hooks/useResizable';
import { Login } from './components/Login';
import { useAuthStore } from './store/auth';

function App() {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [showUpload, setShowUpload] = React.useState(true);
  const [currentTab, setCurrentTab] = React.useState('study-overview');
  const [studySubTab, setStudySubTab] = React.useState('summary');
  const [toolsSubTab, setToolsSubTab] = React.useState('notes');
  const [isServiceInitialized, setIsServiceInitialized] = React.useState(false);

  const [showLeftPanel, setShowLeftPanel] = React.useState(true);
  const [leftPanelWidth, setLeftPanelWidth] = React.useState(350);
  const [rightPanelWidth, setRightPanelWidth] = React.useState(window.innerWidth - (showLeftPanel ? 350 : 0) - 32); // 32px for padding
  const [pdfText, setPdfText] = React.useState<string>('');
  const leftResizeRef = React.useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { initializeService } = useOpenAIStore();
  const { user, loading } = useAuthStore();

  React.useEffect(() => {
    initializeService().then(() => {
      setIsServiceInitialized(true);
    });
  }, [initializeService]);

  // Wait for service to be initialized before showing chat
  React.useEffect(() => {
    if (!isServiceInitialized && currentTab === 'chat') {
      setCurrentTab('study-overview');
    }
  }, [isServiceInitialized, currentTab]);

  React.useEffect(() => {
    if (selectedFile) {
      setShowUpload(false);
    }
  }, [selectedFile]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setShowUpload(false);
    setIsProcessing(true);
    setPdfText(''); // Clear previous text
  };

  const handleTextExtracted = (text: string) => {
    setPdfText(text);
    setIsProcessing(false);
  };
  const { startResize: startLeftResize } = useResizable({
    resizeRef: leftResizeRef,
    minWidth: 300,
    maxWidth: window.innerWidth - 500,
    onResize: (width) => {
      if (!showLeftPanel) return;
      setLeftPanelWidth(width);
      setRightPanelWidth(window.innerWidth - width - 32);
    },
  });

  React.useEffect(() => {
    const handleResize = () => {
      const maxLeftWidth = window.innerWidth - 500;
      if (leftPanelWidth > maxLeftWidth) {
        setLeftPanelWidth(showLeftPanel ? maxLeftWidth : 0);
      }
      setRightPanelWidth(window.innerWidth - (showLeftPanel ? leftPanelWidth : 0) - 32);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [leftPanelWidth, showLeftPanel]);

  const toggleLeftPanel = () => {
    setShowLeftPanel(prev => !prev);
    setRightPanelWidth(window.innerWidth - (showLeftPanel ? 0 : leftPanelWidth) - 32);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#1C1C1E] text-white">
      {/* Header */}
      <div className="flex-none bg-[#2C2C2E] border-b border-[#3A3A3C]">
        <div className="px-6 py-4">
          <h1 className="text-xl font-semibold">Study Assistant</h1>
        </div>
      </div>
      
      {/* Main Content */}
      <Tabs
        defaultValue="study-overview" 
        value={currentTab}
        onValueChange={setCurrentTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Tabs Navigation */}
        <div className="flex-none bg-[#2C2C2E] border-b border-[#3A3A3C] px-6">
          <TabsList className="w-full flex overflow-x-auto">
            {[
              { value: 'study-overview', icon: BookOpen, label: 'Study Overview' },
              { value: 'chat', icon: MessageSquare, label: 'Chat Assistant' },
              { value: 'study-tools', icon: FileText, label: 'Study Tools' },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger 
                key={value} 
                value={value}
                className="flex items-center gap-2 min-w-fit"
              >
                <Icon className="w-4 h-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Panels */}
        <div className="flex-1 bg-[#1C1C1E] overflow-hidden relative">
          {/* Subtabs Navigation */}
          <div className="bg-[#2C2C2E] border-b border-[#3A3A3C] px-6 sticky top-0 z-10">
            {currentTab === 'study-overview' && (
              <Tabs value={studySubTab} onValueChange={setStudySubTab}>
                <TabsList className="w-full flex overflow-x-auto">
                  {[
                    { value: 'summary', label: 'Summary', icon: BookOpen },
                    { value: 'key-concepts', label: 'Key Concepts', icon: Brain },
                    { value: 'quiz', label: 'Quiz', icon: Activity },
                    { value: 'flashcards', label: 'Flashcards', icon: Library }
                  ].map(({ value, label, icon: Icon }) => (
                    <TabsTrigger 
                      key={value} 
                      value={value}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            {currentTab === 'chat' && (
              <Tabs value="standard">
                <TabsList className="w-full flex overflow-x-auto">
                  {[
                    { value: 'standard', label: 'Standard Chat', icon: MessageSquare },
                  ].map(({ value, label, icon: Icon }) => (
                    <TabsTrigger 
                      key={value} 
                      value={value}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            {currentTab === 'study-tools' && (
              <Tabs value={toolsSubTab} onValueChange={setToolsSubTab}>
                <TabsList className="w-full flex overflow-x-auto">
                  {[
                    { value: 'notes', label: 'Notes', icon: FileText },
                    { value: 'presentation', label: 'Presentation', icon: PresentationIcon },
                  ].map(({ value, label, icon: Icon }) => (
                    <TabsTrigger 
                      key={value} 
                      value={value}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>
          <div className="flex gap-4 p-4 relative">
            {/* Toggle Button */}
            {!showLeftPanel && (
              <button
                onClick={toggleLeftPanel}
                className="fixed top-[180px] left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#2C2C2E] rounded-lg hover:bg-[#3A3A3C] transition-colors text-sm shadow-lg"
              >
                <Upload className="w-4 h-4" />
                Show Document Panel
              </button>
            )}

            {/* Left Panel - Document Upload and Preview */}
            {showLeftPanel && (
              <div 
                className="bg-[#2C2C2E] rounded-lg flex flex-col fixed left-4 top-[180px] bottom-4 z-30 shadow-xl border border-[#3A3A3C] overflow-hidden"
                style={{ width: leftPanelWidth }}
              >
                {showUpload ? (
                  <div className="p-4 border-b border-[#3A3A3C]">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium">Upload Document</h2>
                      <button
                        onClick={toggleLeftPanel}
                        className="p-1.5 hover:bg-[#3A3A3C] rounded-lg transition-colors"
                        title="Close document panel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <FileUpload onFileSelect={handleFileSelect} />
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-[#3A3A3C] flex items-center justify-between">
                      <h2 className="text-lg font-medium">Document Preview</h2>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowUpload(true)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#3A3A3C] rounded-lg hover:bg-[#4A4A4C] transition-colors text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Upload New
                        </button>
                        <button
                          onClick={toggleLeftPanel}
                          className="p-1.5 hover:bg-[#3A3A3C] rounded-lg transition-colors"
                          title="Close document panel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <PDFViewer 
                        file={selectedFile} 
                        onTextExtracted={handleTextExtracted} 
                      />
                    </div>
                  </div>
                )}

                {/* Resize handle */}
                <div
                  ref={leftResizeRef}
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize group z-10"
                  onMouseDown={startLeftResize}
                >
                  <div className="absolute right-0 top-0 h-full w-1 bg-transparent group-hover:bg-blue-500/20" />
                </div>
              </div>
            )}

            {/* Right Panel - Content Based on Selected Tab */}
            <div
              className={`bg-[#2C2C2E] rounded-lg transition-all duration-300 ${
                showLeftPanel ? 'ml-[380px]' : ''
              }`}
              style={{ width: showLeftPanel ? `calc(100% - ${leftPanelWidth + 32}px)` : '100%', minHeight: 'calc(100vh - 200px)' }}
            > 
              {isProcessing && (
                <div className="absolute inset-0 bg-[#2C2C2E]/80 flex items-center justify-center z-50">
                  <div className="text-white text-lg">Processing document...</div>
                </div>
              )}
              <TabsContent value="study-overview" className="h-full">
                <div className="h-full flex flex-col">
                  <Tabs value={studySubTab} onValueChange={setStudySubTab}>
                    <TabsContent value="summary" className="flex-1">
                      <Summary text={pdfText} />
                    </TabsContent>
                    <TabsContent value="key-concepts" className="flex-1">
                      <KeyConcepts text={pdfText} />
                    </TabsContent>
                    <TabsContent value="quiz" className="flex-1">
                      <Quiz text={pdfText} />
                    </TabsContent>
                    <TabsContent value="flashcards" className="flex-1">
                      <Flashcards text={pdfText} />
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
              <TabsContent value="chat" className="h-full">
                <div className="h-full flex flex-col">
                  <Tabs value="standard">
                    <TabsContent value="standard" className="h-full">
                      <Chat pdfText={pdfText} />
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
              <TabsContent value="study-tools" className="h-full">
                <div className="h-full flex flex-col">
                  <Tabs value={toolsSubTab} onValueChange={setToolsSubTab}>
                    <TabsContent value="notes" className="flex-1 mt-0">
                      <Notes text={pdfText} />
                    </TabsContent>
                    <TabsContent value="presentation" className="flex-1 mt-0">
                      <PresentationMaker />
                    </TabsContent>
                  </Tabs>
                </div>
              </TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default App;