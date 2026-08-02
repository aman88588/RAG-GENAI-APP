const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// ── Upload directory ────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "audio");
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Storage ─────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const safeBase = path
            .basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-z0-9_-]/gi, "_")
            .slice(0, 80);
        const unique = `${Date.now()}_${uuidv4()}_${safeBase}.mp3`;
        cb(null, unique);
    },
});

// ── MIME / extension allowlist ──────────────────────────────────────────────
const ALLOWED_MIMETYPES = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/mpeg3",
    "audio/x-mpeg-3",
    "application/octet-stream", // some browsers send MP3 as this
]);
const MP3_EXTENSION = /\.mp3$/i;

const fileFilter = (_req, file, cb) => {
    const extOk = MP3_EXTENSION.test(path.extname(file.originalname));
    const mimeOk = ALLOWED_MIMETYPES.has(file.mimetype);
    if (extOk && mimeOk) {
        return cb(null, true);
    }
    const err = new Error("Only MP3 audio files are accepted. Please upload a valid .mp3 file.");
    err.statusCode = 400;
    return cb(err, false);
};

// ── Multer instance ─────────────────────────────────────────────────────────
const MAX_MB = Number(process.env.MAX_AUDIO_UPLOAD_MB) || 50;

const _multerUpload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_MB * 1024 * 1024 },
});

/**
 * Wraps a multer upload function with standardized error handling.
 * Returns an Express middleware.
 *
 * @param {Function} uploader - e.g. _multerUpload.single('audio')
 */
const wrapUpload = (uploader) => (req, res, next) => {
    uploader(req, res, (err) => {
        if (!err) return next();

        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: `Audio file exceeds the maximum allowed size of ${MAX_MB} MB.`,
                });
            }
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        }

        // fileFilter rejections + other errors
        return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    });
};

/**
 * uploadAudio — a multer middleware object with a .single() method.
 * Usage: uploadAudio.single("audio")  (returns an Express middleware)
 *
 * Route usage example:
 *   router.post("/analyze", verifyToken, uploadAudio.single("audio"), AnalyzeCallController);
 */
const uploadAudio = {
    single: (fieldName) => wrapUpload(_multerUpload.single(fieldName)),
    array: (fieldName, max) => wrapUpload(_multerUpload.array(fieldName, max)),
    fields: (fields) => wrapUpload(_multerUpload.fields(fields)),
};

module.exports = { uploadAudio };
