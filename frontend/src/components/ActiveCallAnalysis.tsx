import { Volume2, User, AlertTriangle, Play, Pause, Volume, Music, Zap, Radio, Waves } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { AcousticFinding, PatientContext, TriageSuggestion, TranscriptEntry } from '../types';

interface ActiveCallAnalysisProps {
  acousticFindings: AcousticFinding[];
  patientContext: PatientContext;
  triageSuggestion: TriageSuggestion;
  transcript: TranscriptEntry[];
  audioUrl?: string; // Dynamic audio file URL from API
  audioDuration?: number; // Audio duration in seconds (optional)
}

export function ActiveCallAnalysis({
  acousticFindings,
  patientContext,
  triageSuggestion,
  transcript,
  audioUrl,
  audioDuration,
}: ActiveCallAnalysisProps) {
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
          crossOrigin="anonymous"
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
              <Volume2 className="w-5 h-5 text-blue-600" />
              <CardTitle>Acoustic Findings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {acousticFindings.map((finding) => (
              <div key={finding.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="text-blue-600 mt-0.5">
                      {getAcousticIcon(finding.name)}
                    </div>
                    <h4 className="font-semibold text-sm text-gray-800">{finding.name}</h4>
                  </div>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {finding.confidence}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 ml-6">{finding.description}</p>
              </div>
            ))}
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
                  {patientContext.homeAutomation || 'Smart home activity detected'}
                </p>
              </div>
            </div>

            {/* Living Situation */}
            <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <input type="checkbox" className="w-4 h-4 mt-0.5 text-green-600" defaultChecked disabled />
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-700">Living Situation</p>
                <p className="text-xs text-gray-600">{patientContext.livingStatus}</p>
              </div>
            </div>

            {/* Smartwatch Data */}
            {patientContext.smartwatchData && (
              <div className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                <input type="checkbox" className="w-4 h-4 mt-0.5 text-green-600" defaultChecked disabled />
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-700">Smartwatch Heart Rate</p>
                  <p className="text-xs text-gray-600">
                    {patientContext.smartwatchData.heartRate} BPM ({patientContext.smartwatchData.status})
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested Triage Card */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <CardTitle>Suggested Triage</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-2">{triageSuggestion.protocol}</h4>
              <Badge variant="warning" className="text-xs font-bold">
                {triageSuggestion.severity}
              </Badge>
            </div>

            <p className="text-xs text-gray-700">{triageSuggestion.reason}</p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">Recommended Units:</p>
              <div className="flex flex-wrap gap-2">
                {triageSuggestion.units.map((unit) => (
                  <Badge key={unit} variant="secondary" className="text-xs">
                    {unit}
                  </Badge>
                ))}
              </div>
            </div>

            <Button variant="default" size="sm" className="w-full">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
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
                  className="bg-blue-600 hover:bg-blue-700"
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
                        i / waveformData.length *100 <= playProgress ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      style={{
                        height: `${Math.max(20, val)}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-blue-600 transition-all"
                  style={{
                    left: `${playProgress}%`,
                    boxShadow: isDragging ? '0 0 8px rgba(37, 99, 235, 0.8)' : 'none',
                  }}
                >
                  {/* Playhead Dot */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full shadow-lg border-2 border-white" />
                </div>
              </div>

              {/* Audio Info */}
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                <Volume className="w-4 h-4 text-blue-600" />
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

                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Original Text Panel */}
                  <div className="border-r border-gray-300 pr-6 py-3 bg-gray-50 rounded-l-lg p-4">
                    <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">
                      Original ({entry.originalLanguage})
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">
                      "{entry.originalText}"
                    </p>
                  </div>

                  {/* Translated Text Panel */}
                  <div className="bg-blue-50 rounded-r-lg p-4 border-l border-blue-200">
                    <p className="text-xs font-bold text-blue-700 mb-3 uppercase tracking-wide">
                      Translation ({entry.translatedLanguage})
                    </p>
                    <p className="text-sm text-blue-900 leading-relaxed font-medium">
                      "{entry.translatedText}"
                    </p>
                  </div>
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