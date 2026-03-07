import { Volume2, User, AlertTriangle, Play, Volume } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
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
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-sm text-gray-800">{finding.name}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {finding.confidence}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{finding.description}</p>
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
          <div className="flex items-center gap-2">
            <Volume className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>Live Transcript & Translation</CardTitle>
              <CardDescription>Spanish → English</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button variant="ghost" size="sm">
              <Play className="w-4 h-4" />
            </Button>
            <div className="flex-1 h-1 bg-gray-200 rounded-full">
              <div className="h-full w-1/3 bg-blue-600 rounded-full"></div>
            </div>
            <span className="text-xs text-gray-600">02:14</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 max-h-80 overflow-y-auto">
          {transcript.map((entry, idx) => (
            <div key={idx} className="border-b border-gray-200 pb-4 last:border-b-0">
              <p className="text-xs text-gray-500 mb-2">{entry.time}</p>

              {/* Original */}
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-600 mb-1">Original ({entry.originalLanguage})</p>
                <p className="text-sm text-gray-700 italic">{entry.originalText}</p>
              </div>

              {/* Translated */}
              <div>
                <p className="text-xs font-medium text-blue-600 mb-1">Translation ({entry.translatedLanguage})</p>
                <p className="text-sm text-blue-700">{entry.translatedText}</p>
              </div>

              {/* Keywords */}
              {entry.keywords && entry.keywords.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.keywords.map((keyword) => (
                    <Badge key={keyword} variant="warning" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}