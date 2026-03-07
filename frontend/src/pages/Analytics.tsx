import { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, TrendingUp, Users, AlertCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../components/ui';
import { DashboardHeader } from '../components/DashboardHeader';
import {
  fetchAnalyticsOverview,
  fetchAlertsByUrgency,
  fetchCommonEmergencies,
  fetchResponseTimes,
  fetchStatusDistribution,
  subscribeToAnalyticsOverview,
  subscribeToAlertsByUrgency,
  subscribeToCommonEmergencies,
  subscribeToResponseTimes,
  subscribeToStatusDistribution,
  checkApiHealth,
  AnalyticsOverview,
  AlertsByUrgency,
  CommonEmergency,
  ResponseTime,
  StatusDistribution,
} from '../services/analyticsService';

export function Analytics() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [alertsByUrgency, setAlertsByUrgency] = useState<AlertsByUrgency[]>([]);
  const [commonEmergencies, setCommonEmergencies] = useState<CommonEmergency[]>([]);
  const [responseTimes, setResponseTimes] = useState<ResponseTime[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution | null>(null);
  
  const [period, setPeriod] = useState('monthly');
  const [urgencyPeriod, setUrgencyPeriod] = useState('weekly');
  const [responsePeriod, setResponsePeriod] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to real-time analytics data updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Set a timeout to prevent endless loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('API request timed out. Please ensure the backend server is running at http://localhost:3000');
      }
    }, 15000); // 15 second timeout

    // Check API health first
    const initializeData = async () => {
      try {
        const isHealthy = await checkApiHealth();
        if (!isHealthy) {
          throw new Error('Backend API is not responding');
        }

        // Subscribe to all analytics data streams
        const unsubscribeOverview = subscribeToAnalyticsOverview(period, (data) => {
          setOverview(data);
          setLoading(false);
          setError(null);
          clearTimeout(loadingTimeout);
        });

        const unsubscribeUrgency = subscribeToAlertsByUrgency(urgencyPeriod, (data) => {
          setAlertsByUrgency(data);
        });

        const unsubscribeEmergencies = subscribeToCommonEmergencies(period, (data) => {
          setCommonEmergencies(data);
        });

        const unsubscribeResponseTimes = subscribeToResponseTimes(responsePeriod, (data) => {
          setResponseTimes(data);
        });

        const unsubscribeStatusDistribution = subscribeToStatusDistribution(period, (data) => {
          setStatusDistribution(data);
        });

        // Cleanup subscriptions on unmount or when periods change
        return () => {
          clearTimeout(loadingTimeout);
          unsubscribeOverview();
          unsubscribeUrgency();
          unsubscribeEmergencies();
          unsubscribeResponseTimes();
          unsubscribeStatusDistribution();
        };
      } catch (err) {
        clearTimeout(loadingTimeout);
        setLoading(false);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect to analytics API. Make sure the backend server is running.'
        );
      }
    };

    const cleanup = initializeData();

    return () => {
      clearTimeout(loadingTimeout);
      cleanup?.then((fn) => fn?.());
    };
  }, [period, urgencyPeriod, responsePeriod]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [overviewData, urgencyData, emergenciesData, responseData, statusData] = await Promise.all([
        fetchAnalyticsOverview(period),
        fetchAlertsByUrgency(urgencyPeriod),
        fetchCommonEmergencies(period),
        fetchResponseTimes(responsePeriod),
        fetchStatusDistribution(period),
      ]);

      setOverview(overviewData);
      setAlertsByUrgency(urgencyData);
      setCommonEmergencies(emergenciesData);
      setResponseTimes(responseData);
      setStatusDistribution(statusData);
    } catch (err) {
      console.error('Error refreshing analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh analytics');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
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
            <p className="text-gray-600 font-medium mb-2">Loading analytics...</p>
            <p className="text-gray-500 text-sm mb-4">Connecting to backend API at http://localhost:3000</p>
            <p className="text-gray-500 text-xs">This may take a few seconds on first load.</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Performance Metrics</h1>
              <p className="text-gray-600 text-sm mt-1">Real-time system health and response analytics. Auto-updates every 30 seconds.</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                className="bg-[#137FEC] text-white hover:bg-[#0F5CCB]"
              >
                Export Report
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
              <div className="flex gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">Unable to Load Analytics</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <div className="bg-white rounded p-4 text-sm text-gray-700 mb-4">
                    <p className="font-semibold mb-2">Troubleshooting steps:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ensure the backend server is running: <code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code> in the backend folder</li>
                      <li>Check that the backend is accessible at: http://localhost:3000</li>
                      <li>Verify Firebase credentials are configured in <code className="bg-gray-100 px-2 py-1 rounded">backend/src/config/firebase.js</code></li>
                      <li>Check browser console for detailed error messages</li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleManualRefresh}
                      className="text-white"
                      style={{ backgroundColor: '#137FEC' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0F5CCB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#137FEC')}
                    >
                      Retry
                    </Button>
                    <Button variant="outline" onClick={() => setError(null)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Alerts */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Alerts</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{overview ? formatNumber(overview.totalAlerts) : '—'}</h3>
                    {overview && (
                      <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
                        <ArrowUp className="w-4 h-4" /> +15% vs LW
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <AlertCircle className="w-6 h-6" style={{ color: '#FF6B6B' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Avg Response Time */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Avg Response Time</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">
                      {overview ? formatTime(overview.avgResponseTime) : '—'}
                    </h3>
                    {overview && (
                      <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                        <ArrowDown className="w-4 h-4" /> -0.6% vs LW
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-6 h-6" style={{ color: '#137FEC' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Accuracy */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">AI Accuracy</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{overview ? `${overview.avgAccuracy.toFixed(1)}%` : '—'}</h3>
                    {overview && (
                      <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
                        <ArrowUp className="w-4 h-4" /> +0.2% improvement
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6" style={{ color: '#10B981' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Operators */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Active Operators</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">3</h3>
                    <p className="text-gray-500 text-xs mt-2">Stable</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="w-6 h-6" style={{ color: '#A855F7' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Alerts by Urgency Chart */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex items-center justify-between flex-row">
                  <CardTitle>Alerts by Urgency Over Time</CardTitle>
                  <div className="flex gap-2">
                    {['daily', 'weekly', 'monthly'].map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        variant={urgencyPeriod === p ? 'default' : 'outline'}
                        onClick={() => setUrgencyPeriod(p)}
                        style={urgencyPeriod === p ? { backgroundColor: '#137FEC' } : {}}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  {alertsByUrgency.length > 0 ? (
                    <AlertsByUrgencyChart data={alertsByUrgency} />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Common Emergencies */}
            <Card>
              <CardHeader>
                <CardTitle>Common Emergencies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commonEmergencies.slice(0, 5).map((emergency, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{emergency.label}</span>
                        <span className="text-sm text-gray-600">{emergency.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(emergency.count / (commonEmergencies[0]?.count || 1)) * 100}%`,
                            backgroundColor: '#137FEC',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Response Time Trends */}
          <Card>
            <CardHeader className="flex items-center justify-between flex-row">
              <CardTitle>Response Time Trends</CardTitle>
              <div className="text-xs text-gray-500">Comparing dispatch time vs on-site arrival.</div>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly'].map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={responsePeriod === p ? 'default' : 'outline'}
                    onClick={() => setResponsePeriod(p)}
                    style={responsePeriod === p ? { backgroundColor: '#137FEC' } : {}}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {responseTimes.length > 0 ? (
                <ResponseTimeTrendChart data={responseTimes} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          {statusDistribution && (
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusDistributionChart data={statusDistribution} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Chart Components via QuickChart API

function AlertsByUrgencyChart({ data }: { data: AlertsByUrgency[] }) {
  const [chartUrl, setChartUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateChart = async () => {
      try {
        const days = data.map(d => d.day.split('-').slice(1).join('-'));
        const urgent = data.map(d => d.URGENT);
        const uncertain = data.map(d => d.UNCERTAIN);
        const nonUrgent = data.map(d => d['NON-URGENT']);

        const chartConfig = {
          type: 'bar',
          data: {
            labels: days,
            datasets: [
              {
                label: 'Critical',
                data: urgent,
                backgroundColor: '#FF6B6B',
              },
              {
                label: 'Uncertain',
                data: uncertain,
                backgroundColor: '#FFA500',
              },
              {
                label: 'Non-Urgent',
                data: nonUrgent,
                backgroundColor: '#137FEC',
              },
            ],
          },
          options: {
            responsive: true,
            stacked: true,
            plugins: {
              legend: {
                position: 'bottom',
              },
            },
            scales: {
              x: {
                stacked: true,
              },
              y: {
                stacked: true,
              },
            },
          },
        };

        const chartJson = encodeURIComponent(JSON.stringify(chartConfig));
        const url = `https://quickchart.io/chart?c=${chartJson}&width=800&height=400`;
        setChartUrl(url);
      } catch (err) {
        console.error('Error generating chart:', err);
      } finally {
        setLoading(false);
      }
    };

    generateChart();
  }, [data]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-gray-500">Loading chart...</div>;
  }

  return chartUrl ? (
    <img src={chartUrl} alt="Alerts by Urgency" className="w-full mx-auto h-auto" />
  ) : (
    <div className="h-64 flex items-center justify-center text-gray-500">Failed to load chart</div>
  );
}

function ResponseTimeTrendChart({ data }: { data: ResponseTime[] }) {
  const [chartUrl, setChartUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateChart = async () => {
      try {
        const hours = data.map(d => d.hour.split('T')[1]?.substring(0, 5) || d.hour);
        const avgTimes = data.map(d => d.avgTime);

        const chartConfig = {
          type: 'line',
          data: {
            labels: hours,
            datasets: [
              {
                label: 'Avg Response Time (seconds)',
                data: avgTimes,
                borderColor: '#137FEC',
                backgroundColor: 'rgba(19, 127, 236, 0.1)',
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
              },
            },
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          },
        };

        const chartJson = encodeURIComponent(JSON.stringify(chartConfig));
        const url = `https://quickchart.io/chart?c=${chartJson}&width=900&height=350`;
        setChartUrl(url);
      } catch (err) {
        console.error('Error generating chart:', err);
      } finally {
        setLoading(false);
      }
    };

    generateChart();
  }, [data]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-gray-500">Loading chart...</div>;
  }

  return chartUrl ? (
    <img src={chartUrl} alt="Response Time Trends" className="w-full mx-auto h-auto" />
  ) : (
    <div className="h-64 flex items-center justify-center text-gray-500">Failed to load chart</div>
  );
}

function StatusDistributionChart({ data }: { data: StatusDistribution }) {
  const [chartUrl, setChartUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateChart = async () => {
      try {
        const total = data.URGENT + data.UNCERTAIN + data['NON-URGENT'];
        const chartConfig = {
          type: 'doughnut',
          data: {
            labels: ['Critical', 'Uncertain', 'Non-Urgent'],
            datasets: [
              {
                data: [data.URGENT, data.UNCERTAIN, data['NON-URGENT']],
                backgroundColor: ['#FF6B6B', '#FFA500', '#137FEC'],
                borderWidth: 2,
                borderColor: '#ffffff',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
              padding: 20,
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: {
                    size: 14,
                  },
                  padding: 15,
                  usePointStyle: true,
                },
              },
              datalabels: {
                display: true,
                color: '#fff',
                font: {
                  size: 16,
                  weight: 'bold',
                },
                formatter: (value: number) => {
                  if (value === 0) return '';
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${percentage}%`;
                },
              },
            },
          },
        };

        const chartJson = encodeURIComponent(JSON.stringify(chartConfig));
        const url = `https://quickchart.io/chart?c=${chartJson}&width=500&height=500`;
        setChartUrl(url);
      } catch (err) {
        console.error('Error generating chart:', err);
      } finally {
        setLoading(false);
      }
    };

    generateChart();
  }, [data]);

  if (loading) {
    return <div className="h-80 flex items-center justify-center text-gray-500">Loading chart...</div>;
  }

  return chartUrl ? (
    <div className="flex justify-center">
      <img src={chartUrl} alt="Status Distribution" className="w-auto h-auto max-w-md" />
    </div>
  ) : (
    <div className="h-80 flex items-center justify-center text-gray-500">Failed to load chart</div>
  );
}