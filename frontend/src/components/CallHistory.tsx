import { Clock, RefreshCw, Trash2, Loader2, PhoneCall } from 'lucide-react';
import type { CallAnalysis } from '../services/api.service';
import { LeadBadge } from './LeadBadge';

interface CallHistoryProps {
  calls: CallAnalysis[];
  selectedId: string | null;
  isLoading: boolean;
  deletingId: string | null;
  onSelect: (call: CallAnalysis) => void;
  onDelete: (call: CallAnalysis) => void;
  onRefresh: () => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const statusBadge = (status: CallAnalysis['status']) => {
  switch (status) {
    case 'completed':  return <span className="badge-completed text-[10px]">✓ Done</span>;
    case 'failed':     return <span className="badge-failed text-[10px]">✗ Failed</span>;
    case 'transcribing': return <span className="badge-pending text-[10px]">Transcribing</span>;
    case 'analyzing':  return <span className="badge-pending text-[10px]">Analyzing</span>;
    default:           return null;
  }
};

export function CallHistory({
  calls, selectedId, isLoading, deletingId, onSelect, onDelete, onRefresh
}: CallHistoryProps) {
  return (
    <aside className="card p-5 xl:sticky xl:top-6 xl:self-start">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Call History</h2>
          <p className="text-xs text-slate-400">{calls.length} recent analysis{calls.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={onRefresh}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
          aria-label="Refresh call history"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
          <p className="text-xs text-slate-400">Loading calls…</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <Clock className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No analyses yet</p>
          <p className="mt-1 text-xs text-slate-400">Upload an MP3 to get started.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {calls.map((call) => {
            const id = call._id;
            const isSelected = selectedId === id;
            const isDeleting = deletingId === id;

            return (
              <li
                key={id}
                className={`group rounded-2xl border p-3.5 transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                {/* Main clickable area */}
                <button
                  className="block w-full text-left"
                  onClick={() => onSelect(call)}
                  disabled={isDeleting}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <PhoneCall className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {call.original_name || call.file_name || 'Call Recording'}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {call.status === 'completed' && call.lead_quality?.classification
                        ? <LeadBadge classification={call.lead_quality.classification} size="sm" />
                        : statusBadge(call.status)
                      }
                    </div>
                  </div>

                  {call.summary && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {call.summary}
                    </p>
                  )}

                  {call.status === 'failed' && call.error_message && (
                    <p className="mt-2 text-xs text-red-500">{call.error_message}</p>
                  )}

                  <p className="mt-2 text-xs text-slate-400">{formatDate(call.createdAt)}</p>
                </button>

                {/* Delete button */}
                <button
                  onClick={() => onDelete(call)}
                  disabled={isDeleting}
                  className="btn-danger mt-2.5 !px-2.5 !py-1"
                  aria-label="Delete call analysis"
                >
                  {isDeleting
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />
                  }
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
