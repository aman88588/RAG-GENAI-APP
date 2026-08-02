const express = require('express');
const { AuthMiddleware } = require('../../middlewares/auth.middleware');
const multerAudioMiddleware = require('../../middlewares/multerAudio.middleware');
const {
    AnalyzeCallController,
    GetCallHistoryController,
    GetCallDetailsController,
    DeleteCallController
} = require('../../controllers/AnalyzeCallController.controller');

const audioRouter = express.Router();

// POST /api/v1/audio/analyze
// Upload an MP3 call recording, transcribe it, and return structured sales insights
audioRouter.post('/analyze', multerAudioMiddleware, AnalyzeCallController);

// GET /api/v1/audio/history
// List all call analysis records for the authenticated user
audioRouter.get('/history', GetCallHistoryController);

// GET /api/v1/audio/:id
// Get full details of a single call analysis (includes transcript)
audioRouter.get('/:id', GetCallDetailsController);

// DELETE /api/v1/audio/:id
// Delete a call analysis record
audioRouter.delete('/:id', DeleteCallController);

module.exports = audioRouter;
