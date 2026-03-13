// API base URL
const API_BASE = `${import.meta.env.VITE_API_URL}/analytics`;
const HEALTH_CHECK_URL = `${import.meta.env.VITE_API_URL}/health`;

// Polling interval in ms 
const POLLING_INTERVAL = 30000;

// Fetch timeout in ms
const FETCH_TIMEOUT = 10000;

export interface AnalyticsOverview {
  totalAlerts: number;
  urgentCount: number;
  uncertainCount: number;
  nonUrgentCount: number;
  avgResponseTime: number;
  avgAccuracy: number;
  period: string;
}

export interface AlertsByUrgency {
  day: string;
  URGENT: number;
  UNCERTAIN: number;
  'NON-URGENT': number;
}

export interface CommonEmergency {
  label: string;
  count: number;
}

export interface ResponseTime {
  hour: string;
  avgTime: number;
}

export interface StatusDistribution {
  URGENT: number;
  UNCERTAIN: number;
  'NON-URGENT': number;
}

/**
 * Helper function to add timeout to fetch requests
 */
function fetchWithTimeout(url: string, timeout: number = FETCH_TIMEOUT): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);

    fetch(url)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Check if API is reachable
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(HEALTH_CHECK_URL, 5000);
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
}

/**
 * Fetch overview metrics
 * @param period - 'daily', 'weekly', or 'monthly'
 * @returns Promise with overview metrics
 */
export async function fetchAnalyticsOverview(period: string = 'monthly'): Promise<AnalyticsOverview> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/overview?period=${period}`);
    if (!response.ok) throw new Error('Failed to fetch overview');
    return await response.json();
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time overview updates
 * Automatically polls for new data at regular intervals
 * @param period - 'daily', 'weekly', or 'monthly'
 * @param callback - Called with updated data whenever it changes
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToAnalyticsOverview(
  period: string,
  callback: (data: AnalyticsOverview) => void
): () => void {
  let mounted = true;

  const poll = async () => {
    try {
      const data = await fetchAnalyticsOverview(period);
      if (mounted) {
        callback(data);
      }
    } catch (error) {
      console.error('Error polling analytics overview:', error);
    }

    if (mounted) {
      setTimeout(poll, POLLING_INTERVAL);
    }
  };

  // Initial fetch
  poll();

  // Return unsubscribe function
  return () => {
    mounted = false;
  };
}

/**
 * Fetch alerts by urgency over time
 */
export async function fetchAlertsByUrgency(period: string = 'weekly'): Promise<AlertsByUrgency[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/alerts-by-urgency?period=${period}`);
    if (!response.ok) throw new Error('Failed to fetch alerts by urgency');
    return await response.json();
  } catch (error) {
    console.error('Error fetching alerts by urgency:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time alerts by urgency updates
 * @param period - 'daily', 'weekly', or 'monthly'
 * @param callback - Called with updated data whenever it changes
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToAlertsByUrgency(
  period: string,
  callback: (data: AlertsByUrgency[]) => void
): () => void {
  let mounted = true;

  const poll = async () => {
    try {
      const data = await fetchAlertsByUrgency(period);
      if (mounted) {
        callback(data);
      }
    } catch (error) {
      console.error('Error polling alerts by urgency:', error);
    }

    if (mounted) {
      setTimeout(poll, POLLING_INTERVAL);
    }
  };

  // Initial fetch
  poll();

  // Return unsubscribe function
  return () => {
    mounted = false;
  };
}

/**
 * Fetch common emergencies
 */
export async function fetchCommonEmergencies(period: string = 'monthly'): Promise<CommonEmergency[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/common-emergencies?period=${period}`);
    if (!response.ok) throw new Error('Failed to fetch common emergencies');
    return await response.json();
  } catch (error) {
    console.error('Error fetching common emergencies:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time common emergencies updates
 * @param period - 'daily', 'weekly', or 'monthly'
 * @param callback - Called with updated data whenever it changes
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToCommonEmergencies(
  period: string,
  callback: (data: CommonEmergency[]) => void
): () => void {
  let mounted = true;

  const poll = async () => {
    try {
      const data = await fetchCommonEmergencies(period);
      if (mounted) {
        callback(data);
      }
    } catch (error) {
      console.error('Error polling common emergencies:', error);
    }

    if (mounted) {
      setTimeout(poll, POLLING_INTERVAL);
    }
  };

  // Initial fetch
  poll();

  // Return unsubscribe function
  return () => {
    mounted = false;
  };
}

/**
 * Fetch response time trends
 */
export async function fetchResponseTimes(period: string = 'weekly'): Promise<ResponseTime[]> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/response-times?period=${period}`);
    if (!response.ok) throw new Error('Failed to fetch response times');
    return await response.json();
  } catch (error) {
    console.error('Error fetching response times:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time response time updates
 * @param period - 'daily', 'weekly', or 'monthly'
 * @param callback - Called with updated data whenever it changes
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToResponseTimes(
  period: string,
  callback: (data: ResponseTime[]) => void
): () => void {
  let mounted = true;

  const poll = async () => {
    try {
      const data = await fetchResponseTimes(period);
      if (mounted) {
        callback(data);
      }
    } catch (error) {
      console.error('Error polling response times:', error);
    }

    if (mounted) {
      setTimeout(poll, POLLING_INTERVAL);
    }
  };

  // Initial fetch
  poll();

  // Return unsubscribe function
  return () => {
    mounted = false;
  };
}

/**
 * Fetch status distribution
 */
export async function fetchStatusDistribution(period: string = 'monthly'): Promise<StatusDistribution> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/status-distribution?period=${period}`);
    if (!response.ok) throw new Error('Failed to fetch status distribution');
    return await response.json();
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time status distribution updates
 * @param period - 'daily', 'weekly', or 'monthly'
 * @param callback - Called with updated data whenever it changes
 * @returns Cleanup function to unsubscribe
 */
export function subscribeToStatusDistribution(
  period: string,
  callback: (data: StatusDistribution) => void
): () => void {
  let mounted = true;

  const poll = async () => {
    try {
      const data = await fetchStatusDistribution(period);
      if (mounted) {
        callback(data);
      }
    } catch (error) {
      console.error('Error polling status distribution:', error);
    }

    if (mounted) {
      setTimeout(poll, POLLING_INTERVAL);
    }
  };

  // Initial fetch
  poll();

  // Return unsubscribe function
  return () => {
    mounted = false;
  };
}