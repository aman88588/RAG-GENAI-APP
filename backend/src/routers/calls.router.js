const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/auth.middleware");
const { uploadAudio } = require("../middlewares/upload.middleware");

const {
    AnalyzeCallController,
    GetCallHistoryController,
    GetCallDetailsController,
    DeleteCallController,
    DownloadInsightPDFController,
} = require("../controllers/callAnalysis.controller");

/**
 * All routes require a valid JWT.
 *
 * POST   /api/calls/analyze        — Upload MP3, transcribe, analyze
 * GET    /api/calls                 — Paginated call history
 * GET    /api/calls/:id             — Single call details (by _id or analysis_uuid)
 * GET    /api/calls/:id/download-pdf — Download insights as a PDF report
 * DELETE /api/calls/:id             — Delete a call record
 */

router.post("/analyze", verifyToken, uploadAudio.single("audio"), AnalyzeCallController);
router.get("/", verifyToken, GetCallHistoryController);
router.get("/:id/download-pdf", verifyToken, DownloadInsightPDFController);
router.get("/:id", verifyToken, GetCallDetailsController);
router.delete("/:id", verifyToken, DeleteCallController);

module.exports = router;
