import { useState, useEffect, useRef } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { transcribeAnswer, submitAIAnswers } from '../services/aiService';
import { fetchResidents } from '../services/firebaseService';
import { Resident } from '../types';

type DeviceState = 'idle' | 'announcement' | 'recording' | 'processing' | 'completed' | 'cancelled' | 'ai-intervention';

export function PABDemo() {
  const [state, setState] = useState<DeviceState>('idle');
  const [countdown, setCountdown] = useState(10);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState('');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const timerRef = useRef<number | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const aiStopRecordingRef = useRef<(() => void) | null>(null);
  const recordingResidentIdRef = useRef<string | null>(null);

  // Map language codes to BCP-47 locale tags for TTS
  const getLangTag = (lang: string): string => {
    const map: Record<string, string> = {
      'en': 'en-US', 'english': 'en-US',
      'zh': 'zh-CN', 'chinese': 'zh-CN', 'mandarin': 'zh-CN',
      'ms': 'ms-MY', 'malay': 'ms-MY',
      'ta': 'ta-IN', 'tamil': 'ta-IN',
      'ja': 'ja-JP', 'japanese': 'ja-JP',
      'ko': 'ko-KR', 'korean': 'ko-KR',
      'hi': 'hi-IN', 'hindi': 'hi-IN',
    };
    return map[lang.toLowerCase()] || lang;
  }; 

  // Speech synthesis helper
  const speak = (text: string, lang?: string): Promise<void> => {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (lang) utterance.lang = getLangTag(lang);
        utterance.rate = 0.85;
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

          // POST to backend using the captured resident ID from when recording started
          const residentIdToSend = recordingResidentIdRef.current || 'PT001';
          console.log(`[PAB] Uploading audio for resident: ${residentIdToSend}`);
          const response = await fetch(`${import.meta.env.VITE_API_URL}/audio/transcription`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              audio: Array.from(float32Array),
              residentId: residentIdToSend
            }),
          });

          if (!response.ok) {
            console.error('Failed to upload audio:', await response.text());
          } else {
            const result = await response.json();
            console.log('Audio analysis result:', result);
            if (result.caseId) {
              setCaseId(result.caseId);
            }
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
    
    // Select new random resident for next demo after 2 seconds
    setTimeout(() => {
      selectRandomResident();
    }, 2000);
  };

  // Handle emergency button press
  const handleEmergencyPress = async () => {
    if (state !== 'idle') return;

    // Capture the current resident ID before recording starts
    recordingResidentIdRef.current = selectedResident?.id || null;
    console.log(`[PAB] Starting recording for resident: ${recordingResidentIdRef.current} (${selectedResident?.name})`);

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
      selectRandomResident(); // Select new random resident for next demo
    }, 3000);
  };

  // Select random resident from the list
  const selectRandomResident = () => {
    if (residents.length > 0) {
      const randomIndex = Math.floor(Math.random() * residents.length);
      setSelectedResident(residents[randomIndex]);
    }
  };

  // Fetch residents on mount
  useEffect(() => {
    const loadResidents = async () => {
      try {
        setLoadingResidents(true);
        const fetchedResidents = await fetchResidents();
        setResidents(fetchedResidents);
        
        // Select random resident on initial load
        if (fetchedResidents.length > 0) {
          const randomIndex = Math.floor(Math.random() * fetchedResidents.length);
          setSelectedResident(fetchedResidents[randomIndex]);
        }
      } catch (error) {
        console.error('Error loading residents:', error);
      } finally {
        setLoadingResidents(false);
      }
    };

    loadResidents();
  }, []);

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

  // Record audio for 10 seconds (or until user presses stop), return Float32Array
  const recordAiAudio = (): Promise<Float32Array> => {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          aiStopRecordingRef.current = null;
          clearTimeout(autoStopTimer);
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            resolve(audioBuffer.getChannelData(0));
          } catch (err) {
            reject(err);
          }
        };

        mediaRecorder.start();

        // Auto-stop after 10 seconds
        const autoStopTimer = setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        }, 10000);

        aiStopRecordingRef.current = () => {
          clearTimeout(autoStopTimer);
          if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        };
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleStopAiRecording = () => {
    if (aiStopRecordingRef.current) {
      aiStopRecordingRef.current();
    }
  };

  // Run the AI Q&A flow on the caller's device
  const runCallerQA = async (questions: string[], language: string, forCaseId: string) => {
    setState('ai-intervention');
    const answers: string[] = new Array(questions.length).fill('');

    for (let i = 0; i < questions.length; i++) {
      // Speak question
      setAiStatus(`Speaking question ${i + 1}...`);
      await speak(questions[i], language);

      // Record answer
      setAiStatus(`Recording your answer for question ${i + 1}... Press the red button to stop.`);
      let audioData: Float32Array;
      try {
        audioData = await recordAiAudio();
      } catch {
        answers[i] = '(Recording failed)';
        continue;
      }

      // Transcribe
      setAiStatus(`Processing your answer...`);
      try {
        const result = await transcribeAnswer(i, Array.from(audioData));
        answers[i] = result.translatedText || result.originalText || '(No speech detected)';
      } catch {
        answers[i] = '(Transcription failed)';
      }
    }

    // Submit answers
    setAiStatus('Sending your answers...');
    try {
      const thankYouMessages: Record<string, string> = {
        'en': 'Thank you. Your answers are being reviewed now. Help will be with you shortly.',
        'english': 'Thank you. Your answers are being reviewed now. Help will be with you shortly.',
        'zh': '谢谢您。我们正在审核您的回答。援助很快就会到来。',
        'chinese': '谢谢您。我们正在审核您的回答。援助很快就会到来。',
        'mandarin': '谢谢您。我们正在审核您的回答。援助很快就会到来。',
        'ms': 'Terima kasih. Jawapan anda sedang disemak. Bantuan akan tiba tidak lama lagi.',
        'malay': 'Terima kasih. Jawapan anda sedang disemak. Bantuan akan tiba tidak lama lagi.',
        'ta': 'நன்றி. உங்கள் பதில்கள் மதிப்பாய்வு செய்யப்படுகின்றன. உதவி விரைவில் வரும்.',
        'tamil': 'நன்றி. உங்கள் பதில்கள் மதிப்பாய்வு செய்யப்படுகின்றன. உதவி விரைவில் வரும்.',
      };
      const thankYou = thankYouMessages[language.toLowerCase()] || thankYouMessages['en'];
      await speak(thankYou, language);
      await submitAIAnswers(forCaseId, questions, answers);
      setAiStatus('Your answers have been sent. Help is on the way.');
    } catch {
      setAiStatus('Failed to send answers. Help has still been notified.');
    }
  };

  // Listen for AI intervention from dispatcher
  useEffect(() => {
    if (!caseId || state !== 'completed') return;

    const q = query(
      collection(db, 'aiInteractions'),
      where('caseId', '==', caseId),
      where('status', '==', 'AI_ACTIVE')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      const doc = snapshot.docs[0];
      const data = doc.data();
      const questions = typeof data.questions === 'string'
        ? data.questions.split('\n')
            .map((l: string) => l.replace(/^\d+[\.\)]\s*[-]?\s*/, '').trim())
            .filter((l: string) => l.length > 0 && l.endsWith('?'))
        : data.questions || [];

      if (questions.length > 0) {
        unsubscribe(); // Stop listening once we start Q&A
        runCallerQA(questions, data.language || 'en', caseId);
      }
    });

    return () => unsubscribe();
  }, [caseId, state]);

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
        return caseId ? `Your message has been sent. (Case: ${caseId})` : 'Your message has been sent.';
      case 'ai-intervention':
        return aiStatus || 'AI follow-up in progress...';
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
            
            {/* Assigned Resident Indicator */}
            {loadingResidents ? (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg border border-gray-300">
                <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-500">Loading resident...</span>
              </div>
            ) : selectedResident ? (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2" style={{ backgroundColor: '#EBF4FF', borderColor: '#137FEC' }}>
                <svg className="w-5 h-5" style={{ color: '#137FEC' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="text-left">
                  <div className="text-xs font-medium" style={{ color: '#137FEC' }}>Assigned Resident</div>
                  <div className="text-sm font-bold text-gray-800">{selectedResident.name} ({selectedResident.id})</div>
                </div>
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg border-2 border-red-300">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm font-medium text-red-700">No resident assigned</span>
              </div>
            )}
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

              {/* AI Intervention - Recording indicator with stop button */}
              {state === 'ai-intervention' && aiStatus.includes('Recording') && (
                <div className="flex flex-col items-center justify-center mt-4 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-6 h-6 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                  </div>
                  <button
                    onClick={handleStopAiRecording}
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 active:scale-95 text-white font-bold text-sm shadow-lg animate-pulse transition-all"
                  >
                    Stop
                  </button>
                </div>
              )}

              {/* AI Intervention - Speaking/Processing indicator */}
              {state === 'ai-intervention' && !aiStatus.includes('Recording') && (
                <div className="flex items-center justify-center mt-4">
                  <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
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
