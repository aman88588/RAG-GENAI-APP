const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GPT-4o-mini handles ~128k tokens; keep transcript under ~80k chars to leave room for prompt + output
const MAX_TRANSCRIPT_CHARS = 80_000;

const SYSTEM_PROMPT = `You are an expert sales call analyst specializing in EdTech / university admissions calls.
Analyze the given call transcript and return a JSON object — no markdown, no code fences, just raw valid JSON.

The JSON must follow this exact schema:
{
  "summary": "string — concise overview of the entire conversation",
  "customer_intent": {
    "goal": "string — what the customer wants to achieve",
    "interest_level": "high | medium | low",
    "key_requirements": ["string"]
  },
  "customer_profile": {
    "current_job": "string",
    "experience_years": "string",
    "education": "string",
    "career_goals": "string"
  },
  "recommended_course": {
    "course_name": "string",
    "specialization": "string",
    "reason": "string"
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
- For incorrect_information, carefully verify claims about fees, accreditations, degree formats, and pass criteria.
- If a field has no data, use null for strings or [] for arrays.
- Return ONLY the JSON object. No explanation before or after.`;

/**
 * Generates structured sales insights from a call transcript using OpenAI.
 * @param {string} transcript - The full transcript text
 * @returns {Promise<SalesInsights>}
 */
const generateSalesInsights = async (transcript) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables.");
  }

  let processedTranscript = transcript;
  let transcript_was_truncated = false;

  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    processedTranscript = transcript.slice(0, MAX_TRANSCRIPT_CHARS);
    transcript_was_truncated = true;
    console.warn(`[SalesInsights] Transcript truncated from ${transcript.length} to ${MAX_TRANSCRIPT_CHARS} chars.`);
  }

  console.log("[SalesInsights] Sending transcript to OpenAI for analysis...");

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2, // lower = more deterministic / factual
    max_tokens: 2000,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Analyze this call transcript:\n\n${processedTranscript}` },
    ],
  });

  const rawOutput = completion.choices[0]?.message?.content ?? "";

  let insights;
  try {
    // Strip accidental markdown fences if the model adds them
    const clean = rawOutput.replace(/```json|```/gi, "").trim();
    insights = JSON.parse(clean);
  } catch {
    const err = new Error("OpenAI returned non-JSON output for sales insights.");
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