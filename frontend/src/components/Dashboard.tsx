import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ResidentInfo } from './ResidentInfo';
import { ActiveCallAnalysis } from './ActiveCallAnalysis';
import { CaseLogsTable } from './CaseLogsTable';
import { DashboardHeader } from './DashboardHeader';
import { Resident, CallAnalysis, CaseLog } from '../types';
import { fetchResidentById, fetchCallById, fetchCases, subscribeToCases, seedSampleData } from '../services/firebaseService';

export function Dashboard() {
  const location = useLocation();
  const [resident, setResident] = useState<Resident | null>(null);
  const [callAnalysis, setCallAnalysis] = useState<CallAnalysis | null>(null);
  const [caseLogs, setCaseLogs] = useState<CaseLog[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from Firebase on component mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Check if demo data exists, if not seed sample data
        const initialCases = await fetchCases();
        if (!initialCases.length) {
          console.log('No cases found, seeding sample data...');
          await seedSampleData();
        }
        
        // Subscribe to cases
        unsubscribe = subscribeToCases((newCases) => {
          setCaseLogs(newCases);
          setLoading(false);
          setError(null);
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        setLoading(false);
      }
    };

    loadDashboardData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Auto-select case if navigating back from incident report
  useEffect(() => {
    const state = location.state as { selectedCaseId?: string } | null;
    if (state?.selectedCaseId && caseLogs.length > 0) {
      const caseToSelect = caseLogs.find(c => c.caseId === state.selectedCaseId);
      if (caseToSelect && (!selectedCase || selectedCase.caseId !== caseToSelect.caseId)) {
        handleSelectCase(caseToSelect);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseLogs, location.state]);

  const handleContactFamily = () => {
    console.log('Contacting family...');
    // In production, call API
  };

  const handleViewHistory = () => {
    console.log('Viewing history...');
    // In production, navigate/open modal
  };

  const handleSelectCase = async (caseLog: CaseLog) => {
    setSelectedCase(caseLog);
    try {
      // Fetch resident data for this case
      const residentData = await fetchResidentById(caseLog.residentId);
      const callData = await fetchCallById(caseLog.caseId);
      setResident(residentData as Resident);
      setCallAnalysis(callData as CallAnalysis);
    } catch (err) {
      console.error('Error loading case details:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#137FEC' }}></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error || 'Failed to load data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: '#137FEC' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F5CCB')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#137FEC')}
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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Resident Info (Only show when case selected) */}
            {selectedCase && resident && (
            <div className="lg:col-span-1">
              <ResidentInfo
                resident={resident}
                onContactFamily={handleContactFamily}
                onViewHistory={handleViewHistory}
              />
            </div>
            )}

            {/* Main Content */}
            <div className={`space-y-6 ${selectedCase && resident ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              {/* Call Analysis - Only shown when case is selected */}
              {selectedCase && callAnalysis && (
                <ActiveCallAnalysis
                  acousticFindings={callAnalysis.acousticFindings}
                  residentContext={callAnalysis.residentContext}
                  triageSuggestion={callAnalysis.triageSuggestion}
                  transcript={callAnalysis.transcript}
                  audioUrl={callAnalysis.audioUrl}
                  audioDuration={callAnalysis.audioDuration}
                  caseId={selectedCase.caseId}
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

      {/* Case Logs */}
      <CaseLogsTable 
        caseLogs={caseLogs}
        onSelectCase={handleSelectCase}
        selectedCaseId={selectedCase?.caseId}
      />
    </div>
  );
}