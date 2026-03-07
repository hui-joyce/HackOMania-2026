const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

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
 * GET /api/audit/cases
 * Fetch audit log cases with pagination and filtering
 */
router.get('/cases', async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query based on status filter
    let query = db.collection('cases');

    if (status === 'resolved') {
      query = query.where('status', '==', 'RESOLVED');
    } else if (status === 'unresolved') {
      query = query.where('status', 'in', ['URGENT', 'UNCERTAIN', 'NON-URGENT']);
    }

    // Get total count
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Get paginated results
    const casesSnapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(limitNum)
      .offset(skip)
      .get();

    const cases = [];
    casesSnapshot.forEach((doc) => {
      const data = doc.data();
      cases.push({
        id: doc.id,
        caseId: data.caseId || doc.id,
        timestamp: data.timestamp,
        primaryConcern: data.primaryConcern || 'Unknown',
        status: data.status || 'NON-URGENT',
        residentName: data.residentName || 'Unknown',
        leadResponder: data.leadResponder || 'Unassigned',
        auditScore: data.auditScore || 0,
        location: data.location || 'Unknown',
        responseTime: data.responseTime || 0,
      });
    });

    res.json({
      cases,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching audit cases:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/audit/stats
 * Fetch audit statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const casesSnapshot = await db.collection('cases').get();
    
    let resolved = 0;
    let unresolved = 0;
    let avgScore = 0;
    let scores = [];

    casesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.auditScore !== undefined && data.auditScore !== null) {
        scores.push(data.auditScore);
      }

      if (data.status === 'RESOLVED') {
        resolved++;
      } else {
        unresolved++;
      }
    });

    avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;

    res.json({
      totalCases: casesSnapshot.size,
      resolved,
      unresolved,
      avgAuditScore: Number(avgScore.toFixed(1)),
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;