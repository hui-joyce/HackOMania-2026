import { Volume2, User, AlertTriangle, Play, Volume, Music, Zap, Radio, Waves } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { AcousticFinding, PatientContext, TriageSuggestion, TranscriptEntry } from '../types';

interface ActiveCallAnalysisProps {
  acousticFindings: AcousticFinding[];
  patientContext: PatientContext;
  triageSuggestion: TriageSuggestion;
  transcript: TranscriptEntry[];
}

export function ActiveCallAnalysis({
  acousticFindings,
  patientContext,
  triageSuggestion,
  transcript,
}: ActiveCallAnalysisProps) {
  const getAcousticIcon = (findingName: string) => {
    const name = findingName.toLowerCase();
    if (name.includes('impact') || name.includes('fall')) return <Radio className="w-4 h-4" />;
    if (name.includes('breathing') || name.includes('breath')) return <Waves className="w-4 h-4" />;
    if (name.includes('glass') || name.includes('break') || name.includes('noise')) return <Music className="w-4 h-4" />;
    if (name.includes('fire') || name.includes('smoke')) return <Zap className="w-4 h-4" />;
    return <Volume2 className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
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

      {/* Live Transcript Section - Reference Layout */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume className="w-5 h-5 text-blue-600" />
              <div>
                <CardTitle className="text-base">LIVE TRANSCRIPT & TRANSLATION (SPANISH → ENGLISH)</CardTitle>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Play className="w-5 h-5 text-blue-600" />
              </Button>
              <div className="flex items-center gap-2 w-32">
                <div className="flex-1 h-1 bg-gray-200 rounded-full">
                  <div className="h-full w-1/3 bg-blue-600 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-600">02:14</span>
              </div>
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