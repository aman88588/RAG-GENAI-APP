import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { callsApi } from '../services/api.service';
import type { CallAnalysis } from '../services/api.service';
import { AudioUpload } from '../components/AudioUpload';
import { DashboardLayout } from '../components/DashboardLayout';
import { Toast, useToastState } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/Spinner';

type Stage = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'complete';

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, dismiss } = useToastState();
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/signin');
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // ── Analyze ────────────────────────────────────────────────────────────────
  const handleAnalyze = async (file: File) => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setProgress(5);
    setStage('uploading');

    progressTimerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 4, 90);
        if (next > 20 && next <= 55) setStage('transcribing');
        if (next > 55) setStage('analyzing');
        return next;
      });
    }, 700);

    try {
      const data = await callsApi.analyze(file);

      setProgress(100);
      setStage('complete');

      // Build a minimal stub to prepend to history — full data will come from /calls/:id
      const stub: CallAnalysis = {
        _id: data.analysis_id,
        analysis_uuid: data.analysis_uuid,
        file_name: data.file.name,
        original_name: data.file.name,
        file_size: 0,
        file_size_mb: data.file.size_mb,
        mime_type: data.file.mime_type,
        uploaded_by: '',
        status: 'completed',
        error_message: null,
        transcript: data.transcript,
        transcript_word_count: data.transcript_word_count,
        transcription_warnings: data.transcription_warnings || [],
        transcription_provider: 'elevenlabs',
        transcription_model: 'scribe_v1',
        transcript_was_truncated: false,
        audio_duration_secs: null,
        summary: data.summary,
        lead_quality: data.lead_quality,
        customer_intent: data.customer_intent,
        customer_profile: data.customer_profile,
        recommended_course: data.recommended_course,
        agent_response_analysis: data.agent_response_analysis,
        agent_mistakes: data.agent_mistakes || [],
        customer_objections: data.customer_objections || [],
        customer_pain_points: data.customer_pain_points || [],
        sentiment: data.sentiment,
        improvement_suggestions: data.improvement_suggestions || [],
        insights_model: null,
        processing_ms: data.processing_ms,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      showToast('Analysis complete! Redirecting…', 'success');

      // Navigate to the detail page — URL-based, survives refresh
      setTimeout(() => {
        navigate(`/dashboard/calls/${stub._id}`);
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Call analysis failed.';
      showToast(msg, 'error');
      setStage('idle');
      setProgress(0);
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setStage('idle');
    setProgress(0);
  };

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  const firstName = user?.fullName?.split(' ')[0] || '';

  return (
    <DashboardLayout>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={dismiss} />}

      {/* Page header */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
            <Mic2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              New Analysis
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {firstName ? `Welcome back, ${firstName}` : 'Upload a Call'}
            </h1>
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-slate-500">
          Upload an MP3 call recording to generate a full transcript, lead quality score, agent
          coaching insights, and improvement suggestions — all saved to your history.
        </p>
      </header>

      {/* Upload area (full width on upload page) */}
      <div className="max-w-2xl">
        <AudioUpload
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          stage={stage}
          progress={progress}
          onReset={handleReset}
        />
      </div>
    </DashboardLayout>
  );
}
