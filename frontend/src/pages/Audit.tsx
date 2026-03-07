import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { DashboardHeader } from '../components/DashboardHeader';
import {
  fetchAuditStats,
  subscribeToAuditCases,
  AuditCasesResponse,
  AuditStats,
} from '../services/auditService';

type TabType = 'all' | 'unresolved' | 'resolved';

export function Audit() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [auditData, setAuditData] = useState<AuditCasesResponse | null>(null);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to audit cases data
  useEffect(() => {
    setLoading(true);
    setError(null);

    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Request timed out. Please ensure the backend server is running.');
      }
    }, 15000);

    const initializeData = async () => {
      try {
        // Fetch stats
        const stats = await fetchAuditStats();
        setAuditStats(stats);

        // Subscribe to cases
        const unsubscribe = subscribeToAuditCases(activeTab, currentPage, (data) => {
          setAuditData(data);
          setLoading(false);
          setError(null);
          clearTimeout(loadingTimeout);
        });

        return unsubscribe;
      } catch (err) {
        clearTimeout(loadingTimeout);
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect to audit API. Make sure the backend server is running.'
        );
      }
    };

    const cleanup = initializeData();

    return () => {
      clearTimeout(loadingTimeout);
      cleanup?.then((fn) => fn?.());
    };
  }, [activeTab, currentPage]);

  const tabs = [
    { id: 'all', label: 'All Cases', count: auditStats?.totalCases || 0 },
    { id: 'unresolved', label: 'Unresolved', count: auditStats?.unresolved || 0 },
    { id: 'resolved', label: 'Resolved', count: auditStats?.resolved || 0 },
  ];

  const getEmergencyTypeColor = (concern: string): string => {
    const lower = concern.toLowerCase();
    if (lower.includes('medical')) return 'bg-blue-100 text-blue-800';
    if (lower.includes('fire') || lower.includes('emergency')) return 'bg-red-100 text-red-800';
    if (lower.includes('rescue')) return 'bg-orange-100 text-orange-800';
    return 'bg-purple-100 text-purple-800';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'UNCERTAIN':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="sticky top-0 z-40 w-full">
          <DashboardHeader currentUser={{ name: 'David Lee', role: 'Lead Dispatcher' }} hideSearch={true} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#137FEC' }}></div>
            <p className="text-gray-600 font-medium mb-2">Loading audit records...</p>
            <p className="text-gray-500 text-sm">Fetching case data from backend</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="sticky top-0 z-40 w-full">
        <DashboardHeader currentUser={{ name: 'David Lee', role: 'Lead Dispatcher' }} hideSearch={true} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Case Audit Records</h1>
            <p className="text-gray-600 text-sm mt-1">Review and manage emergency case performance audits.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
              <div className="flex gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Unable to Load Audit Records</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => window.location.reload()}
                      className="text-white"
                      style={{ backgroundColor: '#137FEC' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F5CCB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#137FEC')}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {auditStats && !error && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-600 text-sm font-medium">Total Cases</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">{auditStats.totalCases}</h3>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-600 text-sm font-medium">Resolved</p>
                  <h3 className="text-2xl font-bold text-green-600 mt-2">{auditStats.resolved}</h3>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-600 text-sm font-medium">Unresolved</p>
                  <h3 className="text-2xl font-bold text-red-600 mt-2">{auditStats.unresolved}</h3>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-600 text-sm font-medium">Avg Audit Score</p>
                  <h3 className="text-2xl font-bold" style={{ color: '#137FEC' }}>
                    {auditStats.avgAuditScore}
                  </h3>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Table Card */}
          <Card>
            {/* Tabs */}
            <div className="border-b border-gray-200 px-6 pt-6">
              <div className="flex gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as TabType);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                      activeTab === tab.id
                        ? 'border-b-2 text-white'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    style={
                      activeTab === tab.id
                        ? {
                            borderColor: '#137FEC',
                            color: '#137FEC',
                            backgroundColor: 'transparent',
                          }
                        : {}
                    }
                  >
                    {tab.label}
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <CardContent className="pt-6">
              {auditData && auditData.cases.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">CASE ID</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">TIMESTAMP</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">EMERGENCY TYPE</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">STATUS</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">LEAD RESPONDER</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">AUDIT SCORE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditData.cases.map((caseItem) => (
                          <tr key={caseItem.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-mono text-sm" style={{ color: '#137FEC' }}>
                              #{caseItem.caseId.replace(/\D/g, '').slice(-4) || '0000'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-sm">
                              {formatDate(caseItem.timestamp)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`${getEmergencyTypeColor(caseItem.primaryConcern)}`}>
                                {caseItem.primaryConcern}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`${getStatusColor(caseItem.status)}`}>
                                {caseItem.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-sm">{caseItem.leadResponder}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                      width: `${caseItem.auditScore}%`,
                                      backgroundColor: '#137FEC',
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-700 w-8">
                                  {caseItem.auditScore}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Page <span className="font-semibold">{auditData.page}</span> of{' '}
                      <span className="font-semibold">{auditData.totalPages}</span> • Showing{' '}
                      <span className="font-semibold">{auditData.cases.length}</span> of{' '}
                      <span className="font-semibold">{auditData.total}</span> cases
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      {/* Page numbers */}
                      {Array.from({ length: auditData.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 rounded text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          style={
                            currentPage === page
                              ? {
                                  backgroundColor: '#137FEC',
                                  color: 'white',
                                }
                              : {}
                          }
                        >
                          {page}
                        </button>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(auditData.totalPages, currentPage + 1))}
                        disabled={currentPage === auditData.totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">No cases found for this filter.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm py-4 border-t border-gray-200">
            © 2026 SentiCare AI Systems. All performance metrics verified.
          </div>
        </div>
      </div>
    </div>
  );
}