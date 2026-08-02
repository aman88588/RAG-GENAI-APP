const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const MIN_WORD_COUNT = 3;
const TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Transcribes an MP3 audio file using the ElevenLabs Scribe v2 API.
 *
 * @param {Object} options
 * @param {string} options.filePath       - Absolute path to the temp audio file
 * @param {string} options.mimeType       - MIME type (e.g. "audio/mpeg")
 * @param {number} options.fileSize       - File size in bytes
 * @param {string} options.originalName   - Original file name uploaded by the user
 *
 * @returns {Promise<{
 *   transcript: string,
 *   transcript_word_count: number,
 *   transcription_warnings: string[],
 *   transcription_provider: string,
 *   transcription_model: string,
 *   language_code: string|null,
 *   audio_duration_secs: number|null,
 *   mime_type: string
 * }>}
 */
const transcribeAudio = async ({ filePath, mimeType, fileSize, originalName }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        const err = new Error(
            "ElevenLabs API key is not configured. Set ELEVENLABS_API_KEY in your .env file."
        );
        err.statusCode = 500;
        throw err;
    }

    // Verify the temp file is still accessible before sending
    try {
        await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
        const err = new Error("Uploaded audio file is no longer accessible on disk.");
        err.statusCode = 500;
        throw err;
    }

    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath), {
        filename: originalName,
        contentType: mimeType,
    });
    formData.append("model_id", "scribe_v1");  // scribe_v1 is the stable production model
    formData.append("diarize", "true");           // speaker detection
    formData.append("timestamps_granularity", "word");

    console.log(
        `[AudioTranscription] Sending to ElevenLabs — file: ${originalName} | size: ${(fileSize / 1024).toFixed(1)} KB`
    );

    let response;
    try {
        response = await axios.post(
            "https://api.elevenlabs.io/v1/speech-to-text",
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    "xi-api-key": apiKey,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: TIMEOUT_MS,
            }
        );
    } catch (axiosErr) {
        const status = axiosErr.response?.status;
        const detail = axiosErr.response?.data?.detail || axiosErr.message;

        if (axiosErr.code === "ECONNABORTED") {
            const err = new Error("Transcription request timed out. The audio file may be too long.");
            err.statusCode = 504;
            throw err;
        }
        if (status === 401 || status === 403) {
            const err = new Error("ElevenLabs API authentication failed. Check your ELEVENLABS_API_KEY.");
            err.statusCode = 502;
            throw err;
        }
        if (status === 422) {
            const err = new Error(`ElevenLabs rejected the audio file: ${detail}`);
            err.statusCode = 422;
            throw err;
        }

        const err = new Error(`Transcription service error (${status || "network"}): ${detail}`);
        err.statusCode = 502;
        throw err;
    }

    const data = response.data;
    const rawText = (data.text || "").trim();

    if (!rawText) {
        const err = new Error(
            "Transcription returned an empty result. The audio may be silent, too noisy, or too short."
        );
        err.statusCode = 422;
        throw err;
    }

    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const warnings = [];

    if (wordCount < MIN_WORD_COUNT) {
        warnings.push(`Very short transcript (${wordCount} word(s)). Audio quality may be poor.`);
    }
    if (data.language_probability != null && data.language_probability < 0.6) {
        warnings.push(
            `Low language detection confidence: ${(data.language_probability * 100).toFixed(1)}%. Consider uploading clearer audio.`
        );
    }

    console.log(
        `[AudioTranscription] Done — words: ${wordCount} | lang: ${data.language_code ?? "unknown"}`
    );

    return {
        transcript: rawText,
        transcript_word_count: wordCount,
        transcription_warnings: warnings,
        transcription_provider: "elevenlabs",
        transcription_model: "scribe_v1",
        language_code: data.language_code ?? null,
        audio_duration_secs: data.audio_duration_secs ?? null,
        mime_type: mimeType,
    };
};

module.exports = { transcribeAudio };
