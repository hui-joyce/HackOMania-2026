import { useState, useEffect } from 'react';
import { PatientInfo } from './PatientInfo';
import { ActiveCallAnalysis } from './ActiveCallAnalysis';
import { CaseLogsTable } from './CaseLogsTable';
import { DashboardHeader } from './DashboardHeader';
import { Patient, CallAnalysis, CaseLog } from '../types';
import { fetchPatientById, fetchCallById, fetchCases, seedSampleData } from '../services/firebaseService';

export function Dashboard() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [callAnalysis, setCallAnalysis] = useState<CallAnalysis | null>(null);
  const [caseLogs, setCaseLogs] = useState<CaseLog[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Firebase on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Try to fetch patient data, if it doesn't exist, seed sample data
        let patientData = await fetchPatientById('PT001');
        
        if (!patientData) {
          console.log('No data found, seeding sample data...');
          await seedSampleData();
          patientData = await fetchPatientById('PT001');
        }
        
        // Fetch call analysis and cases
        const callData = await fetchCallById('CALL001');
        const casesData = await fetchCases();
        
        setPatient(patientData as Patient);
        setCallAnalysis(callData as CallAnalysis);
        setCaseLogs(casesData);
        setError(null);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !patient || !callAnalysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Failed to load data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Dashboard
          </button>
        </div>
      </div>
    );
  }

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
                  audioUrl={callAnalysis.audioUrl}
                  audioDuration={callAnalysis.audioDuration}
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
        caseLogs={caseLogs}
        onSelectCase={handleSelectCase}
        selectedCaseId={selectedCase?.caseId}
      />
    </div>
  );
}