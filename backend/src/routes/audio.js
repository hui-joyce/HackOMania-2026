const express = require('express');
const router = express.Router();

// Lazy-load @xenova/transformers to avoid blocking startup
let classifierPipeline = null;
let transcriberPipeline = null;
let modelsLoading = false;
let modelsLoaded = false;

async function loadModels() {
    if (modelsLoading || modelsLoaded) return;
    modelsLoading = true;
    try {
        const { pipeline } = await import('@xenova/transformers');
        console.log('[Audio] Loading classification and transcription models...');
        const [classifier, transcriber] = await Promise.all([
            pipeline('audio-classification', 'Xenova/ast-finetuned-audioset-10-10-0.4593'),
            pipeline('automatic-speech-recognition', 'Xenova/whisper-base.en'),
        ]);
        classifierPipeline = classifier;
        transcriberPipeline = transcriber;
        modelsLoaded = true;
        console.log('[Audio] Both models loaded successfully.');
    } catch (err) {
        console.error('[Audio] Failed to load models:', err);
        modelsLoading = false;
    }
}

// Kick off model loading immediately when the module is imported
loadModels();

/**
 * GET /api/audio/status
 * Returns whether the AI models are ready.
 */
router.get('/status', (req, res) => {
    res.json({ ready: modelsLoaded });
});

/**
 * POST /api/audio/classification
 * Body: { audio: number[] }  (Float32 PCM at 16kHz)
 * Returns top-5 audio classification labels.
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

        console.log('[Audio] Classification result:', result);
        res.json(result);
    } catch (err) {
        console.error('[Audio] Classification error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/audio/transcription
 * Body: { audio: number[] }  (Float32 PCM at 16kHz)
 * Returns transcribed text.
 */
router.post('/transcription', async (req, res) => {
    try {
        if (!transcriberPipeline) {
            return res.status(503).json({ error: 'Models are still loading, please wait.' });
        }
        const { audio } = req.body;
        if (!audio || !Array.isArray(audio)) {
            return res.status(400).json({ error: 'Invalid audio format. Expected an array of floats.' });
        }

        const audioData = new Float32Array(audio);
        const result = await transcriberPipeline(audioData);

        console.log('[Audio] Transcription result:', result);
        res.json({ text: result.text });
    } catch (err) {
        console.error('[Audio] Transcription error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
