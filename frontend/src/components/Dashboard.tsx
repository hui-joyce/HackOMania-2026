import { useState } from 'react';
import { PatientInfo } from './PatientInfo';
import { ActiveCallAnalysis } from './ActiveCallAnalysis';
import { CaseLogsTable } from './CaseLogsTable';
import { DashboardHeader } from './DashboardHeader';
import { Patient, CallAnalysis, CaseLog } from '../types';

interface DashboardProps {
  initialData?: {
    patient?: Patient;
    callAnalysis?: CallAnalysis;
  };
}

export function Dashboard({ initialData }: DashboardProps) {
  // Sample data, later will be fetched from API
  const [patient] = useState<Patient>(
    initialData?.patient || {
      id: 'PT001',
      name: 'Pauline Goh',
      age: 64,
      medicalHistory: 'History: Hypertension',
      address: '3 Everton Prk',
      phone: '(+65) 9123 4567',
      priority: 'PRIORITY I',
      latitude: 1.3521,
      longitude: 103.8198,
      familyContact: 'John Goh',
    }
  );

  const [selectedCase, setSelectedCase] = useState<CaseLog | null>(null);

  const [callAnalysis] = useState<CallAnalysis>(
    initialData?.callAnalysis || {
      id: 'CALL001',
      patientId: 'PT001',
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      acousticFindings: [
        {
          id: 'af1',
          name: 'Impact Detected',
          confidence: 98,
          description: 'High confidence detection',
        },
        {
          id: 'af2',
          name: 'Heavy Breathing',
          confidence: 96,
          description: 'Irregular Pattern',
        },
        {
          id: 'af3',
          name: 'Glass Breaking',
          confidence: 87,
          description: 'Background noise',
        },
      ],
      patientContext: {
        homeAutomation: 'Home automation reported sudden fall via floor sensor',
        livingStatus: 'Patient lives alone; wife is in care facility.',
        familyStatus: 'Wife is in care facility',
        smartwatchData: {
          heartRate: 115,
          status: 'Elevated',
        },
      },
      triageSuggestion: {
        protocol: 'Code Red Protocol',
        severity: 'URGENT',
        reason: 'Suspected cardiac event following trauma from fall. Immediate dispatch required.',
        units: ['ALS Unit', 'Cardiology Alert'],
        details: ['Cardiovascular alert', 'Trauma protocol'],
      },
      transcript: [
        {
          time: '00:12',
          originalText: '¡Ayuda! Por favor, me he caído y no puedo levantarme.',
          originalLanguage: 'ES',
          translatedText: 'Help! Please, I\'ve fallen and I can\'t get up.',
          translatedLanguage: 'EN',
          keywords: ['FALL', 'HELP'],
        },
        {
          time: '00:45',
          originalText: 'Me duele mucho el pecho. Es como una presión.',
          originalLanguage: 'ES',
          translatedText: 'My chest hurts a lot. It\'s like pressure.',
          translatedLanguage: 'EN',
          keywords: ['CHEST PAIN'],
        },
      ],
      caseLogs: [
        {
          caseId: '#EM-2024-089',
          time: '14:02',
          status: 'URGENT',
          location: '123 Maple St',
          patient: 'John Doe',
          primaryConcern: 'Suspected MI / Fall',
        },
        {
          caseId: '#EM-2024-092',
          time: '14:05',
          status: 'UNCERTAIN',
          location: '882 West Ave',
          patient: 'Mary Smith',
          primaryConcern: 'Panic / Shortness of Breath',
        },
        {
          caseId: '#EM-2024-094',
          time: '14:10',
          status: 'NON-URGENT',
          location: 'Public Park Sect. 4',
          patient: 'Unknown',
          primaryConcern: 'Public Nuisance',
        },
        {
          caseId: '#EM-2024-095',
          time: '14:12',
          status: 'URGENT',
          location: '45 Skyline Dr',
          patient: 'David Miller',
          primaryConcern: 'Severe Allergic Reaction',
        },
      ],
    }
  );

  const handleContactFamily = () => {
    console.log('Contacting family...');
    // In production, call API
  };

  const handleViewHistory = () => {
    console.log('Viewing history...');
    // In production, navigate/open modal
  };

  const handleSelectCase = (caseLog: CaseLog) => {
    setSelectedCase(caseLog);
    // In production, fetch the analysis data for this case from API
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 w-full">
        <DashboardHeader currentUser={{ name: 'David Lee', role: 'Lead Dispatcher' }} />
      </div>

      {/* Scrollable Main Content */}
      <div className="flex-1 overflow-y-auto pb-[60vh]">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Patient Info */}
            <div className="lg:col-span-1">
              <PatientInfo
                patient={patient}
                onContactFamily={handleContactFamily}
                onViewHistory={handleViewHistory}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Call Analysis - Only shown when case is selected */}
              {selectedCase && (
                <ActiveCallAnalysis
                  acousticFindings={callAnalysis.acousticFindings}
                  patientContext={callAnalysis.patientContext}
                  triageSuggestion={callAnalysis.triageSuggestion}
                  transcript={callAnalysis.transcript}
                />
              )}
              
              {/* Empty state when no case selected */}
              {!selectedCase && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <p className="text-gray-500 text-sm">Select a case from the logs below to view call analysis</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Drawer - Case Logs */}
      <CaseLogsTable 
        caseLogs={callAnalysis.caseLogs}
        onSelectCase={handleSelectCase}
        selectedCaseId={selectedCase?.caseId}
      />
    </div>
  );
}