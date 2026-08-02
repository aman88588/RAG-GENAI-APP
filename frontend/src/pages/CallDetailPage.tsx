import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { callsApi } from '../services/api.service';
import type { CallAnalysis } from '../services/api.service';
import { DashboardLayout } from '../components/DashboardLayout';
import { InsightsPanel } from '../components/InsightsPanel';
import { Toast, useToastState } from '../components/ui/Toast';
import { PageLoader } from '../components/ui/Spinner';

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast, showToast, dismiss } = useToastState();

  const [call, setCall] = useState<CallAnalysis | null>(null);
  const [isLoadingCall, setIsLoadingCall] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/signin');
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch call by ID from URL — works after refresh
  useEffect(() => {
    if (!id || !isAuthenticated) return;

    let cancelled = false;
    setIsLoadingCall(true);
    setFetchError(null);

    callsApi
      .getDetails(id)
      .then((data) => {
        if (!cancelled && data.success) setCall(data.call);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Could not load call details.';
          setFetchError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCall(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);

  const handleDelete = async () => {
    if (!call) return;
    if (!window.confirm(`Delete "${call.original_name || 'this call'}"? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await callsApi.delete(call._id);
      showToast('Call deleted.', 'success');
      setTimeout(() => navigate('/dashboard/calls'), 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete call.';
      showToast(msg, 'error');
      setIsDeleting(false);
    }
  };

  if (authLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={dismiss} />}

      {/* Back nav + actions */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/dashboard/calls"
          className="flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Call History
        </Link>

        {call && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-danger !px-3 !py-2 text-xs"
          >
            {isDeleting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />
            }
            {isDeleting ? 'Deleting…' : 'Delete call'}
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoadingCall && (
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Loading call analysis…</p>
        </div>
      )}

      {/* Error state */}
      {!isLoadingCall && fetchError && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-200 bg-red-50 py-20 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <div>
            <p className="text-lg font-bold text-red-700">Could not load this call</p>
            <p className="mt-1 text-sm text-red-500">{fetchError}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFetchError(null);
                setIsLoadingCall(true);
                callsApi.getDetails(id!)
                  .then((data) => { if (data.success) setCall(data.call); })
                  .catch((err) => setFetchError(err instanceof Error ? err.message : 'Failed'))
                  .finally(() => setIsLoadingCall(false));
              }}
              className="btn-secondary text-sm"
            >
              Retry
            </button>
            <Link to="/dashboard/calls" className="btn-primary text-sm">
              Go to History
            </Link>
          </div>
        </div>
      )}

      {/* Call details */}
      {!isLoadingCall && !fetchError && call && (
        <InsightsPanel call={call} />
      )}
    </DashboardLayout>
  );
}
