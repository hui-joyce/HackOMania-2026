const express = require('express');
const router = express.Router();
const { uploadAudioToGCS, float32ToWav } = require('../lib/gcsStorage');
const { admin, db } = require('../config/firebase');
const Groq = require('groq-sdk');
const translate = require('translate-google');

// Initialize Groq
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// ---------------------------------------------------------------------------
// Keyword dictionaries
// ---------------------------------------------------------------------------

const FLAG_DICTIONARY = {
    urgency: [
        'help', 'hurry', 'hurry up', 'quick', 'quickly', 'emergency', 'urgent', 'now',
        'right now', 'immediately', 'fast', 'please hurry', 'call someone', 'call for help',
        'ambulance', 'fire', 'danger', 'dangerous', 'serious', 'critical', 'cannot breathe',
        "can't breathe", 'choking', 'bleeding', 'fallen', 'i fell', "i've fallen",
        'stuck', 'need help', 'save me', 'sos', 'accident',
    ],
    emotions: [
        'crying', 'cry', 'sobbing', 'sob', 'scared', 'afraid', 'frightened', 'terrified',
        'panic', 'panicking', 'anxious', 'anxiety', 'worried', 'worry', 'stress', 'stressed',
        'pain', 'painful', 'hurting', 'hurts', 'hurt', 'lonely', 'alone', 'sad', 'sadness',
        'depressed', 'depression', 'angry', 'anger', 'upset', 'confused', 'lost',
        'hopeless', 'helpless', 'nervous', 'desperate', 'exhausted', 'tired',
        "can't cope", 'cannot cope', 'overwhelmed',
    ],
};

/**
 * Scans text for flagged keywords and returns categorized hit counts.
 * @param {string} text
 * @returns {{ urgency: {word:string,count:number}[], emotions: {word:string,count:number}[] }}
 */
function flagKeywords(text) {
    const lower = text.toLowerCase();
    const result = {};

    for (const [category, keywords] of Object.entries(FLAG_DICTIONARY)) {
        const hits = [];
        for (const kw of keywords) {
            const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'gi');
            const matches = lower.match(regex);
            if (matches && matches.length > 0) {
                hits.push({ word: kw, count: matches.length });
            }
        }
        result[category] = hits.sort((a, b) => b.count - a.count);
    }

    return result;
}

// ---------------------------------------------------------------------------
// Model loading (Only for local classification)
// ---------------------------------------------------------------------------

let classifierPipeline = null;
let emotionClassifierPipeline = null;
let modelsLoading = false;
let modelsLoaded = false;

async function loadModels() {
    if (modelsLoading || modelsLoaded) return;
    modelsLoading = true;
    try {
        const { pipeline } = await import('@xenova/transformers');

        console.log('[Audio] Loading classification models (this may take time on first run)...');

        // Load individually to catch specific errors
        try {
            classifierPipeline = await pipeline('audio-classification', 'Xenova/ast-finetuned-audioset-10-10-0.4593');
            console.log('[Audio] Sound classification model loaded.');
        } catch (e) {
            console.error('[Audio] Failed to load sound classifier:', e.message);
        }

        try {
            // Using the higher-accuracy ONNX-community model
            emotionClassifierPipeline = await pipeline('audio-classification', 'onnx-community/Speech-Emotion-Classification-ONNX');
            console.log('[Audio] Speech emotion model loaded.');
        } catch (e) {
            console.error('[Audio] Failed to load emotion classifier:', e.message);
        }

        modelsLoaded = true; // Mark as done even if one failed, so we don't hang
        modelsLoading = false;
        console.log('[Audio] Model loading sequence complete.');

        console.log('[Audio] Loading classification models (this may take time on first run)...');

        // Load individually to catch specific errors
        try {
            classifierPipeline = await pipeline('audio-classification', 'Xenova/ast-finetuned-audioset-10-10-0.4593');
            console.log('[Audio] Sound classification model loaded.');
        } catch (e) {
            console.error('[Audio] Failed to load sound classifier:', e.message);
        }

        try {
            // Using the higher-accuracy ONNX-community model
            emotionClassifierPipeline = await pipeline('audio-classification', 'onnx-community/Speech-Emotion-Classification-ONNX');
            console.log('[Audio] Speech emotion model loaded.');
        } catch (e) {
            console.error('[Audio] Failed to load emotion classifier:', e.message);
        }

        modelsLoaded = true; // Mark as done even if one failed, so we don't hang
        modelsLoading = false;
        console.log('[Audio] Model loading sequence complete.');
    } catch (err) {
        console.error('[Audio] Critical failure in model loading:', err);
        modelsLoading = false;
    }
}

/**
 * Maps raw model labels to user-friendly categories.
 */
function mapEmotionLabel(label) {
    const map = {
        'ANG': 'Angry',
        'CAL': 'Normal/Calm',
        'DIS': 'Uncertain',
        'FEA': 'Fearful',
        'HAP': 'Happy',
        'NEU': 'Normal/Calm',
        'SAD': 'Sad',
        'SUR': 'Uncertain'
    };
    return map[label] || label;
}

/**
 * Helper function to generate unique case IDs in #EM-2026-XXX format
 */
function generateCaseId() {
    const year = 2026;
    const randomNum = Math.floor(Math.random() * 900) + 100; // 3-digit random number
    return `#EM-${year}-${randomNum}`;
}

loadModels();

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/audio/status
 */
router.get('/status', (req, res) => {
    res.json({ ready: modelsLoaded && groq !== null });
});

/**
 * POST /api/audio/classification
 * Body: { audio: number[] }  (Float32 PCM at 16kHz)
 * Returns top-10 audio classification labels + GCS storage URL.
 */
router.post('/classification', async (req, res) => {
    try {
        if (!classifierPipeline) {
            return res.status(503).json({ error: 'Models are still loading, please wait.' });
        }
        const { audio } = req.body;
        if (!audio || !Array.isArray(audio)) {
            return res.status(400).json({ error: 'Invalid audio format. Expected an array of floats.' });
        }

        const audioData = new Float32Array(audio);
        const result = await classifierPipeline(audioData);

        const top10 = result.slice(0, 10);
        console.log('[Audio] Classification result (top 10):', top10);

        res.json({ results: top10 });
    } catch (err) {
        console.error('[Audio] Classification error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/audio/transcription
 * Body: { audio: number[] }  (Float32 PCM at 16kHz)
 * Returns:
 *   {
 *     text: string,
 *     flags: { urgency: {word,count}[], emotions: {word,count}[] },
 *     gcsUrl: string | null
 *   }
 */
router.post('/transcription', async (req, res) => {
    try {
        if (!groq) {
            return res.status(503).json({ error: 'Groq API key not configured.' });
        }
        const { audio } = req.body;
        if (!audio || !Array.isArray(audio)) {
            return res.status(400).json({ error: 'Invalid audio format. Expected an array of floats.' });
        }

        const audioData = new Float32Array(audio);

        // 1. Convert PCM to WAV buffer for Groq
        const wavBuffer = float32ToWav(audioData);

        // 2. Perform transcription via Groq (sending buffer as a file)
        const transcriptionPromise = groq.audio.transcriptions.create({
            file: await Groq.toFile(wavBuffer, 'audio.wav', { type: 'audio/wav' }),
            model: 'whisper-large-v3', // User requested large-v3 for multilingual
            response_format: 'verbose_json', // needed to expose the detected language field
        });

        // 3. Perform Speech Emotion Recognition locally (Acoustic)
        const emotionPromise = emotionClassifierPipeline ? emotionClassifierPipeline(audioData) : Promise.resolve([]);

        // 4. Perform acoustic sound classification
        const classificationPromise = classifierPipeline ? classifierPipeline(audioData) : Promise.resolve([]);

        // 5. Upload to GCS in parallel
        const uploadPromise = uploadAudioToGCS(audioData, 'recordings');

        const [transcription, emotionResults, classificationResults, gcsUrl] = await Promise.all([
            transcriptionPromise,
            emotionPromise,
            classificationPromise,
            uploadPromise
        ]);

        const text = transcription.text || '';
        const language = transcription.language || 'en'; // Groq whisper returns language code

        // 5.5 Optional Translation: if language is non-English, translate to English for keyword flagging
        let translatedText = text;
        console.log(`[Audio/Debug] Original text string: "${text}"`);
        console.log(`[Audio/Debug] Whisper detected language: "${language}"`);

        if (text.trim().length > 0 && language !== 'en' && language !== 'english') {
            try {
                console.log(`[Audio/Debug] Attempting free translation from ${language} to en...`);
                // Use free translate-google package
                const translation = await translate(text, { to: 'en' });
                console.log(`[Audio/Debug] Translate returned: "${translation}"`);
                translatedText = translation;
            } catch (err) {
                console.error('[Audio] Translation package error:', err);
            }
        } else {
            console.log(`[Audio/Debug] Skipped translation step because language is matched as EN or text is empty.`);
        }

        const flags = flagKeywords(translatedText);

        // 6. Hybrid Analysis: Send text to Groq for Sentiment/Tone context
        let hybridEmotion = null;
        const rawAcoustic = emotionResults && emotionResults.length > 0 ? emotionResults[0] : null;
        const mappedAcoustic = rawAcoustic ? mapEmotionLabel(rawAcoustic.label) : 'Uncertain';

        if (translatedText.length > 5) {
            try {
                const sentimentRes = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are an emotion analysis expert. Analyze the provided text and classify the speaker's tone into one of these EXACT categories: Normal/Calm, Happy/Positive, Angry, Sad, Fearful, Uncertain. Provide only the category name."
                        },
                        {
                            role: "user",
                            content: `Text: "${translatedText}"`
                        }
                    ],
                    model: "llama3-8b-8192",
                    temperature: 0,
                });
                let textTone = sentimentRes.choices[0]?.message?.content?.trim();

                // Align prompt categories back to the strict UI-expected set
                if (textTone === "Happy/Positive" || textTone === "Happy" || textTone?.includes("Positive")) {
                    textTone = "Normal";
                } else if (textTone === "Normal/Calm") {
                    textTone = "Normal";
                }

                hybridEmotion = {
                    label: textTone || mappedAcoustic,
                    score: rawAcoustic ? rawAcoustic.score : 0.85,
                    acoustic: mappedAcoustic,
                    textSentiment: textTone
                };
            } catch (sentErr) {
                console.error('[Audio] Groq sentiment error:', sentErr);
            }
        }

        if (!hybridEmotion && rawAcoustic) {
            hybridEmotion = {
                label: mappedAcoustic,
                score: rawAcoustic.score,
                acoustic: mappedAcoustic,
                textSentiment: null
            };
        }

        console.log('[Audio] Groq Transcription:', text);
        console.log('[Audio] Language:', language);
        console.log('[Audio] Final Consensus Emotion:', hybridEmotion?.label);
        console.log('[Audio] Keyword flags:', JSON.stringify(flags));
        if (gcsUrl) console.log('[Audio] Stored at:', gcsUrl);

        // --- Save to Firestore ---
        const timestamp = new Date();
        const isoString = timestamp.toISOString();
        const timeString = isoString.split('T')[1].substring(0, 5); // HH:MM

        // --- Triage System ---
        // URGENT: Explicitly urgent flagged keywords or absolute panic/fear
        const isUrgent = flags.urgency.length > 0 || (hybridEmotion && hybridEmotion.label === 'Fearful');

        // UNCERTAIN: Intense non-positive emotions without explicit emergency keywords, or explicit uncertainty
        const isUncertain = !isUrgent && hybridEmotion && ['Angry', 'Sad', 'Uncertain'].includes(hybridEmotion.label);

        let status = 'NON-URGENT';
        let primaryConcern = 'Unspecified';
        let protocol = 'Standard Response';
        let units = ['Community Nursing'];

        if (isUrgent) {
            status = 'URGENT';
            primaryConcern = flags.urgency.length > 0 ? `Urgency: ${flags.urgency[0].word}` : 'High distress detected';
            protocol = 'Code Red Protocol';
            units = ['ALS Unit', 'Paramedics'];
        } else if (isUncertain) {
            status = 'UNCERTAIN';
            primaryConcern = 'Emotional Distress / Uncertain';
            protocol = 'Priority Monitoring';
            units = ['Social Worker', 'Tele-consult'];
        } else {
            status = 'NON-URGENT';
            primaryConcern = 'Routine Check-in';
            protocol = 'Standard Response';
            units = ['Community Care'];
        }

        // Build justification string
        const allKeywords = [...flags.urgency.map(f => f.word), ...flags.emotions.map(f => f.word)];
        const topKeywords = allKeywords.slice(0, 3);
        let justificationMsg = '';
        if (topKeywords.length > 0) {
            justificationMsg = ` These flagged keywords were detected: ${topKeywords.join(', ')}.`;
        } else {
            justificationMsg = ' No flagged keywords were detected.';
        }

        const residentId = 'PT001';
        const residentName = 'Pauline Goh';

        // 7. Create CaseLog
        const caseLog = {
            residentId,
            time: timeString,
            status,
            location: '3 Everton Prk',
            residentName,
            primaryConcern,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: isoString
        };

        // Prepare Acoustic Findings list (Emotion + Top 3 Sounds)
        const activeFindings = [];
        if (hybridEmotion) {
            activeFindings.push({
                id: 'emotion_1',
                name: 'Detected Emotion',
                confidence: Math.round(hybridEmotion.score * 100),
                description: hybridEmotion.label
            });
        }

        if (classificationResults && classificationResults.length > 0) {
            const nonSpeech = classificationResults.filter(sound => {
                const s = sound.label.toLowerCase();
                return !s.includes('speech') && !s.includes('speaking') && !s.includes('conversation') && !s.includes('voice');
            });
            const top5Sounds = nonSpeech.slice(0, 5);
            top5Sounds.forEach((sound, index) => {
                activeFindings.push({
                    id: `sound_${index}`,
                    name: sound.label.charAt(0).toUpperCase() + sound.label.slice(1),
                    confidence: Math.round(sound.score * 100),
                    description: `Acoustic environment detection`
                });
            });
        }

        // 8. Create CallAnalysis
        const callAnalysis = {
            residentId,
            timestamp: isoString,
            status: 'COMPLETED',
            audioUrl: gcsUrl,
            audioDuration: 10,
            acousticFindings: activeFindings,
            residentContext: {
                homeAutomation: 'Patient triggered Personal Alert Button',
                livingStatus: 'Patient lives alone; family is away.',
                familyStatus: 'Family is away',
                smartwatchData: {
                    heartRate: isUrgent ? 115 : (isUncertain ? 90 : 75),
                    status: isUrgent ? 'Elevated' : (isUncertain ? 'Warning' : 'Normal'),
                },
            },
            triageSuggestion: {
                protocol: protocol,
                severity: status,
                reason: `Analysis detected: ${primaryConcern}.`,
                detectedEmotion: hybridEmotion?.label || 'Normal',
                justificationKeywords: topKeywords.length > 0 ? topKeywords : [],
                units: units,
                details: allKeywords,
            },
            transcript: [
                {
                    time: '00:00',
                    originalText: text,
                    originalLanguage: language, // Store Groq's detected language
                    translatedText: translatedText,
                    translatedLanguage: 'en',
                    keywords: topKeywords,
                }
            ],
        };

        const caseId = generateCaseId();
        const caseWithId = { ...caseLog, caseId };

        const newCaseRef = db.collection('cases').doc(caseId);
        await newCaseRef.set(caseWithId);

        const callRef = db.collection('calls').doc(caseId);
        await callRef.set(callAnalysis);

        res.json({
            text,
            flags,
            gcsUrl,
            speechEmotion: hybridEmotion,
            caseId
        });
    } catch (err) {
        console.error('[Audio] Transcription error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
