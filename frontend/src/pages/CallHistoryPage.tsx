import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, PhoneCall, RefreshCw, Trash2, Loader2,
  ChevronRight, Upload, AlertCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { callsApi } from '../services/api.service';
import type { CallAnalysis } from '../services/api.service';
import { DashboardLayout } from '../components/DashboardLayout';
import { LeadBadge } from '../components/LeadBadge';
import { Toast, useToastState } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/Spinner';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
};

const StatusPill = ({ status }: { status: CallAnalysis['status'] }) => {
  const styles: Record<CallAnalysis['status'], string> = {
    completed: 'badge-completed',
    failed: 'badge-failed',
    transcribing: 'badge-pending',
    analyzing: 'badge-pending',
  };
  const labels: Record<CallAnalysis['status'], string> = {
    completed: '✓ Completed',
    failed: '✗ Failed',
    transcribing: 'Transcribing…',
    analyzing: 'Analyzing…',
  };
  return <span className={`${styles[status]} text-[11px]`}>{labels[status]}</span>;
};

// ── Page ──────────────────────────────────────────────────────────────────────

const LIMIT = 15;

export default function CallHistoryPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, dismiss } = useToastState();

  const [calls, setCalls] = useState<CallAnalysis[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/signin');
  }, [authLoading, isAuthenticated, navigate]);

  // ── Stable fetch function using ref to avoid stale closures ─────────────────
  const fetchHistory = useRef(async (p: number) => {});
  fetchHistory.current = async (p: number) => {
    setIsLoadingCalls(true);
    setFetchError(null);
    try {
      const data = await callsApi.getHistory(p, LIMIT);
      if (data.success) {
        setCalls(data.calls);
        setTotalPages(data.total_pages);
        setTotal(data.total);
        setPage(p);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load call history.';
      setFetchError(msg);
    } finally {
      setIsLoadingCalls(false);
    }
  };

  // Initial load — runs exactly once when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory.current(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (e: React.MouseEvent, call: CallAnalysis) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${call.original_name || 'this call'}"? This cannot be undone.`)) return;

    setDeletingId(call._id);
    try {
      await callsApi.delete(call._id);
      setCalls((prev) => prev.filter((c) => c._id !== call._id));
      setTotal((t) => Math.max(0, t - 1));
      showToast('Call deleted.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete call.';
      showToast(msg, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Navigate to detail ──────────────────────────────────────────────────────
  const openCall = (call: CallAnalysis) => {
    navigate(`/dashboard/calls/${call._id}`);
  };

  // ── Guard ───────────────────────────────────────────────────────────────────
  if (authLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={dismiss} />}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Persistent records
          </p>
          <h1 className="text-2xl font-extrabold text-slate-900">Call History</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLoadingCalls
              ? 'Loading…'
              : total > 0
              ? `${total} recording${total !== 1 ? 's' : ''} analysed`
              : 'No recordings yet'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchHistory.current(page)}
            disabled={isLoadingCalls}
            className="btn-secondary !px-3 !py-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCalls ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary !px-4 !py-2 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            New Upload
          </button>
        </div>
      </header>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {isLoadingCalls && (
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Loading your call history…</p>
        </div>
      )}

      {/* ── Fetch error ─────────────────────────────────────────────────────── */}
      {!isLoadingCalls && fetchError && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-200 bg-red-50 py-20 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <div>
            <p className="text-lg font-bold text-red-700">Failed to load history</p>
            <p className="mt-1 text-sm text-red-500">{fetchError}</p>
          </div>
          <button
            onClick={() => fetchHistory.current(1)}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!isLoadingCalls && !fetchError && calls.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Clock className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700">No calls analysed yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Upload an MP3 recording to see AI insights here.
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary mt-2">
            <Upload className="h-4 w-4" />
            Upload First Call
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {!isLoadingCalls && !fetchError && calls.length > 0 && (
        <>
          <div className="card overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>Recording</span>
              <span className="hidden sm:block">Date</span>
              <span>Lead</span>
              <span className="sr-only">Actions</span>
            </div>

            <ul className="divide-y divide-slate-100">
              {calls.map((call) => {
                const isDeleting = deletingId === call._id;
                return (
                  <li key={call._id}>
                    <button
                      onClick={() => openCall(call)}
                      disabled={isDeleting}
                      className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-blue-50/60 disabled:opacity-60"
                    >
                      {/* Recording info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <PhoneCall className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <p className="truncate font-semibold text-slate-900">
                            {call.original_name || call.file_name || 'Call Recording'}
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusPill status={call.status} />
                          {call.status === 'failed' && call.error_message && (
                            <span className="flex items-center gap-1 text-xs text-red-500">
                              <AlertCircle className="h-3 w-3" />
                              {call.error_message.slice(0, 60)}
                            </span>
                          )}
                          {call.summary && (
                            <p className="hidden max-w-xs truncate text-xs text-slate-400 lg:block">
                              {call.summary}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <p className="hidden whitespace-nowrap text-xs text-slate-400 sm:block">
                        {formatDate(call.createdAt)}
                      </p>

                      {/* Lead badge */}
                      <div onClick={(e) => e.stopPropagation()}>
                        {call.status === 'completed' && call.lead_quality?.classification ? (
                          <LeadBadge classification={call.lead_quality.classification} size="sm" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleDelete(e, call)}
                          disabled={isDeleting}
                          className="btn-danger !px-2 !py-1.5"
                          aria-label="Delete call"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => fetchHistory.current(page - 1)}
                disabled={page <= 1 || isLoadingCalls}
                className="btn-secondary !px-3 !py-2 text-xs"
              >
                ← Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchHistory.current(page + 1)}
                disabled={page >= totalPages || isLoadingCalls}
                className="btn-secondary !px-3 !py-2 text-xs"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
