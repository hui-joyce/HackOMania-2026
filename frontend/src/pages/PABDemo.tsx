import { useState, useEffect, useRef } from 'react';

type DeviceState = 'idle' | 'announcement' | 'recording' | 'processing' | 'completed' | 'cancelled';

export function PABDemo() {
  const [state, setState] = useState<DeviceState>('idle');
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef<number | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Speech synthesis helper
  const speak = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        speechSynthRef.current = utterance;
        
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const float32Array = audioBuffer.getChannelData(0); // Get first channel

          // POST to backend
          const response = await fetch('http://localhost:3000/api/audio/transcription', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audio: Array.from(float32Array) }),
          });

          if (!response.ok) {
            console.error('Failed to upload audio:', await response.text());
          } else {
            const result = await response.json();
            console.log('Audio analysis result:', result);
          }
        } catch (err) {
          console.error('Error processing audio:', err);
        }
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Finish recording and play completion message
  const finishRecording = async () => {
    stopRecording();
    setState('processing');
    
    await speak("Your message has been recorded and sent to the emergency hotline. Help will be with you shortly.");
    
    setState('completed');
  };

  // Handle emergency button press
  const handleEmergencyPress = async () => {
    if (state !== 'idle') return;

    setState('announcement');
    await speak("Emergency alert received. Your 10 second recording will start now. Please describe your situation.");
    
    // Start recording
    setState('recording');
    setCountdown(10);
    await startRecording();
    
    // Start countdown timer
    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          finishRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle cancel
  const handleCancel = () => {
    stopRecording();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    setState('cancelled');
    setCountdown(10);
    
    // Return to idle after 3 seconds
    setTimeout(() => {
      setState('idle');
    }, 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Get display text based on state
  const getDisplayText = () => {
    switch (state) {
      case 'idle':
        return 'Press the button if you need help.';
      case 'announcement':
        return 'Emergency alert activated...';
      case 'recording':
        return `Recording your message... (${countdown}s)`;
      case 'processing':
        return 'Processing your message...';
      case 'completed':
        return 'Your message has been sent.';
      case 'cancelled':
        return 'Alert cancelled.';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Device Container */}
        <div className="bg-gray-300 rounded-[2.5rem] shadow-2xl p-8 border-8 border-gray-400 relative">
          {/* Device Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Personal Alert Button
            </h1>
            <p className="text-base text-gray-600">Emergency Response Device</p>
          </div>

          {/* Main Content Area */}
          <div className="bg-white rounded-2xl p-8 shadow-inner">
            {/* Status Display */}
            <div className="text-center mb-8">
              <p className="text-xl font-semibold text-gray-700 min-h-[3rem] flex items-center justify-center px-4">
                {getDisplayText()}
              </p>
              
              {/* Recording Indicator */}
              {state === 'recording' && (
                <div className="flex items-center justify-center mt-4 gap-3">
                  <div className="relative">
                    <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="absolute inset-0 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <svg
                    className="w-10 h-10 text-red-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </div>
              )}

              {/* Completed Checkmark */}
              {state === 'completed' && (
                <div className="flex items-center justify-center mt-4">
                  <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel Button - Corner positioned */}
            <div className="flex justify-end mb-6 px-4">
              <button
                onClick={handleCancel}
                disabled={state === 'idle' || state === 'cancelled'}
                className={`
                  w-20 h-16 rounded-lg font-bold text-xs
                  bg-gradient-to-b from-blue-400 to-blue-600 text-white
                  border-2 border-blue-700 shadow-lg
                  flex flex-col items-center justify-center gap-1
                  transition-all duration-200
                  ${
                    state !== 'idle' && state !== 'cancelled'
                      ? 'hover:from-blue-500 hover:to-blue-700 active:translate-y-0.5 cursor-pointer'
                      : 'cursor-not-allowed opacity-50'
                  }
                `}
              >
                <span>Cancel</span>
                <span>Alert</span>
              </button>
            </div>

            {/* Emergency Button */}
            <div className="flex items-center justify-center mb-6">
              <button
                onClick={handleEmergencyPress}
                disabled={state !== 'idle'}
                className={`
                  w-52 h-52 rounded-full font-bold text-2xl
                  transition-all duration-200
                  ${
                    state === 'idle'
                      ? 'bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 active:scale-95 cursor-pointer'
                      : 'bg-gray-400 cursor-not-allowed'
                  }
                  text-white
                  shadow-lg
                `}
              >
                <span className="drop-shadow-lg">
                  Press for<br />Help
                </span>
              </button>
            </div>

            {/* Speaker Grill Design */}
            <div className="flex justify-center gap-1.5 pt-4 border-t border-gray-200">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="w-1.5 h-6 bg-gray-300 rounded-full"></div>
              ))}
            </div>
          </div>

          {/* Device Info */}
          <div className="text-center text-gray-600 text-xs mt-4">
            <p>Model: PAB-2026 | Status: {state === 'idle' ? 'Ready' : 'Active'}</p>
          </div>
        </div>

        {/* Demo Instructions */}
        <div className="mt-6 bg-blue-50 rounded-xl shadow-lg p-5 border border-blue-200">
          <h3 className="text-base font-bold text-blue-900 mb-2">📋 Demo Instructions</h3>
          <ul className="space-y-1.5 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>Press the large red button to trigger an emergency alert</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>Listen to the voice announcement (ensure your sound is on)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>Watch the 10-second recording simulation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">4.</span>
              <span>Use the blue side button to cancel the alert at any time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
