import React, { useRef, useState } from 'react';
import { FileAudio, Upload, X, Mic2, Loader2 } from 'lucide-react';

const MAX_MB = 50;

type Stage = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'complete';

interface AudioUploadProps {
  onAnalyze: (file: File) => Promise<void>;
  isAnalyzing: boolean;
  stage: Stage;
  progress: number;
  onReset: () => void;
}

const STAGE_LABELS: Record<Stage, string> = {
  idle: 'Ready',
  uploading: 'Uploading MP3…',
  transcribing: 'Transcribing speech…',
  analyzing: 'Generating insights…',
  complete: 'Complete ✓',
};

export function AudioUpload({ onAnalyze, isAnalyzing, stage, progress, onReset }: AudioUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.mp3')) return 'Only MP3 files are supported.';
    if (file.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB} MB.`;
    if (file.size < 1024) return 'File is too small. Please upload a valid MP3 recording.';
    return null;
  };

  const pickFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onReset();
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    await onAnalyze(selectedFile);
  };

  const stageLabel = STAGE_LABELS[stage];
  const showProgress = stage !== 'idle' && stage !== 'complete';

  // ── Empty state (drop zone) ─────────────────────────────────────────────────
  if (!selectedFile) {
    return (
      <div className="card p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-900">Upload Call Recording</h2>
        <p className="mb-6 text-sm text-slate-500">Upload an MP3 sales call to transcribe and analyze with AI.</p>

        <div
          className={`drop-zone ${dragActive ? 'drop-zone-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Upload MP3 file"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Drag & drop your MP3 here</p>
          <p className="mt-1 text-sm text-slate-500">or click to browse</p>
          <button
            type="button"
            className="btn-primary mt-6"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            <FileAudio className="h-4 w-4" />
            Browse MP3
          </button>
          <p className="mt-4 text-xs text-slate-400">MP3 only · Max {MAX_MB} MB</p>
        </div>

        {fileError && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
            {fileError}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,audio/mpeg,audio/mp3"
          onChange={handleFileInput}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    );
  }

  // ── File selected state ─────────────────────────────────────────────────────
  return (
    <div className="card p-6 animate-fade-in">
      {/* File info row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
            <FileAudio className="h-7 w-7 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{selectedFile.name}</p>
            <p className="text-sm text-slate-500">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
        </div>
        {!isAnalyzing && (
          <button
            onClick={handleReset}
            className="btn-secondary shrink-0 !px-3 !py-2"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>

      {/* Progress */}
      {(isAnalyzing || stage === 'complete') && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{stageLabel}</span>
            <span className="font-semibold text-blue-600">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Stage steps */}
          <div className="flex items-center gap-2 pt-1">
            {(['uploading', 'transcribing', 'analyzing'] as Stage[]).map((s, idx) => {
              const stageOrder: Stage[] = ['uploading', 'transcribing', 'analyzing', 'complete'];
              const currentIdx = stageOrder.indexOf(stage);
              const isPast = currentIdx > idx;
              const isActive = stage === s;
              return (
                <React.Fragment key={s}>
                  <span className={`text-xs font-medium transition-colors ${
                    isActive ? 'text-blue-600' : isPast ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                  {idx < 2 && <span className="h-px flex-1 bg-slate-200" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Analyze button */}
      {!isAnalyzing && stage !== 'complete' && (
        <button
          onClick={handleAnalyze}
          className="btn-primary mt-6 w-full sm:w-auto"
          disabled={isAnalyzing}
        >
          <Mic2 className="h-4 w-4" />
          Analyze Call
        </button>
      )}

      {isAnalyzing && (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
          <p className="text-sm font-medium text-blue-800">Processing your call recording…</p>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".mp3" className="hidden" aria-hidden="true" />
    </div>
  );
}
