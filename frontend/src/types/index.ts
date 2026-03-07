export interface Patient {
  id: string;
  name: string;
  age: number;
  medicalHistory: string;
  address: string;
  phone: string;
  priority: 'PRIORITY I' | 'PRIORITY II' | 'PRIORITY III';
  latitude?: number;
  longitude?: number;
  familyContact?: string;
}

export interface AcousticFinding {
  id: string;
  name: string;
  confidence: number;
  description: string;
  icon?: string;
}

export interface PatientContext {
  homeAutomation?: string;
  livingStatus: string;
  familyStatus: string;
  smartwatchData?: {
    heartRate: number;
    status: string;
  };
}

export interface TriageSuggestion {
  protocol: string;
  severity: string;
  reason: string;
  units: string[];
  details: string[];
}

export interface TranscriptEntry {
  time: string;
  originalText: string;
  originalLanguage: string;
  translatedText: string;
  translatedLanguage: string;
  keywords?: string[];
}

export interface CaseLog {
  caseId: string;
  time: string;
  status: 'URGENT' | 'UNCERTAIN' | 'NON-URGENT';
  location: string;
  patient: string;
  primaryConcern: string;
  action?: string;
}

export interface CallAnalysis {
  id: string;
  patientId: string;
  timestamp: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  acousticFindings: AcousticFinding[];
  patientContext: PatientContext;
  triageSuggestion: TriageSuggestion;
  transcript: TranscriptEntry[];
  caseLogs?: CaseLog[];
  audioUrl?: string;
  audioDuration?: number;
}