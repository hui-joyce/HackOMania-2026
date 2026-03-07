const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

// Helper function to get date range
function getDateRange(period) {
  const end = new Date();
  const start = new Date();
  
  if (period === 'daily') {
    start.setDate(start.getDate() - 1);
  } else if (period === 'weekly') {
    start.setDate(start.getDate() - 7);
  } else if (period === 'monthly') {
    start.setDate(start.getDate() - 30);
  }
  
  return { start, end };
}

// Helper function to parse timestamp
function parseTimestamp(timestamp) {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
}

/**
 * GET /api/analytics/overview
 * Fetch overview metrics (total alerts, avg response time, etc.)
 */
router.get('/overview', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const { start, end } = getDateRange(period);

    // Fetch all cases for the period
    const casesSnapshot = await db
      .collection('cases')
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();

    const cases = [];
    casesSnapshot.forEach((doc) => {
      cases.push({ id: doc.id, ...doc.data() });
    });

    // Calculate metrics
    const totalAlerts = cases.length;
    const urgentCount = cases.filter(c => c.status === 'URGENT').length;
    const uncertainCount = cases.filter(c => c.status === 'UNCERTAIN').length;
    const nonUrgentCount = cases.filter(c => c.status === 'NON-URGENT').length;

    // Calculate average response time (assuming there's a responseTime field)
    const responseTimes = cases
      .filter(c => c.responseTime)
      .map(c => c.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Calculate AI accuracy (assuming there's a confidence/accuracy field)
    const accuracies = cases
      .filter(c => c.acousticFindings && c.acousticFindings.length > 0)
      .flatMap(c => c.acousticFindings.map(f => f.confidence || 0));
    const avgAccuracy = accuracies.length > 0
      ? (accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 100
      : 0;

    res.json({
      totalAlerts,
      urgentCount,
      uncertainCount,
      nonUrgentCount,
      avgResponseTime: Number(avgResponseTime.toFixed(2)),
      avgAccuracy: Number(avgAccuracy.toFixed(1)),
      period,
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/alerts-by-urgency
 * Fetch alert counts by urgency over time
 */
router.get('/alerts-by-urgency', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const { start, end } = getDateRange(period);

    const casesSnapshot = await db
      .collection('cases')
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .orderBy('timestamp', 'asc')
      .get();

    const cases = [];
    casesSnapshot.forEach((doc) => {
      cases.push({ id: doc.id, ...doc.data() });
    });

    // Group by day
    const byDay = {};
    cases.forEach((caseItem) => {
      const date = parseTimestamp(caseItem.timestamp);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!byDay[dayKey]) {
        byDay[dayKey] = { URGENT: 0, UNCERTAIN: 0, 'NON-URGENT': 0 };
      }
      byDay[dayKey][caseItem.status]++;
    });

    const data = Object.entries(byDay).map(([day, counts]) => ({
      day,
      ...counts,
    }));

    res.json(data);
  } catch (error) {
    console.error('Error fetching alerts by urgency:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/common-emergencies
 * Fetch most common emergency types
 */
router.get('/common-emergencies', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const { start, end } = getDateRange(period);

    const casesSnapshot = await db
      .collection('cases')
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();

    const emergencyCounts = {};
    casesSnapshot.forEach((doc) => {
      const data = doc.data();
      const concern = data.primaryConcern || 'Unknown';
      emergencyCounts[concern] = (emergencyCounts[concern] || 0) + 1;
    });

    // Sort by count and return top 10
    const sorted = Object.entries(emergencyCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json(sorted);
  } catch (error) {
    console.error('Error fetching common emergencies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/response-times
 * Fetch response time trends over time
 */
router.get('/response-times', async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;
    const { start, end } = getDateRange(period);

    const casesSnapshot = await db
      .collection('cases')
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .orderBy('timestamp', 'asc')
      .get();

    const cases = [];
    casesSnapshot.forEach((doc) => {
      cases.push({ id: doc.id, ...doc.data() });
    });

    // Group by hour and calculate average response time
    const byHour = {};
    cases.forEach((caseItem) => {
      if (caseItem.responseTime === undefined) return;
      
      const date = parseTimestamp(caseItem.timestamp);
      const hourKey = date.toISOString().split(':')[0]; // YYYY-MMTHH
      
      if (!byHour[hourKey]) {
        byHour[hourKey] = { times: [], count: 0 };
      }
      byHour[hourKey].times.push(caseItem.responseTime);
      byHour[hourKey].count++;
    });

    const data = Object.entries(byHour).map(([hour, { times }]) => ({
      hour,
      avgTime: times.length > 0 
        ? Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2))
        : 0,
    }));

    res.json(data);
  } catch (error) {
    console.error('Error fetching response times:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/status-distribution
 * Fetch distribution of case statuses
 */
router.get('/status-distribution', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const { start, end } = getDateRange(period);

    const casesSnapshot = await db
      .collection('cases')
      .where('timestamp', '>=', start)
      .where('timestamp', '<=', end)
      .get();

    const statusCounts = {
      URGENT: 0,
      UNCERTAIN: 0,
      'NON-URGENT': 0,
    };

    casesSnapshot.forEach((doc) => {
      const status = doc.data().status || 'NON-URGENT';
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    });

    res.json(statusCounts);
  } catch (error) {
    console.error('Error fetching status distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;