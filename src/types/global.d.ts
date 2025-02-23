interface Window {
  $3Dmol: any;
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

declare module 'plotly.js' {
  interface PlotParams {
    type?: string;
    mode?: string;
    [key: string]: any;
  }
}

declare module '*.svg' {
  const content: string;
  export default content;
} 