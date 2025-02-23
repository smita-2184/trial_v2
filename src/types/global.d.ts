interface Window {
  $3Dmol: any;
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
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