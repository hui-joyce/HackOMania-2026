// API base URL
const API_BASE = `${import.meta.env.VITE_API_URL}/audit`;
const FETCH_TIMEOUT = 10000;

export interface AuditCase {
  id: string;
  caseId: string;
  timestamp: Date;
  primaryConcern: string;
  status: 'URGENT' | 'UNCERTAIN' | 'NON-URGENT' | 'RESOLVED';
  residentName: string;
  leadResponder: string;
  auditScore: number;
  location: string;
  responseTime: number;
}

export interface AuditCasesResponse {
  cases: AuditCase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  totalCases: number;
  resolved: number;
  unresolved: number;
  avgAuditScore: number;
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
 * Fetch audit cases with pagination and filtering
 */
export async function fetchAuditCases(
  status: string = 'all',
  page: number = 1,
  limit: number = 10
): Promise<AuditCasesResponse> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/cases?status=${status}&page=${page}&limit=${limit}`
    );
    if (!response.ok) throw new Error('Failed to fetch audit cases');
    const data = await response.json();
    
    // Parse timestamps
    return {
      ...data,
      cases: data.cases.map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
      })),
    };
  } catch (error) {
    console.error('Error fetching audit cases:', error);
    throw error;
  }
}

/**
 * Fetch audit statistics
 */
export async function fetchAuditStats(): Promise<AuditStats> {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/stats`);
    if (!response.ok) throw new Error('Failed to fetch audit stats');
    return await response.json();
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time audit cases updates (polling)
 */
export function subscribeToAuditCases(
  status: string,
  page: number,
  callback: (data: AuditCasesResponse) => void
): () => void {
  let mounted = true;
  const POLLING_INTERVAL = 30000; // 30 seconds

  const poll = async () => {
    try {
      const data = await fetchAuditCases(status, page, 10);
      if (mounted) {
        callback(data);
      }
    } catch (error) {
      console.error('Error polling audit cases:', error);
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