const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure the upload directory exists
const uploadDir = 'uploads/audio';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeBaseName = path
            .basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-z0-9_-]/gi, '_')
            .slice(0, 80);
        const uniqueName = `${Date.now()}_${uuidv4()}_${safeBaseName}.mp3`;
        cb(null, uniqueName);
    }
});

// Accept MP3 call recordings. Some browsers upload MP3s as octet-stream.
const ALLOWED_MIMETYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mpeg3',
    'audio/x-mpeg-3',
    'application/octet-stream'
];

const ALLOWED_EXTENSIONS = /\.mp3$/i;

const fileFilter = (req, file, cb) => {
    const extOk = ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
    const mimeOk = ALLOWED_MIMETYPES.includes(file.mimetype);

    if (extOk && mimeOk) {
        return cb(null, true);
    }
    return cb(new Error('Only MP3 audio files are allowed'), false);
};

const uploadAudio = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: (Number(process.env.MAX_AUDIO_UPLOAD_MB) || 50) * 1024 * 1024
    }
}).single('audio'); // field name in form-data

// Wrapper middleware with proper error handling
const multerAudioMiddleware = (req, res, next) => {
    uploadAudio(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `Audio file is too large. Maximum allowed size is ${Number(process.env.MAX_AUDIO_UPLOAD_MB) || 50}MB.`
                });
            }
            return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

module.exports = multerAudioMiddleware;
