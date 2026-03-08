import { Volume2, User, AlertTriangle, Play, Pause, Volume, Music, Zap, Radio, Waves, FileText } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { AcousticFinding, ResidentContext, TriageSuggestion, TranscriptEntry } from '../types';
import { startAIIntervention, getAIIntervention } from '../services/aiService';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface ActiveCallAnalysisProps {
  acousticFindings: AcousticFinding[];
  residentContext: ResidentContext;
  triageSuggestion: TriageSuggestion;
  transcript: TranscriptEntry[];
  audioUrl?: string; // Dynamic audio file URL from API
  audioDuration?: number; // Audio duration in seconds (optional)
  caseId?: string; // Case ID for navigation to incident report
}

export function ActiveCallAnalysis({
  acousticFindings,
  residentContext,
  triageSuggestion,
  transcript,
  audioUrl,
  audioDuration,
  caseId,
}: ActiveCallAnalysisProps) {
  const navigate = useNavigate();
  // Helper function to convert seconds to mm:ss format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Helper function to convert percentage to seconds
  const percentageToSeconds = (percentage: number, totalSeconds: number): number => {
    return (percentage / 100) * totalSeconds;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(audioUrl ? 0 : 33); // 0-100
  const [isDragging, setIsDragging] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState(audioDuration ? formatTime(audioDuration) : '02:14');

  // AI Intervention state
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<{ summary: string; urgency: string; recommendedActions: string[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiCurrentQ, setAiCurrentQ] = useState(-1);
  const [aiQStatus, setAiQStatus] = useState<('waiting' | 'speaking' | 'recording' | 'transcribing' | 'done')[]>([]);
  const [aiWaitingForCaller, setAiWaitingForCaller] = useState(false);

  // Extract language pair from transcript (first entry determines the pair)
  const languagePair = transcript.length > 0 
    ? `${transcript[0].originalLanguage} → ${transcript[0].translatedLanguage}`
    : 'Language Pair';

  // Generate random waveform data for visualization
  // TODO: Replace with real waveform data from audio processing (e.g., Web Audio API or backend)
  const waveformData = Array.from({ length: 100 }, () => Math.random() * 100);

  const getAcousticIcon = (findingName: string) => {
    const name = findingName.toLowerCase();
    if (name.includes('impact') || name.includes('fall')) return <Radio className="w-4 h-4" />;
    if (name.includes('breathing') || name.includes('breath')) return <Waves className="w-4 h-4" />;
    if (name.includes('glass') || name.includes('break') || name.includes('noise')) return <Music className="w-4 h-4" />;
    if (name.includes('fire') || name.includes('smoke')) return <Zap className="w-4 h-4" />;
    return <Volume2 className="w-4 h-4" />;
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error('Audio playback error:', err));
      setIsPlaying(true);
    }
  };

  const handleWaveformMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleWaveformClick(e);
  };

  const handleWaveformClick = (e: React.MouseEvent) => {
    if (!waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    setPlayProgress(Math.max(0, Math.min(100, percentage)));
    
    // Calculate total seconds (use API duration if available, otherwise use 134 for demo)
    const totalSeconds = audioDuration || 134; // 2:14 as default
    const seekSeconds = percentageToSeconds(percentage, totalSeconds);
    setCurrentTime(formatTime(seekSeconds));
    
    // Seek the audio if available
    if (audioRef.current) {
      audioRef.current.currentTime = seekSeconds;
    }
  };

    const handleAIIntervene = async () => {
    if (!caseId) return;

    try {
      setAiLoading(true);
      setShowAiPanel(true);
      setAiSummary(null);
      setAiCurrentQ(-1);
      setAiWaitingForCaller(true);
      // Detect caller's language from transcript
      const callerLang = transcript.length > 0 ? transcript[0].originalLanguage : 'en';
      const result = await startAIIntervention(caseId, callerLang);

      // Parse questions from the response text
      const questionLines = (result.questions as string)
        .split('\n')
        .map((l: string) => l.replace(/^\d+[\.\)]\s*[-]?\s*/, '').trim())
        .filter((l: string) => l.length > 0 && l.endsWith('?'));
      
      setAiQuestions(questionLines);
      setAiAnswers(new Array(questionLines.length).fill(''));
      setAiQStatus(new Array(questionLines.length).fill('waiting'));
      setAiLoading(false);

      // Q&A will now happen on the caller's PABDemo device
      // We subscribe to Firestore for live updates (handled by useEffect below)
    } catch (error) {
      alert("Failed to start AI intervention.");
      setShowAiPanel(false);
      setAiLoading(false);
      setAiWaitingForCaller(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      if (!waveformRef.current) return;
      
      const rect = waveformRef.current.getBoundingClientRect();
      const percentage = ((e.clientX - rect.left) / rect.width) * 100;
      setPlayProgress(Math.max(0, Math.min(100, percentage)));

      // Calculate total seconds and update display
      const totalSeconds = audioDuration || 134; // 2:14 as default
      const seekSeconds = percentageToSeconds(percentage, totalSeconds);
      setCurrentTime(formatTime(seekSeconds));
      
      // Seek the audio if available
      if (audioRef.current) {
        audioRef.current.currentTime = seekSeconds;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, audioDuration]);
  
  // Sync audio playback with state
  useEffect(() => {
    if (!audioRef.current) return;
    
    const updatePlayback = () => {
      const totalSeconds = audioRef.current?.duration || audioDuration || 134;
      const percentage = (audioRef.current?.currentTime || 0) / totalSeconds * 100;
      setPlayProgress(Math.max(0, Math.min(100, percentage)));
      setCurrentTime(formatTime(audioRef.current?.currentTime || 0));
    };
    
    const updateDuration = () => {
      if (audioRef.current?.duration) {
        setDuration(formatTime(audioRef.current.duration));
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setPlayProgress(0);
      setCurrentTime('00:00');
    };
    
    const audio = audioRef.current;
    audio.addEventListener('timeupdate', updatePlayback);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updatePlayback);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioDuration]);

  // Load existing intervention from Firebase on mount / case change
  useEffect(() => {
    // Reset AI state when switching cases
    setShowAiPanel(false);
    setAiQuestions([]);
    setAiAnswers([]);
    setAiSummary(null);
    setAiQStatus([]);
    setAiCurrentQ(-1);
    setAiLoading(false);
    setAiWaitingForCaller(false);

    if (!caseId) return;
    getAIIntervention(caseId).then((data) => {
      if (!data || !data.found) return;

      // Parse questions
      const questionLines = typeof data.questions === 'string'
        ? (data.questions as string)
            .split('\n')
            .map((l: string) => l.replace(/^\d+[\.\)]\s*[-]?\s*/, '').trim())
            .filter((l: string) => l.length > 0 && l.endsWith('?'))
        : (data.questions as string[]) || [];

      setAiQuestions(questionLines);
      setShowAiPanel(true);

      if (data.status === 'COMPLETED' && data.summary) {
        setAiAnswers(data.answers || new Array(questionLines.length).fill(''));
        setAiQStatus(new Array(questionLines.length).fill('done'));
        setAiSummary({
          summary: data.summary,
          urgency: data.urgency,
          recommendedActions: data.recommendedActions || [],
        });
      } else {
        setAiAnswers(data.answers || new Array(questionLines.length).fill(''));
        setAiQStatus(new Array(questionLines.length).fill('waiting'));
        setAiWaitingForCaller(true);
      }
    });
  }, [caseId]);

  // Subscribe to Firestore for live updates from the caller's Q&A
  useEffect(() => {
    if (!caseId || !showAiPanel) return;

    const q = query(
      collection(db, 'aiInteractions'),
      where('caseId', '==', caseId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      const doc = snapshot.docs[0];
      const data = doc.data();

      // Parse questions if not already set
      if (aiQuestions.length === 0 && data.questions) {
        const questionLines = typeof data.questions === 'string'
          ? (data.questions as string)
              .split('\n')
              .map((l: string) => l.replace(/^\d+[\.\)]\s*[-]?\s*/, '').trim())
              .filter((l: string) => l.length > 0 && l.endsWith('?'))
          : (data.questions as string[]) || [];
        setAiQuestions(questionLines);
      }

      if (data.status === 'COMPLETED') {
        setAiWaitingForCaller(false);
        if (data.answers) {
          setAiAnswers(data.answers);
          setAiQStatus(new Array(data.answers.length).fill('done'));
        }
        if (data.summary) {
          setAiSummary({
            summary: data.summary,
            urgency: data.urgency,
            recommendedActions: data.recommendedActions || [],
          });
        }
      }
    });

    return () => unsubscribe();
  }, [caseId, showAiPanel]);

  return (
    <div className="space-y-6">
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
        />
      )}
      
      {/* Header with Live Indicator + AI Intervene */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <h2 className="text-2xl font-bold text-gray-800">Active Call Analysis</h2>
        </div>

        <Button
          variant="default"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: '#137FEC' }}
          onClick={handleAIIntervene}
          disabled={aiLoading}
        >
          <Volume2 className="w-4 h-4" />
          {aiLoading ? 'GENERATING...' : 'AI VOICE INTERVENE'}
        </Button>
      </div>

      {/* AI Intervention Panel */}
      {showAiPanel && (
        <Card className="border-2" style={{ borderColor: '#137FEC' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <CardTitle>AI Voice Intervention</CardTitle>
              <Button variant="ghost" size="sm" className="ml-auto text-gray-400" onClick={() => setShowAiPanel(false)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiLoading && (
              <p className="text-sm text-gray-500 animate-pulse">Generating follow-up questions...</p>
            )}

            {!aiLoading && aiQuestions.length > 0 && !aiSummary && (
              <>
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">AI is asking the caller follow-up questions:</p>
                <div className="space-y-3">
                  {aiQuestions.map((q, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${
                      aiCurrentQ === i ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 
                      aiQStatus[i] === 'done' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">{i + 1}. {q}</span>
                        {aiQStatus[i] === 'waiting' && (
                          <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500">Pending</Badge>
                        )}
                        {aiQStatus[i] === 'done' && (
                          <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700">Answered</Badge>
                        )}
                      </div>
                      {aiAnswers[i] && (
                        <p className="text-sm text-gray-700 mt-1 pl-4 border-l-2 border-green-300 italic">"{aiAnswers[i]}"</p>
                      )}
                    </div>
                  ))}
                </div>
                {aiWaitingForCaller && !aiQStatus.some(s => s === 'done') && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-sm text-blue-700">Waiting for caller to answer on their device...</p>
                  </div>
                )}
                {aiQStatus.length > 0 && aiQStatus.every(s => s === 'done') && !aiSummary && (
                  <p className="text-sm text-gray-500 animate-pulse text-center">Generating summary...</p>
                )}
              </>
            )}

            {aiSummary && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={aiSummary.urgency === 'URGENT' ? 'destructive' : aiSummary.urgency === 'NON-URGENT' ? 'secondary' : 'warning'} className="font-bold">
                    {aiSummary.urgency}
                  </Badge>
                  <span className="text-xs text-gray-500">AI Assessment</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Summary</p>
                  <p className="text-sm text-gray-800">{aiSummary.summary}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Extra Details</p>
                  {aiQuestions.map((q, i) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <p className="text-xs font-semibold text-gray-700">Q: {q}</p>
                      <p className="text-xs text-gray-600">A: {aiAnswers[i] || 'No answer'}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Recommended Actions</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {aiSummary.recommendedActions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Three Column Layout for Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Acoustic Findings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Volume2 className="w-5 h-5" style={{ color: '#137FEC' }} />
              <CardTitle>Acoustic Findings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* 1. Speech Emotion Section */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Speech Emotion</h3>
              {acousticFindings.filter(f => f.name === 'Detected Emotion').map((finding) => (
                <div key={finding.id} className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      {getAcousticIcon(finding.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900 text-base">{finding.description}</h4>
                      <p className="text-xs text-blue-700">Primary Tone Analyzed</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-200 text-blue-800 font-bold">
                    {finding.confidence}%
                  </Badge>
                </div>
              ))}
              {acousticFindings.filter(f => f.name === 'Detected Emotion').length === 0 && (
                <p className="text-sm text-gray-500 italic">No emotion detected.</p>
              )}
            </div>

            {/* 2. Background Sounds Section */}
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Background Sounds</h3>
              <div className="space-y-2">
                {acousticFindings.filter(f => f.name !== 'Detected Emotion').map((finding) => (
                  <div key={finding.id} className="p-2 bg-gray-50 rounded border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-gray-500">
                        {getAcousticIcon(finding.name)}
                      </div>
                      <h4 className="font-semibold text-sm text-gray-700">{finding.name}</h4>
                    </div>
                    <Badge variant="outline" className="text-xs text-gray-500">
                      {finding.confidence}%
                    </Badge>
                  </div>
                ))}
                {acousticFindings.filter(f => f.name !== 'Detected Emotion').length === 0 && (
                  <p className="text-sm text-gray-500 italic">No background sounds classified.</p>
                )}
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Patient Context Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              <CardTitle>Patient Context</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Home Status */}
            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <input type="checkbox" className="w-4 h-4 mt-0.5 text-green-600" defaultChecked disabled />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700">Home Status</p>
                <p className="text-xs text-gray-600">
                  {residentContext.homeAutomation || 'Smart home activity detected'}
                </p>
              </div>
            </div>

            {/* Living Situation */}
            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <input type="checkbox" className="w-4 h-4 mt-0.5 text-green-600" defaultChecked disabled />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700">Living Situation</p>
                <p className="text-xs text-gray-600">{residentContext.livingStatus}</p>
              </div>
            </div>

            {/* Smartwatch Data */}
            {residentContext.smartwatchData && (
              <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                <input type="checkbox" className="w-4 h-4 mt-0.5 text-green-600" defaultChecked disabled />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">Smartwatch Heart Rate</p>
                  <p className="text-xs text-gray-600">
                    {residentContext.smartwatchData.heartRate} BPM ({residentContext.smartwatchData.status})
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested Triage Card */}
        <Card className="border-2 p-0 flex flex-col" style={{ borderColor: '#137FEC' }}>
          <div className="p-6 bg-blue-50 border-b border-blue-100 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <CardTitle>Suggested Triage</CardTitle>
              </div>
              <Badge variant={triageSuggestion.severity === 'URGENT' ? 'urgent' : triageSuggestion.severity === 'NON-URGENT' ? 'secondary' : 'warning'} className="text-xs font-bold px-2 py-1">
                {triageSuggestion.severity}
              </Badge>
            </div>

            <h4 className="font-bold text-lg text-gray-900 mb-2">{triageSuggestion.protocol}</h4>
            <p className="text-sm text-gray-700 font-medium mb-4">{triageSuggestion.reason}</p>

            {/* Structured Justifications */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-3">
              <h5 className="text-xs font-bold text-gray-500 uppercase">Detection Factors</h5>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Emotional Tone:</span>
                <Badge variant="secondary" className="font-bold bg-blue-100 text-blue-800 border-none">{triageSuggestion.detectedEmotion}</Badge>
              </div>

              {triageSuggestion.justificationKeywords && triageSuggestion.justificationKeywords.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500 block mb-1">Flagged Keywords:</span>
                  <div className="flex flex-wrap gap-1">
                    {triageSuggestion.justificationKeywords.map(kw => (
                      <Badge key={kw} variant="destructive" className="text-[10px] px-1.5 py-0 hidden sm:inline-flex">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-white space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-500 uppercase">Recommended Response</p>
              <div className="flex flex-wrap gap-2">
                {triageSuggestion.units.map((unit, idx) => (
                  <Badge 
                    key={`${unit}-${idx}`} 
                    variant="secondary" 
                    className="text-xs font-medium inline-flex items-center gap-1"
                    style={{ backgroundColor: '#EBF4FF', color: '#137FEC' }}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {unit}
                  </Badge>
                ))}
              </div>
            </div>

            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
              onClick={() => caseId && navigate(`/incident-report/${encodeURIComponent(caseId)}`)}
              disabled={!caseId}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </Card>

      </div>

      {/* Live Transcript Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Volume className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-base">LIVE TRANSCRIPT & TRANSLATION ({languagePair})</CardTitle>
            </div>
          </div>
            {/* Audio Player with Waveform*/}
            <div className="pt-6 border-t border-gray-200 mt-8">
              {/* Play Controls */}
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="default"
                  size="icon"
                  onClick={handlePlayPause}
                  className="rounded-full transition-colors"
                  style={{ backgroundColor: '#137FEC' }}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>
                <div className="text-sm font-semibold text-gray-700">
                  {currentTime} / {duration}
                </div>
              </div>

              {/* Waveform Visualization */}
              <div
                ref={waveformRef}
                onClick={handleWaveformClick}
                onMouseDown={handleWaveformMouseDown}
                className="relative h-16 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg border border-gray-200 cursor-pointer overflow-hidden group mb-4"
              >
                {/* Waveform Bars */}
                <div className="absolute inset-0 flex items-center justify-around gap-0.5 p-2 opacity-60">
                  {waveformData.map((val, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors ${
                        i / waveformData.length * 100 <= playProgress ? 'opacity-100' : 'opacity-50'
                      }`}
                      style={{
                        backgroundColor: i / waveformData.length * 100 <= playProgress ? '#137FEC' : '#D1D5DB',
                        height: `${Math.max(20, val)}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-1 transition-all"
                  style={{
                    backgroundColor: '#137FEC',
                    left: `${playProgress}%`,
                    boxShadow: isDragging ? '0 0 8px rgba(37, 99, 235, 0.8)' : 'none',
                  }}
                >
                  {/* Playhead Dot */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: '#137FEC' }} />
                </div>
              </div>

              {/* Audio Info */}
              <div className="flex items-center gap-2 text-xs text-gray-600 p-3 rounded-lg border" style={{ backgroundColor: '#EBF4FF', borderColor: '#137FEC' }}>
                <Volume className="w-4 h-4" style={{ color: '#137FEC' }} />
                <span>Drag the playhead to rehear specific parts of the audio. Click to jump to any point in the recording.</span>
              </div>
            </div>

        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {transcript.map((entry, idx) => (
              <div key={idx}>
                {/* Timestamp */}
                <p className="text-xs text-gray-500 mb-4 font-semibold">{entry.time}</p>

                {/* Two Column Layout (or Single if English) */}
                <div className={`grid gap-6 mb-6 ${entry.originalLanguage.toLowerCase() === 'en' || entry.originalLanguage.toLowerCase() === 'english' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  
                  {/* Original Text Panel */}
                  <div className={`pr-6 py-3 bg-gray-50 p-4 ${entry.originalLanguage.toLowerCase() === 'en' || entry.originalLanguage.toLowerCase() === 'english' ? 'rounded-lg border border-gray-200' : 'border-r border-gray-300 rounded-l-lg'}`}>
                    <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Original ({entry.originalLanguage.toLowerCase() === 'en' ? 'English' : entry.originalLanguage})
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">
                      "{entry.originalText}"
                    </p>
                  </div>

                  {/* Translated Text Panel (Hidden if English) */}
                  {entry.originalLanguage.toLowerCase() !== 'en' && entry.originalLanguage.toLowerCase() !== 'english' && (
                    <div className="bg-white rounded-r-lg p-4" style={{ borderLeft: '1px solid #137FEC' }}>
                      <p className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: '#137FEC' }}>
                        Translation ({entry.translatedLanguage})
                      </p>
                      <p className="text-sm text-blue-900 leading-relaxed font-medium">
                        "{entry.translatedText}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Keywords Alert - Full Width */}
                {entry.keywords && entry.keywords.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded px-4 py-3 mb-6">
                    <p className="text-xs font-bold text-yellow-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      AI DETECTED: {entry.keywords.join(', ')} KEYWORD
                    </p>
                  </div>
                )}

                {idx < transcript.length - 1 && <div className="border-b border-gray-200 mt-2" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}