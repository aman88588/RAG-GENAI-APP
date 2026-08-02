const fs = require("fs/promises");
const { v4: uuidv4 } = require("uuid");
const CallAnalysisModel = require("../models/callAnalysis.model");
const { transcribeAudio } = require("../services/audioTranscription.service");
const { generateSalesInsights } = require("../services/salesInsights.service");

const MIN_AUDIO_FILE_BYTES = 1024; // 1 KB — reject obviously empty uploads

// ─── Helpers ────────────────────────────────────────────────────────────────

const removeTempFile = async (filePath) => {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            console.warn("[AnalyzeCall] Could not clean up temp file:", error.message);
        }
    }
};

const getRequestFile = (req) => {
    if (!req.file) {
        const error = new Error("No audio file uploaded. Please upload an MP3 call recording.");
        error.statusCode = 400;
        throw error;
    }
    if (req.file.size < MIN_AUDIO_FILE_BYTES) {
        const error = new Error("Audio file is too small to contain a valid call recording.");
        error.statusCode = 400;
        throw error;
    }
    return req.file;
};

const buildCallLookup = (id, userId) => {
    const lookup = [{ analysis_uuid: id }];
    if (/^[0-9a-fA-F]{24}$/.test(id)) lookup.push({ _id: id });
    return { $or: lookup, uploaded_by: userId };
};

const updateFailedRecord = async (callRecord, message) => {
    if (!callRecord) return;
    try {
        callRecord.status = "failed";
        callRecord.error_message = message;
        await callRecord.save();
    } catch (err) {
        console.error("[AnalyzeCall] Failed to persist error record:", err.message);
    }
};

const toInsightResponse = (callRecord, insights, transcript, processingMs) => ({
    success: true,
    message: "Call recording analyzed successfully.",
    analysis_id: callRecord._id,
    analysis_uuid: callRecord.analysis_uuid,
    file: {
        name: callRecord.original_name,
        size_mb: callRecord.file_size_mb,
        mime_type: callRecord.mime_type,
    },
    transcript,
    transcript_word_count: callRecord.transcript_word_count,
    transcription_warnings: callRecord.transcription_warnings,
    processing_ms: processingMs,
    // Structured insights from GPT
    summary: insights.summary,
    customer_intent: insights.customer_intent,
    customer_profile: insights.customer_profile,
    recommended_course: insights.recommended_course,
    agent_response_analysis: insights.agent_response_analysis,
    agent_mistakes: insights.agent_mistakes,
    customer_objections: insights.customer_objections,
    customer_pain_points: insights.customer_pain_points,
    sentiment: insights.sentiment,
    improvement_suggestions: insights.improvement_suggestions,
});

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/calls/analyze
 * Upload an MP3, transcribe it, and generate full sales insights.
 */
const AnalyzeCallController = async (req, res) => {
    let audioFilePath = null;
    let callRecord = null;
    const startedAt = Date.now();

    try {
        console.log("[AnalyzeCall] Request received.");

        const audioFile = getRequestFile(req);
        audioFilePath = audioFile.path;

        // Persist initial record so we can track status
        callRecord = new CallAnalysisModel({
            analysis_uuid: uuidv4(),
            file_name: audioFile.filename,
            original_name: audioFile.originalname,
            file_size: audioFile.size,
            mime_type: audioFile.mimetype,
            uploaded_by: req.userId,
            status: "transcribing",
        });
        await callRecord.save();

        // Step 1 — Transcribe
        const transcriptionResult = await transcribeAudio({
            filePath: audioFile.path,
            mimeType: audioFile.mimetype,
            fileSize: audioFile.size,
            originalName: audioFile.originalname,
        });

        callRecord.transcript = transcriptionResult.transcript;
        callRecord.transcript_word_count = transcriptionResult.transcript_word_count;
        callRecord.transcription_warnings = transcriptionResult.transcription_warnings;
        callRecord.transcription_provider = transcriptionResult.transcription_provider;
        callRecord.transcription_model = transcriptionResult.transcription_model;
        callRecord.mime_type = transcriptionResult.mime_type;
        callRecord.status = "analyzing";
        await callRecord.save();

        // Step 2 — Generate insights
        const insights = await generateSalesInsights(transcriptionResult.transcript);
        const processingMs = Date.now() - startedAt;

        callRecord.summary = insights.summary;
        callRecord.customer_intent = insights.customer_intent;
        callRecord.customer_profile = insights.customer_profile;
        callRecord.recommended_course = insights.recommended_course;
        callRecord.agent_response_analysis = insights.agent_response_analysis;
        callRecord.agent_mistakes = insights.agent_mistakes;
        callRecord.customer_objections = insights.customer_objections;
        callRecord.customer_pain_points = insights.customer_pain_points;
        callRecord.sentiment = insights.sentiment;
        callRecord.improvement_suggestions = insights.improvement_suggestions;
        callRecord.transcript_was_truncated = insights.transcript_was_truncated;
        callRecord.insights_model = insights.insights_model;
        callRecord.processing_ms = processingMs;
        callRecord.status = "completed";
        await callRecord.save();

        return res.status(200).json(
            toInsightResponse(callRecord, insights, transcriptionResult.transcript, processingMs)
        );
    } catch (error) {
        console.error("[AnalyzeCall] Failed:", error);
        await updateFailedRecord(callRecord, error.message);

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message:
                statusCode >= 500
                    ? "An unexpected error occurred while processing the call recording."
                    : error.message,
            error: error.message,
            analysis_id: callRecord?._id,
        });
    } finally {
        await removeTempFile(audioFilePath);
    }
};

/**
 * GET /api/calls?page=1&limit=10
 * Paginated list of past analyses (transcript excluded).
 */
const GetCallHistoryController = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const [calls, total] = await Promise.all([
            CallAnalysisModel.find({ uploaded_by: req.userId })
                .select("-transcript")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean({ virtuals: true }),
            CallAnalysisModel.countDocuments({ uploaded_by: req.userId }),
        ]);

        return res.status(200).json({
            success: true,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
            calls,
        });
    } catch (error) {
        console.error("[GetCallHistory] Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/calls/:id
 * Full details of a single call analysis.
 */
const GetCallDetailsController = async (req, res) => {
    try {
        const { id } = req.params;
        const call = await CallAnalysisModel.findOne(buildCallLookup(id, req.userId));

        if (!call) {
            return res.status(404).json({ success: false, message: "Call analysis not found." });
        }

        return res.status(200).json({ success: true, call });
    } catch (error) {
        console.error("[GetCallDetails] Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/calls/:id
 * Permanently delete a call analysis record.
 */
const DeleteCallController = async (req, res) => {
    try {
        const { id } = req.params;
        const call = await CallAnalysisModel.findOneAndDelete(buildCallLookup(id, req.userId));

        if (!call) {
            return res.status(404).json({
                success: false,
                message: "Call analysis not found or access denied.",
            });
        }

        return res.status(200).json({ success: true, message: "Call analysis deleted successfully." });
    } catch (error) {
        console.error("[DeleteCall] Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    AnalyzeCallController,
    GetCallHistoryController,
    GetCallDetailsController,
    DeleteCallController,
};