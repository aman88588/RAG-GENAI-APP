const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

/**
 * Transcribes an audio file using ElevenLabs Scribe API.
 * @param {Object} options
 * @param {string} options.filePath - Temp path of the uploaded audio file
 * @param {string} options.mimeType - MIME type of the file
 * @param {number} options.fileSize - File size in bytes
 * @param {string} options.originalName - Original file name
 * @returns {Promise<TranscriptionResult>}
 */
const transcribeAudio = async ({ filePath, mimeType, fileSize, originalName }) => {
    if (!process.env.ELEVENLABS_API_KEY) {
        throw new Error("ELEVENLABS_API_KEY is not set in environment variables.");
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath), {
        filename: originalName,
        contentType: mimeType,
    });
    formData.append("model_id", "scribe_v2");
    formData.append("diarize", "true");               // enables speaker detection
    formData.append("timestamps_granularity", "word"); // word-level timestamps

    console.log(`[AudioTranscription] Sending file to ElevenLabs: ${originalName} (${(fileSize / 1024).toFixed(1)} KB)`);

    const response = await axios.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        formData,
        {
            headers: {
                ...formData.getHeaders(),
                "xi-api-key": process.env.ELEVENLABS_API_KEY,
            },
            maxBodyLength: Infinity,
            timeout: 120_000, // 2 minutes
        }
    );

    const data = response.data;

    if (!data.text || data.text.trim().length === 0) {
        const err = new Error("ElevenLabs returned an empty transcript.");
        err.statusCode = 422;
        throw err;
    }

    const wordCount = data.text.trim().split(/\s+/).length;
    const warnings = [];

    if (data.language_probability < 0.6) {
        warnings.push(`Low language detection confidence: ${(data.language_probability * 100).toFixed(1)}%`);
    }

    console.log(`[AudioTranscription] Transcription complete. Words: ${wordCount}, Language: ${data.language_code}`);

    return {
        transcript: data.text,
        transcript_word_count: wordCount,
        transcription_warnings: warnings,
        transcription_provider: "elevenlabs",
        transcription_model: "scribe_v2",
        language_code: data.language_code,
        language_probability: data.language_probability,
        audio_duration_secs: data.audio_duration_secs ?? null,
        words: data.words ?? [],                       // word-level data with speaker_id
        mime_type: mimeType,
    };
};

module.exports = { transcribeAudio };