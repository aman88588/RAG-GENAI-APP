# CallInsight

CallInsight is a full-stack AI application for analyzing MP3 sales call recordings. Users upload a call recording, the backend transcribes the audio with Gemini speech-to-text prompting, and the transcript is analyzed into structured sales insights.

## Workflow

1. Upload an MP3 call recording from the dashboard.
2. The backend validates and temporarily stores the MP3 file.
3. Gemini transcribes the audio into a speaker-aware text transcript.
4. Gemini analyzes the transcript and returns structured JSON.
5. The analysis is saved to MongoDB and shown in call history.

## Output Format

```json
{
  "summary": "...",
  "customer_intent": "...",
  "lead_quality": "Hot",
  "lead_quality_reason": "...",
  "agent_mistakes": ["...", "..."],
  "improvement_suggestions": ["...", "..."]
}
```

## Backend Tech Stack

- Node.js and Express for REST APIs
- Multer for MP3 upload handling
- Google Gemini via `@google/generative-ai` for transcription and insight generation
- MongoDB and Mongoose for users and call analysis records
- JWT and bcrypt for authentication
- dotenv and cors for configuration and API access

## Frontend Tech Stack

- React with TypeScript
- Tailwind CSS
- React Router
- Lucide Icons

## Key API Routes

- `POST /api/v1/audio/analyze` - upload field `audio` with an MP3 file
- `GET /api/v1/audio/history` - list recent call analyses for the authenticated user
- `GET /api/v1/audio/:id` - fetch a saved analysis and transcript
- `DELETE /api/v1/audio/:id` - delete a saved analysis

All audio routes require `Authorization: Bearer <token>`.

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=4000
NODE_ENV=development
DEV_MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/CALL-INSIGHT
JWT_SECRET_KEY=<your_jwt_secret_key>
GEMINI_API_KEY=<your_gemini_api_key>
DEV_GENERATIVE_MODEL=gemini-2.0-flash

# Optional
DEV_TRANSCRIPTION_MODEL=gemini-2.0-flash
MAX_AUDIO_UPLOAD_MB=50
INLINE_AUDIO_LIMIT_MB=18
MAX_TRANSCRIPT_ANALYSIS_CHARS=120000
```

Run the backend:

```bash
npm run dev
```

## Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_BACKEND_API=http://localhost:4000
```

Run the frontend:

```bash
npm run dev
```

The app opens on `http://localhost:5173` by default.
