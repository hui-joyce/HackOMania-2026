import { Volume2, User, AlertTriangle, Play, Pause, Volume, Music, Zap, Radio, Waves, FileText } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { AcousticFinding, ResidentContext, TriageSuggestion, TranscriptEntry } from '../types';

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
      
      {/* Header with Live Indicator */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <h2 className="text-2xl font-bold text-gray-800">Active Call Analysis</h2>
      </div>

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
              <Badge variant="warning" className="text-xs font-bold px-2 py-1">
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
                {triageSuggestion.units.map((unit) => (
                  <Badge key={unit} variant="secondary" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-100">
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