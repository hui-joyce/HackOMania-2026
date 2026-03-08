const { generateFollowUpQuestions, summarizeIntervention } = require('../services/aiReasoningService');
const { db, admin } = require('../config/firebase');
const { float32ToWav } = require('../lib/gcsStorage');
const Groq = require('groq-sdk');

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

exports.getIntervention = async (req, res) => {
  const { caseId } = req.params;

  try {
    const snapshot = await db.collection('aiInteractions')
      .where('caseId', '==', caseId)
      .limit(5)
      .get();

    if (snapshot.empty) {
      return res.json({ found: false });
    }

    // Pick the most recent doc (prefer COMPLETED over AI_ACTIVE)
    let best = snapshot.docs[0];
    for (const d of snapshot.docs) {
      if (d.data().status === 'COMPLETED') { best = d; break; }
    }
    const doc = best;
    const data = doc.data();
    res.json({
      found: true,
      interactionId: doc.id,
      status: data.status,
      questions: data.questions,
      answers: data.answers || [],
      summary: data.summary || null,
      urgency: data.urgency || null,
      recommendedActions: data.recommendedActions || [],
      language: data.language || 'en',
    });
  } catch (error) {
    console.error(`[AI Intervene] ❌ Failed to fetch intervention for case ${caseId}:`, error.message);
    res.status(500).json({ error: "Failed to fetch intervention" });
  }
};

exports.interveneCase = async (req, res) => {
  const { caseId } = req.params;
  const { language } = req.body || {};

  try {
    console.log(`[AI Intervene] Starting intervention for case ${caseId} (language: ${language || 'en'})...`);

    // 1️⃣ Generate AI questions in the caller's language
    const questions = await generateFollowUpQuestions(language || 'en');
    console.log(`[AI Intervene] Generated follow-up questions for case ${caseId}`);

    // 2️⃣ Log AI intervention with a known doc reference
    const docRef = await db.collection('aiInteractions').add({
      caseId,
      questions,
      answers: [],
      language: language || 'en',
      status: "AI_ACTIVE",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3️⃣ Create notification
    await db.collection('notifications').add({
      caseId,
      type: "AI_INTERVENTION",
      message: `AI voice intervention started for case ${caseId}`,
      seen: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[AI Intervene] ✅ Success — intervention started for case ${caseId} (doc: ${docRef.id})`);
    res.json({
      success: true,
      interactionId: docRef.id,
      questions
    });

  } catch (error) {
    console.error(`[AI Intervene] ❌ Failed for case ${caseId}:`, error.message);
    res.status(500).json({ error: "AI intervention failed" });
  }
};

exports.submitAnswers = async (req, res) => {
  const { caseId } = req.params;
  const { questions, answers } = req.body;

  if (!questions || !answers || !Array.isArray(questions) || !Array.isArray(answers)) {
    return res.status(400).json({ error: "questions and answers arrays are required" });
  }

  try {
    console.log(`[AI Intervene] Received ${answers.length} answers for case ${caseId}, generating summary...`);

    // 1. Generate AI summary from Q&A
    const summary = await summarizeIntervention(questions, answers);
    console.log(`[AI Intervene] Summary generated — Urgency: ${summary.urgency}`);

    // 2. Find the existing AI_ACTIVE doc for this case and update it
    const snapshot = await db.collection('aiInteractions')
      .where('caseId', '==', caseId)
      .where('status', '==', 'AI_ACTIVE')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await docRef.update({
        answers,
        summary: summary.summary,
        urgency: summary.urgency,
        recommendedActions: summary.recommendedActions,
        status: "COMPLETED",
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Fallback: create new doc if no active one found
      await db.collection('aiInteractions').add({
        caseId,
        questions,
        answers,
        summary: summary.summary,
        urgency: summary.urgency,
        recommendedActions: summary.recommendedActions,
        status: "COMPLETED",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 3. Update the case status in Firebase based on AI urgency
    const updateData = {
      status: summary.urgency,
      aiIntervened: true,
      aiSummary: summary.summary,
      aiUrgency: summary.urgency,
      aiRecommendedActions: summary.recommendedActions,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Try direct doc lookup first
    const caseRef = db.collection('cases').doc(caseId);
    const caseDoc = await caseRef.get();
    if (caseDoc.exists) {
      await caseRef.update(updateData);
      console.log(`[AI Intervene] Updated case ${caseId} status to ${summary.urgency}`);
    } else {
      // Fallback: query by caseId field
      console.log(`[AI Intervene] Doc not found by ID "${caseId}", querying by caseId field...`);
      const caseQuery = await db.collection('cases').where('caseId', '==', caseId).limit(1).get();
      if (!caseQuery.empty) {
        await caseQuery.docs[0].ref.update(updateData);
        console.log(`[AI Intervene] Updated case ${caseId} (doc: ${caseQuery.docs[0].id}) status to ${summary.urgency}`);
      } else {
        console.warn(`[AI Intervene] ⚠️ No case document found for ${caseId} — status not updated`);
      }
    }

    // 4. Create notification with summary
    await db.collection('notifications').add({
      caseId,
      type: "AI_INTERVENTION_COMPLETE",
      message: `AI intervention completed for case ${caseId}: ${summary.urgency}`,
      seen: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[AI Intervene] ✅ Answers processed for case ${caseId} — Urgency: ${summary.urgency}`);
    res.json({
      success: true,
      summary: summary.summary,
      urgency: summary.urgency,
      recommendedActions: summary.recommendedActions
    });

  } catch (error) {
    console.error(`[AI Intervene] ❌ Failed to process answers for case ${caseId}:`, error.message);
    res.status(500).json({ error: "Failed to process answers" });
  }
};

exports.transcribeAnswer = async (req, res) => {
  const { questionIndex } = req.params;
  const { audio } = req.body;

  if (!audio || !Array.isArray(audio)) {
    return res.status(400).json({ error: 'Invalid audio format. Expected an array of floats.' });
  }

  if (!groq) {
    return res.status(503).json({ error: 'Groq API key not configured.' });
  }

  try {
    console.log(`[AI Intervene] Transcribing answer for question ${questionIndex}...`);

    const audioData = new Float32Array(audio);
    const wavBuffer = float32ToWav(audioData);

    const transcription = await groq.audio.transcriptions.create({
      file: await Groq.toFile(wavBuffer, 'answer.wav', { type: 'audio/wav' }),
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
    });

    const text = transcription.text || '';
    const language = transcription.language || 'en';

    // Translate if non-English
    let translatedText = text;
    if (text.trim().length > 0 && language !== 'en' && language !== 'english') {
      try {
        const translate = require('translate-google');
        translatedText = await translate(text, { to: 'en' });
      } catch (err) {
        console.error('[AI Intervene] Translation error:', err.message);
      }
    }

    console.log(`[AI Intervene] ✅ Answer ${questionIndex} transcribed: "${translatedText}"`);

    res.json({
      success: true,
      originalText: text,
      translatedText,
      language,
    });

  } catch (error) {
    console.error(`[AI Intervene] ❌ Failed to transcribe answer ${questionIndex}:`, error.message);
    res.status(500).json({ error: 'Failed to transcribe answer' });
  }
};