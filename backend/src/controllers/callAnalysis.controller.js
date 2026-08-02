const fs = require("fs/promises");
const { v4: uuidv4 } = require("uuid");
const CallAnalysisModel = require("../models/callAnalysis.model");
const { transcribeAudio } = require("../services/audioTranscription.service");
const { generateSalesInsights } = require("../services/salesInsights.service");
const { generateInsightPDF } = require("../services/pdfReport.service");

const MIN_AUDIO_BYTES = 1024; // 1 KB — reject obviously empty uploads

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Silently removes a temp file (swallows ENOENT — already deleted is fine).
 */
const removeTempFile = async (filePath) => {
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.warn("[CallAnalysis] Could not delete temp file:", err.message);
        }
    }
};

/**
 * Validates the uploaded file from the request.
 * Throws a 400 error if missing or too small.
 */
const extractUploadedFile = (req) => {
    if (!req.file) {
        const err = new Error("No audio file uploaded. Please send an MP3 as form-data field 'audio'.");
        err.statusCode = 400;
        throw err;
    }
    if (req.file.size < MIN_AUDIO_BYTES) {
        const err = new Error("Audio file is too small to contain a valid call recording (minimum 1 KB).");
        err.statusCode = 400;
        throw err;
    }
    return req.file;
};

/**
 * Builds a MongoDB query that matches by _id OR analysis_uuid, scoped to the current user.
 */
const buildCallQuery = (id, userId) => {
    const conditions = [{ analysis_uuid: id }];
    if (/^[0-9a-fA-F]{24}$/.test(id)) conditions.push({ _id: id });
    return { $or: conditions, uploaded_by: userId };
};

/**
 * Marks a call record as failed (best-effort — does not throw).
 */
const markFailed = async (callRecord, message) => {
    if (!callRecord) return;
    try {
        callRecord.status = "failed";
        callRecord.error_message = message;
        await callRecord.save();
    } catch (saveErr) {
        console.error("[CallAnalysis] Could not persist failed status:", saveErr.message);
    }
};

/**
 * Shapes the response object for a successfully analyzed call.
 */
const buildSuccessResponse = (callRecord, insights, transcript, processingMs) => ({
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
    // ── Structured AI Insights ──
    summary: insights.summary,
    lead_quality: insights.lead_quality,
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

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/calls/analyze
 * Upload an MP3, transcribe it via ElevenLabs, generate insights via OpenAI, persist & return.
 */
const AnalyzeCallController = async (req, res) => {
    let audioFilePath = null;
    let callRecord = null;
    const startedAt = Date.now();

    try {
        console.log("[AnalyzeCall] New request received.");

        const audioFile = extractUploadedFile(req);
        audioFilePath = audioFile.path;

        // ── Persist initial record so failed runs are traceable ──
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
        console.log(`[AnalyzeCall] Record created — UUID: ${callRecord.analysis_uuid}`);

        // ── Step 1: Transcribe ──────────────────────────────────────────────
        const transcription = await transcribeAudio({
            filePath: audioFile.path,
            mimeType: audioFile.mimetype,
            fileSize: audioFile.size,
            originalName: audioFile.originalname,
        });

        Object.assign(callRecord, {
            transcript: transcription.transcript,
            transcript_word_count: transcription.transcript_word_count,
            transcription_warnings: transcription.transcription_warnings,
            transcription_provider: transcription.transcription_provider,
            transcription_model: transcription.transcription_model,
            audio_duration_secs: transcription.audio_duration_secs,
            mime_type: transcription.mime_type,
            status: "analyzing",
        });
        await callRecord.save();

        // ── Step 2: Generate Insights ───────────────────────────────────────
        const insights = await generateSalesInsights(transcription.transcript);
        const processingMs = Date.now() - startedAt;

        Object.assign(callRecord, {
            summary: insights.summary,
            lead_quality: insights.lead_quality,
            customer_intent: insights.customer_intent,
            customer_profile: insights.customer_profile,
            recommended_course: insights.recommended_course,
            agent_response_analysis: insights.agent_response_analysis,
            agent_mistakes: insights.agent_mistakes,
            customer_objections: insights.customer_objections,
            customer_pain_points: insights.customer_pain_points,
            sentiment: insights.sentiment,
            improvement_suggestions: insights.improvement_suggestions,
            transcript_was_truncated: insights.transcript_was_truncated,
            insights_model: insights.insights_model,
            processing_ms: processingMs,
            status: "completed",
        });
        await callRecord.save();

        console.log(`[AnalyzeCall] Completed — ${processingMs} ms`);
        return res.status(200).json(
            buildSuccessResponse(callRecord, insights, transcription.transcript, processingMs)
        );
    } catch (error) {
        console.error("[AnalyzeCall] Error:", error.message);
        await markFailed(callRecord, error.message);

        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message:
                statusCode >= 500
                    ? "An unexpected error occurred while processing the recording. Please try again."
                    : error.message,
            analysis_id: callRecord?._id ?? null,
        });
    } finally {
        // Always clean up the temp file regardless of outcome
        await removeTempFile(audioFilePath);
    }
};

/**
 * GET /api/calls?page=1&limit=10
 * Paginated history of the current user's call analyses (transcript field excluded).
 */
const GetCallHistoryController = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const skip = (page - 1) * limit;

        const filter = { uploaded_by: req.userId };

        // Optional status filter: GET /api/calls?status=completed
        if (req.query.status) {
            const allowed = ["transcribing", "analyzing", "completed", "failed"];
            if (allowed.includes(req.query.status)) filter.status = req.query.status;
        }

        const [calls, total] = await Promise.all([
            CallAnalysisModel.find(filter)
                .select("-transcript") // exclude heavy transcript from list
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean({ virtuals: true }),
            CallAnalysisModel.countDocuments(filter),
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
        console.error("[GetCallHistory] Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch call history." });
    }
};

/**
 * GET /api/calls/:id
 * Full details (including transcript) for a single call by _id or analysis_uuid.
 */
const GetCallDetailsController = async (req, res) => {
    try {
        const call = await CallAnalysisModel.findOne(
            buildCallQuery(req.params.id, req.userId)
        ).lean({ virtuals: true });

        if (!call) {
            return res.status(404).json({ success: false, message: "Call analysis not found." });
        }

        return res.status(200).json({ success: true, call });
    } catch (error) {
        console.error("[GetCallDetails] Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to fetch call details." });
    }
};

/**
 * DELETE /api/calls/:id
 * Permanently deletes a call analysis record belonging to the current user.
 */
const DeleteCallController = async (req, res) => {
    try {
        const deleted = await CallAnalysisModel.findOneAndDelete(
            buildCallQuery(req.params.id, req.userId)
        );

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Call analysis not found or access denied.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Call analysis deleted successfully.",
            analysis_id: deleted._id,
        });
    } catch (error) {
        console.error("[DeleteCall] Error:", error.message);
        return res.status(500).json({ success: false, message: "Failed to delete call analysis." });
    }
};

/**
 * GET /api/calls/:id/download-pdf
 * Streams a formatted PDF report of the call's AI insights to the client.
 */
const DownloadInsightPDFController = async (req, res) => {
    try {
        const call = await CallAnalysisModel.findOne(
            buildCallQuery(req.params.id, req.userId)
        ).lean({ virtuals: true });

        if (!call) {
            return res.status(404).json({ success: false, message: "Call analysis not found." });
        }

        if (call.status !== "completed") {
            return res.status(409).json({
                success: false,
                message: `Cannot generate PDF — analysis status is '${call.status}'. Only 'completed' analyses can be exported.`,
            });
        }

        const safeFileName = (call.original_name || "call_report")
            .replace(/[^a-z0-9_-]/gi, "_")
            .slice(0, 60);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${safeFileName}_insight_report.pdf"`
        );

        // generateInsightPDF pipes directly to res and calls doc.end()
        generateInsightPDF(call, res);
    } catch (error) {
        console.error("[DownloadInsightPDF] Error:", error.message);
        // Headers may already be sent if PDF streaming started — guard carefully
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate PDF report. Please try again.",
            });
        }
    }
};

module.exports = {
    AnalyzeCallController,
    GetCallHistoryController,
    GetCallDetailsController,
    DeleteCallController,
    DownloadInsightPDFController,
};
