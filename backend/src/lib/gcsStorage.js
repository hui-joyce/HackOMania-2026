const { Storage } = require('@google-cloud/storage');
const path = require('path');

const bucketName = process.env.GCS_BUCKET_NAME;
const keyFilename = process.env.GCS_KEY_FILENAME
    ? path.resolve(process.cwd(), process.env.GCS_KEY_FILENAME)
    : undefined;

let storage;
let bucket;

if (bucketName) {
    storage = new Storage(keyFilename ? { keyFilename } : {});
    bucket = storage.bucket(bucketName);
    console.log(`[GCS] Connected to bucket: ${bucketName}`);
} else {
    console.warn('[GCS] GCS_BUCKET_NAME not set — audio upload disabled.');
}

/**
 * Builds a minimal WAV file buffer from raw Float32 PCM data at 16 kHz mono.
 * @param {Float32Array} float32Data
 * @returns {Buffer}
 */
function float32ToWav(float32Data) {
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = float32Data.length;
    const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF chunk
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);               // sub-chunk size
    buffer.writeUInt16LE(1, 20);                // PCM format
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
    buffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32);              // block align
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Write samples (clamp Float32 → Int16)
    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]));
        buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }

    return buffer;
}

/**
 * Uploads a Float32Array PCM buffer to GCS as a WAV file.
 * @param {Float32Array} float32Data - 16kHz mono PCM audio
 * @param {string} prefix - optional folder prefix (e.g. 'classification' or 'transcription')
 * @returns {Promise<string|null>} Public GCS URL, or null if GCS is not configured
 */
async function uploadAudioToGCS(float32Data, prefix = 'audio') {
    if (!bucket) return null;

    try {
        const timestamp = Date.now();
        const filename = `${prefix}/${timestamp}.wav`;
        const wavBuffer = float32ToWav(float32Data);

        const file = bucket.file(filename);
        await file.save(wavBuffer, {
            contentType: 'audio/wav',
            metadata: { cacheControl: 'no-cache' },
        });

        const [signedUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        console.log(`[GCS] Uploaded and Signed: ${filename}`);
        return signedUrl;
    } catch (err) {
        console.error('[GCS] Upload failed:');
        console.error('  Code   :', err.code);
        console.error('  Message:', err.message);
        if (err.errors) console.error('  Errors :', JSON.stringify(err.errors));
        return null; // non-fatal: don't break the main response
    }
}

module.exports = { uploadAudioToGCS, float32ToWav };
