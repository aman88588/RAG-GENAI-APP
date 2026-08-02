const mongoose = require("mongoose");

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const CustomerIntentSchema = new mongoose.Schema(
    {
        goal: { type: String, default: null },
        interest_level: {
            type: String,
            enum: ["high", "medium", "low", "hot", "warm", "cold", null],
            default: null,
        },
        key_requirements: { type: [String], default: [] },
    },
    { _id: false }
);

const LeadQualitySchema = new mongoose.Schema(
    {
        classification: {
            type: String,
            enum: ["Hot", "Warm", "Cold", null],
            default: null,
        },
        reasoning: { type: String, default: null },
    },
    { _id: false }
);

const CustomerProfileSchema = new mongoose.Schema(
    {
        current_job: { type: String, default: null },
        experience_years: { type: String, default: null },
        education: { type: String, default: null },
        career_goals: { type: String, default: null },
    },
    { _id: false }
);

const RecommendedCourseSchema = new mongoose.Schema(
    {
        course_name: { type: String, default: null },
        specialization: { type: String, default: null },
        reason: { type: String, default: null },
    },
    { _id: false }
);

const IncorrectInfoSchema = new mongoose.Schema(
    {
        customer_question: { type: String },
        agent_response: { type: String },
        issue: { type: String, enum: ["incorrect", "misleading", "incomplete"] },
        explanation: { type: String },
    },
    { _id: false }
);

const MissedQuestionSchema = new mongoose.Schema(
    {
        customer_question: { type: String },
        expected_answer: { type: String },
    },
    { _id: false }
);

const AgentResponseAnalysisSchema = new mongoose.Schema(
    {
        incorrect_information: { type: [IncorrectInfoSchema], default: [] },
        missed_questions: { type: [MissedQuestionSchema], default: [] },
    },
    { _id: false }
);

const SentimentSchema = new mongoose.Schema(
    {
        overall: {
            type: String,
            enum: ["positive", "neutral", "negative", null],
            default: null,
        },
        customer_tone: { type: String, default: null },
        agent_tone: { type: String, default: null },
    },
    { _id: false }
);

// ── Main schema ──────────────────────────────────────────────────────────────

const CallAnalysisSchema = new mongoose.Schema(
    {
        // ── Identity ──
        analysis_uuid: { type: String, required: true, unique: true, index: true },

        // ── File metadata ──
        file_name: { type: String, required: true },
        original_name: { type: String, required: true },
        file_size: { type: Number, required: true }, // bytes
        mime_type: { type: String, default: null },
        uploaded_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // ── Processing status ──
        status: {
            type: String,
            enum: ["transcribing", "analyzing", "completed", "failed"],
            default: "transcribing",
            index: true,
        },
        error_message: { type: String, default: null },

        // ── Transcription ──
        transcript: { type: String, default: null },
        transcript_word_count: { type: Number, default: 0 },
        transcription_warnings: { type: [String], default: [] },
        transcription_provider: { type: String, default: "elevenlabs" },
        transcription_model: { type: String, default: "scribe_v1" },
        transcript_was_truncated: { type: Boolean, default: false },
        audio_duration_secs: { type: Number, default: null },

        // ── AI Insights ──
        summary: { type: String, default: null },
        lead_quality: { type: LeadQualitySchema, default: () => ({}) },
        customer_intent: { type: CustomerIntentSchema, default: () => ({}) },
        customer_profile: { type: CustomerProfileSchema, default: () => ({}) },
        recommended_course: { type: RecommendedCourseSchema, default: () => ({}) },
        agent_response_analysis: { type: AgentResponseAnalysisSchema, default: () => ({}) },
        agent_mistakes: { type: [String], default: [] },
        customer_objections: { type: [String], default: [] },
        customer_pain_points: { type: [String], default: [] },
        sentiment: { type: SentimentSchema, default: () => ({}) },
        improvement_suggestions: { type: [String], default: [] },
        insights_model: { type: String, default: null },

        // ── Performance ──
        processing_ms: { type: Number, default: null },
    },
    {
        timestamps: true, // createdAt, updatedAt
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: human-readable file size
CallAnalysisSchema.virtual("file_size_mb").get(function () {
    return this.file_size
        ? parseFloat((this.file_size / (1024 * 1024)).toFixed(2))
        : null;
});

module.exports = mongoose.model("CallAnalysis", CallAnalysisSchema);
