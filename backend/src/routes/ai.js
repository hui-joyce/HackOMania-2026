const express = require('express');
const router = express.Router();
const { interveneCase, submitAnswers, transcribeAnswer, getIntervention } = require('../controllers/aiController');

router.get('/intervene/:caseId', getIntervention);
router.post('/intervene/:caseId', interveneCase);
router.post('/intervene/:caseId/answers', submitAnswers);
router.post('/transcribe-answer/:questionIndex', transcribeAnswer);

module.exports = router;