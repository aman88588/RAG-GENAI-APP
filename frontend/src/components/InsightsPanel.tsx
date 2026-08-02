import { 
  FileText, Target, User, BookOpen, AlertTriangle, 
  Lightbulb, MessageSquare, Heart, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import type { CallAnalysis } from '../services/api.service';
import { callsApi, getToken } from '../services/api.service';
import { LeadBadge } from './LeadBadge';

interface InsightsPanelProps {
  call: CallAnalysis;
  onClose?: () => void;
}

function Section({ icon: Icon, title, color = 'text-slate-500', children }: {
  icon: React.FC<{ className?: string }>;
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="insight-section">
      <div className={`insight-section-header ${color}`}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, emptyText, variant = 'default' }: {
  items: string[];
  emptyText: string;
  variant?: 'default' | 'danger' | 'success';
}) {
  const itemClass = {
    default: 'bg-white border-slate-200 text-slate-700',
    danger: 'bg-red-50 border-red-100 text-red-800',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  }[variant];

  if (!items || items.length === 0) {
    return <p className="text-sm italic text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className={`rounded-xl border px-3.5 py-2.5 text-sm ${itemClass}`}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value || '—'}</span>
    </div>
  );
}

const formatMs = (ms?: number | null) => {
  if (!ms) return 'n/a';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
};

export function InsightsPanel({ call }: InsightsPanelProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDownloadPdf = async () => {
    const token = getToken();
    if (!token) return;
    setDownloadLoading(true);
    try {
      const url = callsApi.downloadPdfUrl(call._id);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${(call.original_name || 'call').replace(/[^a-z0-9_-]/gi, '_')}_insight_report.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setDownloadLoading(false);
    }
  };

  const lq = call.lead_quality;
  const si = call.sentiment;
  const ci = call.customer_intent;
  const cp = call.customer_profile;
  const rc = call.recommended_course;
  const ara = call.agent_response_analysis;

  return (
    <div className="card animate-slide-up overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">AI Analysis Report</p>
            <h2 className="mt-0.5 truncate text-xl font-bold text-slate-900">
              {call.original_name || call.file_name || 'Call Recording'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {call.transcript_word_count > 0 && `${call.transcript_word_count.toLocaleString()} words · `}
              Processed in {formatMs(call.processing_ms)}
              {call.transcript_was_truncated && ' · Transcript truncated'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LeadBadge classification={lq?.classification} />
            <button
              onClick={handleDownloadPdf}
              disabled={downloadLoading || call.status !== 'completed'}
              className="btn-secondary !px-3 !py-2 text-xs"
              title="Download PDF report"
            >
              <Download className="h-3.5 w-3.5" />
              {downloadLoading ? 'Generating…' : 'PDF'}
            </button>
          </div>
        </div>

        {/* Transcription warnings */}
        {call.transcription_warnings?.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            {call.transcription_warnings.map((w, i) => (
              <p key={i} className="text-xs font-medium text-amber-700">⚠ {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 p-6 lg:grid-cols-2">

        {/* Summary */}
        <div className="lg:col-span-2">
          <Section icon={FileText} title="Summary">
            <p className="text-sm leading-relaxed text-slate-700">
              {call.summary || <span className="italic text-slate-400">No summary generated.</span>}
            </p>
          </Section>
        </div>

        {/* Lead Quality */}
        {lq?.classification && (
          <div className="lg:col-span-2">
            <Section icon={Target} title="Lead Quality" color="text-blue-600">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
                <div className="shrink-0">
                  <LeadBadge classification={lq.classification} />
                </div>
                {lq.reasoning && (
                  <p className="text-sm leading-relaxed text-slate-700">{lq.reasoning}</p>
                )}
              </div>
            </Section>
          </div>
        )}

        {/* Customer Intent */}
        <Section icon={Target} title="Customer Intent">
          <div className="space-y-2">
            <MetaRow label="Goal" value={ci?.goal} />
            <MetaRow label="Interest" value={ci?.interest_level} />
            {ci?.key_requirements?.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Requirements</p>
                <BulletList items={ci.key_requirements} emptyText="" />
              </div>
            )}
          </div>
        </Section>

        {/* Sentiment */}
        <Section icon={Heart} title="Sentiment">
          <div className="space-y-2">
            <MetaRow label="Overall" value={si?.overall} />
            <MetaRow label="Customer" value={si?.customer_tone} />
            <MetaRow label="Agent" value={si?.agent_tone} />
          </div>
        </Section>

        {/* Customer Profile */}
        <Section icon={User} title="Customer Profile">
          <div className="space-y-2">
            <MetaRow label="Job" value={cp?.current_job} />
            <MetaRow label="Experience" value={cp?.experience_years} />
            <MetaRow label="Education" value={cp?.education} />
            <MetaRow label="Goals" value={cp?.career_goals} />
          </div>
        </Section>

        {/* Recommended Course */}
        <Section icon={BookOpen} title="Recommended Course">
          <div className="space-y-2">
            <MetaRow label="Course" value={rc?.course_name} />
            <MetaRow label="Focus" value={rc?.specialization} />
            <MetaRow label="Reason" value={rc?.reason} />
          </div>
        </Section>

        {/* Pain Points */}
        <Section icon={AlertTriangle} title="Pain Points" color="text-amber-600">
          <BulletList items={call.customer_pain_points} emptyText="No pain points identified." />
        </Section>

        {/* Objections */}
        <Section icon={MessageSquare} title="Objections">
          <BulletList items={call.customer_objections} emptyText="No objections raised." />
        </Section>

        {/* Agent Mistakes */}
        <Section icon={AlertTriangle} title="Agent Mistakes" color="text-red-500">
          <BulletList items={call.agent_mistakes} emptyText="No mistakes identified." variant="danger" />
        </Section>

        {/* Improvement Suggestions */}
        <Section icon={Lightbulb} title="Improvement Suggestions" color="text-emerald-600">
          <BulletList items={call.improvement_suggestions} emptyText="No suggestions generated." variant="success" />
        </Section>

        {/* Agent Response Issues */}
        {ara?.incorrect_information?.length > 0 && (
          <div className="lg:col-span-2">
            <Section icon={AlertTriangle} title="Agent Response Issues" color="text-red-500">
              <div className="space-y-3">
                {ara.incorrect_information.map((item, i) => (
                  <div key={i} className="rounded-xl border border-red-100 bg-red-50 p-3.5">
                    <p className="text-xs font-semibold uppercase text-red-500">Customer asked:</p>
                    <p className="mb-2 text-sm text-slate-800">"{item.customer_question}"</p>
                    <p className="text-xs font-semibold uppercase text-red-500">Agent said:</p>
                    <p className="mb-2 text-sm text-slate-700">"{item.agent_response}"</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      item.issue === 'incorrect' ? 'bg-red-100 text-red-700' :
                      item.issue === 'misleading' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.issue}
                    </span>
                    {item.explanation && (
                      <p className="mt-2 text-xs text-slate-600">{item.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Missed Questions */}
        {ara?.missed_questions?.length > 0 && (
          <div className="lg:col-span-2">
            <Section icon={MessageSquare} title="Missed Questions">
              <div className="space-y-2">
                {ara.missed_questions.map((item, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-sm font-medium text-slate-800">Q: {item.customer_question}</p>
                    <p className="mt-1 text-sm text-slate-500">Expected: {item.expected_answer}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* Transcript (collapsible) */}
        {call.transcript && (
          <div className="lg:col-span-2">
            <button
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              <span>Full Transcript ({call.transcript_word_count} words)</span>
              {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showTranscript && (
              <pre className="mt-3 max-h-96 overflow-auto rounded-2xl bg-slate-900 p-5 text-xs leading-6 text-slate-200 scrollbar-thin animate-fade-in">
                {call.transcript}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
