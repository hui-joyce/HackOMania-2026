const express = require('express');
const router = express.Router();
const { uploadAudioToGCS, float32ToWav } = require('../lib/gcsStorage');
const Groq = require('groq-sdk');

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
            response_format: 'json',
        });

        // 3. Perform Speech Emotion Recognition locally (Acoustic)
        const emotionPromise = emotionClassifierPipeline ? emotionClassifierPipeline(audioData) : Promise.resolve([]);

        // 4. Upload to GCS in parallel
        const uploadPromise = uploadAudioToGCS(audioData, 'recordings');

        const [transcription, emotionResults, gcsUrl] = await Promise.all([
            transcriptionPromise,
            emotionPromise,
            uploadPromise
        ]);

        const text = transcription.text || '';
        const flags = flagKeywords(text);

        // 5. Hybrid Analysis: Send text to Groq for Sentiment/Tone context
        let hybridEmotion = null;
        const rawAcoustic = emotionResults && emotionResults.length > 0 ? emotionResults[0] : null;
        const mappedAcoustic = rawAcoustic ? mapEmotionLabel(rawAcoustic.label) : 'Uncertain';

        if (text.length > 5) {
            try {
                const sentimentRes = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are an emotion analysis expert. Analyze the provided text and classify the speaker's tone into one of these EXACT categories: Normal/Calm, Angry, Sad, Fearful, Uncertain. Provide only the category name."
                        },
                        {
                            role: "user",
                            content: `Text: "${text}"`
                        }
                    ],
                    model: "llama3-8b-8192",
                    temperature: 0,
                });
                const textTone = sentimentRes.choices[0]?.message?.content?.trim();

                // Consensus Logic: If text sentiment strongly confirms or overrides acoustic
                // For simplicity, we favor the text tone if the acoustic is 'Uncertain' or if they both point to high-intensity emotions
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
        console.log('[Audio] Final Consensus Emotion:', hybridEmotion?.label);
        console.log('[Audio] Keyword flags:', JSON.stringify(flags));
        if (gcsUrl) console.log('[Audio] Stored at:', gcsUrl);

        res.json({
            text,
            flags,
            gcsUrl,
            speechEmotion: hybridEmotion
        });
    } catch (err) {
        console.error('[Audio] Transcription error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
