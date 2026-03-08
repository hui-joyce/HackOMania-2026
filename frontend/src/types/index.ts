export interface Resident {
  id: string;
  name: string;
  age: number;
  medicalHistory: string;
  address: string;
  phone: string;
  priority: 'PRIORITY I' | 'PRIORITY II' | 'PRIORITY III';
  status?: 'URGENT' | 'UNCERTAIN' | 'NON-URGENT';
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  familyContact?: string;
}

export interface AcousticFinding {
  id: string;
  name: string;
  confidence: number;
  description: string;
  icon?: string;
}

export interface ResidentContext {
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
  detectedEmotion?: string;
  justificationKeywords?: string[];
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
  residentId: string;
  time: string;
  status: 'URGENT' | 'UNCERTAIN' | 'NON-URGENT' | 'RESOLVED';
  location: string;
  residentName: string;
  primaryConcern: string;
  action?: string;
  aiRecommendations?: string[];
  createdAt?: string;
  timestamp?: any;
}

export interface CallAnalysis {
  id: string;
  residentId: string;
  timestamp: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PENDING';
  acousticFindings: AcousticFinding[];
  residentContext: ResidentContext;
  triageSuggestion: TriageSuggestion;
  transcript: TranscriptEntry[];
  caseLogs?: CaseLog[];
  audioUrl?: string;
  audioDuration?: number;
}