# Troubleshooting Guide

## Backend Will Not Start

Check that `backend/.env` includes the required values:

```env
PORT=4000
NODE_ENV=development
DEV_MONGODB_URI=<your_mongodb_uri>
JWT_SECRET_KEY=<your_jwt_secret_key>
GEMINI_API_KEY=<your_gemini_api_key>
DEV_GENERATIVE_MODEL=gemini-2.0-flash
```

Then restart the backend:

```bash
cd backend
npm run dev
```

## MP3 Upload Fails

- Use form-data field name `audio`.
- Upload only `.mp3` files.
- Keep files under `MAX_AUDIO_UPLOAD_MB`, which defaults to `50`.
- Include `Authorization: Bearer <token>` on `/api/v1/audio/*` routes.

Example:

```bash
curl -X POST http://localhost:4000/api/v1/audio/analyze \
  -H "Authorization: Bearer <token>" \
  -F "audio=@/path/to/call-recording.mp3"
```

## Transcription Fails

Common causes:

- `GEMINI_API_KEY` is missing or invalid.
- The MP3 is silent, too short, or has no intelligible speech.
- The recording quality is poor enough that the model cannot recover useful text.
- Very large audio files can time out while Gemini processes the file.

Helpful optional environment values:

```env
DEV_TRANSCRIPTION_MODEL=gemini-2.0-flash
INLINE_AUDIO_LIMIT_MB=18
GEMINI_FILE_PROCESSING_TIMEOUT_MS=90000
TRANSCRIPTION_MAX_OUTPUT_TOKENS=8192
```

## Frontend Cannot Reach Backend

Check `frontend/.env`:

```env
VITE_BACKEND_API=http://localhost:4000
```

Restart the Vite dev server after changing environment variables.

## Expected Response Codes

- `200`: Call analysis completed.
- `400`: Missing file, invalid file type, or file too small.
- `401`: Missing or invalid auth token.
- `422`: Audio could not be transcribed usefully.
- `500`: Server or AI provider error.
- `504`: Uploaded audio file processing timed out.
