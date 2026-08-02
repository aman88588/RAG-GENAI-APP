const OpenAI = require("openai");

// GPT-4o-mini supports ~128k context; keep under 80k chars to leave room for prompt + output
const MAX_TRANSCRIPT_CHARS = 80_000;

const SYSTEM_PROMPT = `You are an expert sales call analyst specialising in EdTech and university admissions calls.
Analyse the given call transcript and return ONLY a raw JSON object — no markdown, no code fences, no extra text.

Return this exact JSON schema:
{
  "summary": "string — concise paragraph overview of the entire conversation",
  "customer_intent": {
    "goal": "string — what the customer wants to achieve",
    "interest_level": "hot | warm | cold",
    "key_requirements": ["string"]
  },
  "lead_quality": {
    "classification": "Hot | Warm | Cold",
    "reasoning": "string — 2-3 sentence explanation for the classification"
  },
  "customer_profile": {
    "current_job": "string or null",
    "experience_years": "string or null",
    "education": "string or null",
    "career_goals": "string or null"
  },
  "recommended_course": {
    "course_name": "string or null",
    "specialization": "string or null",
    "reason": "string or null"
  },
  "agent_response_analysis": {
    "incorrect_information": [
      {
        "customer_question": "string",
        "agent_response": "string",
        "issue": "incorrect | misleading | incomplete",
        "explanation": "string"
      }
    ],
    "missed_questions": [
      {
        "customer_question": "string",
        "expected_answer": "string"
      }
    ]
  },
  "agent_mistakes": ["string"],
  "customer_objections": ["string"],
  "customer_pain_points": ["string"],
  "sentiment": {
    "overall": "positive | neutral | negative",
    "customer_tone": "string",
    "agent_tone": "string"
  },
  "improvement_suggestions": ["string"]
}

Rules:
- Be specific and factual — only reference things actually said in the transcript.
- Verify claims about fees, accreditations, degree formats, and pass criteria carefully.
- lead_quality classification MUST be one of: Hot, Warm, Cold.
- Use null for unavailable string fields and [] for empty arrays.
- Return ONLY the JSON object.`;

/**
 * Generates structured sales insights from a call transcript using OpenAI gpt-4o-mini.
 *
 * @param {string} transcript - The full call transcript
 * @returns {Promise<Object>} Parsed insights object
 */
const generateSalesInsights = async (transcript) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        const err = new Error("OPENAI_API_KEY is not configured in environment variables.");
        err.statusCode = 500;
        throw err;
    }

    const client = new OpenAI({ apiKey });

    let processedTranscript = transcript;
    let transcript_was_truncated = false;

    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
        processedTranscript = transcript.slice(0, MAX_TRANSCRIPT_CHARS);
        transcript_was_truncated = true;
        console.warn(
            `[SalesInsights] Transcript truncated from ${transcript.length} → ${MAX_TRANSCRIPT_CHARS} chars.`
        );
    }

    console.log("[SalesInsights] Sending transcript to OpenAI for analysis...");

    let completion;
    try {
        completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.2,
            max_tokens: 2500,
            response_format: { type: "json_object" }, // forces structured JSON output
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                    role: "user",
                    content: `Analyse this sales call transcript:\n\n${processedTranscript}`,
                },
            ],
        });
    } catch (openAiErr) {
        const status = openAiErr.status;
        if (status === 401) {
            const err = new Error("OpenAI API key is invalid or has been revoked.");
            err.statusCode = 502;
            throw err;
        }
        if (status === 429) {
            const err = new Error("OpenAI rate limit reached. Please try again shortly.");
            err.statusCode = 429;
            throw err;
        }
        const err = new Error(`OpenAI API error: ${openAiErr.message}`);
        err.statusCode = 502;
        throw err;
    }

    const rawOutput = completion.choices[0]?.message?.content ?? "";

    let insights;
    try {
        // Strip accidental markdown fences — defensive even with response_format=json_object
        const clean = rawOutput.replace(/```json|```/gi, "").trim();
        insights = JSON.parse(clean);
    } catch {
        const err = new Error("OpenAI returned malformed JSON for sales insights.");
        err.statusCode = 502;
        err.rawOutput = rawOutput;
        throw err;
    }

    console.log("[SalesInsights] Analysis complete.");

    return {
        ...insights,
        transcript_was_truncated,
        insights_model: completion.model,
    };
};

module.exports = { generateSalesInsights };
