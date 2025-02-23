import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, AlertCircle, FileText, Mic, StopCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [mediaRecorder, setMediaRecorder] = React.useState<MediaRecorder | null>(null);
  const [audioStream, setAudioStream] = React.useState<MediaStream | null>(null);
  const [audioChunks, setAudioChunks] = React.useState<Blob[]>([]);

  const startRecording = async () => {
    try {
      // Reset any previous state
      setError(null);
      setAudioChunks([]);

      // First check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Check if any audio input devices are available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioInput = devices.some(device => device.kind === 'audioinput');
      
      if (!hasAudioInput) {
        throw new Error('No microphone found. Please connect a microphone and try again.');
      }

      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      setAudioStream(stream);

      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          setAudioChunks(chunks => [...chunks, e.data]);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'lecture-recording.webm', { type: 'audio/webm' });
        onFileSelect(audioFile);
        setAudioChunks([]);
        // Stop all tracks in the stream
        if (audioStream) {
          audioStream.getTracks().forEach(track => track.stop());
          setAudioStream(null);
        }
      };

      // Start recording
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);

    } catch (err) {
      let errorMessage = 'Failed to start recording';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone access denied. Please allow microphone access in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Could not access microphone. It may be in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Microphone does not meet requirements. Please try a different microphone.';
        } else {
          errorMessage = err.message;
        }
      }
      
      console.error('Recording error:', err);
      setError(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      // Stop all tracks in the stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
    }
  };

  // Cleanup audio stream when component unmounts
  React.useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioStream]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('audio/'))) {
      setError(null);
      onFileSelect(file);
    } else {
      setError('Please upload a PDF file or audio recording');
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.aac']
    },
    multiple: false
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {/* PDF Upload */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : error ? 'border-destructive' : 'border-muted hover:border-primary'}`}
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileText className={`w-8 h-8 ${error ? 'text-destructive' : 'text-muted-foreground'}`} />
            <Upload className={`w-8 h-8 ${error ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
          <p className={error ? 'text-destructive' : 'text-muted-foreground'}>
            {isDragActive ? 'Drop your PDF here' : 'Upload lecture notes or study materials'}
          </p>
          <p className="text-sm text-muted-foreground/75 mt-2">
            Supports PDF files
          </p>
        </div>

        {/* Audio Upload and Recording */}
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${error ? 'border-destructive' : 'border-muted'}"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-3">
              <Mic className={`w-8 h-8 ${error ? 'text-destructive' : 'text-muted-foreground'}`} />
              {isRecording && (
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>
            
            <div className="space-y-4">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white flex items-center gap-2'
                    : 'bg-[#3A3A3C] hover:bg-[#4A4A4C] flex items-center gap-2'
                }`}
              >
                {isRecording ? (
                  <>
                    <StopCircle className="w-4 h-4" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </>
                )}
              </button>
              
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <p className={error ? 'text-destructive' : 'text-muted-foreground'}>
                  Or drop audio files here
                </p>
                <p className="text-sm text-muted-foreground/75 mt-2">
                  Supports MP3, WAV, M4A, AAC
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive mb-4">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}
    </>
  );
}