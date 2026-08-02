// ─── Types ───────────────────────────────────────────────────────────────────

export type LeadQuality = 'Hot' | 'Warm' | 'Cold';

export interface LeadQualityData {
  classification: LeadQuality | null;
  reasoning: string | null;
}

export interface CustomerIntent {
  goal: string | null;
  interest_level: 'high' | 'medium' | 'low' | 'hot' | 'warm' | 'cold' | null;
  key_requirements: string[];
}

export interface CustomerProfile {
  current_job: string | null;
  experience_years: string | null;
  education: string | null;
  career_goals: string | null;
}

export interface RecommendedCourse {
  course_name: string | null;
  specialization: string | null;
  reason: string | null;
}

export interface IncorrectInfo {
  customer_question: string;
  agent_response: string;
  issue: 'incorrect' | 'misleading' | 'incomplete';
  explanation: string;
}

export interface MissedQuestion {
  customer_question: string;
  expected_answer: string;
}

export interface AgentResponseAnalysis {
  incorrect_information: IncorrectInfo[];
  missed_questions: MissedQuestion[];
}

export interface Sentiment {
  overall: 'positive' | 'neutral' | 'negative' | null;
  customer_tone: string | null;
  agent_tone: string | null;
}

export interface CallAnalysis {
  _id: string;
  analysis_uuid: string;
  file_name: string;
  original_name: string;
  file_size: number;
  file_size_mb: number | null;
  mime_type: string | null;
  uploaded_by: string;
  status: 'transcribing' | 'analyzing' | 'completed' | 'failed';
  error_message: string | null;
  transcript: string | null;
  transcript_word_count: number;
  transcription_warnings: string[];
  transcription_provider: string;
  transcription_model: string;
  transcript_was_truncated: boolean;
  audio_duration_secs: number | null;
  summary: string | null;
  lead_quality: LeadQualityData;
  customer_intent: CustomerIntent;
  customer_profile: CustomerProfile;
  recommended_course: RecommendedCourse;
  agent_response_analysis: AgentResponseAnalysis;
  agent_mistakes: string[];
  customer_objections: string[];
  customer_pain_points: string[];
  sentiment: Sentiment;
  improvement_suggestions: string[];
  insights_model: string | null;
  processing_ms: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeCallResponse {
  success: boolean;
  message: string;
  analysis_id: string;
  analysis_uuid: string;
  file: { name: string; size_mb: number; mime_type: string };
  transcript: string;
  transcript_word_count: number;
  transcription_warnings: string[];
  processing_ms: number;
  summary: string;
  lead_quality: LeadQualityData;
  customer_intent: CustomerIntent;
  customer_profile: CustomerProfile;
  recommended_course: RecommendedCourse;
  agent_response_analysis: AgentResponseAnalysis;
  agent_mistakes: string[];
  customer_objections: string[];
  customer_pain_points: string[];
  sentiment: Sentiment;
  improvement_suggestions: string[];
}

export interface CallHistoryResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  calls: CallAnalysis[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
      createdAt: string;
    };
    token: string;
  };
}

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_BACKEND_API || 'http://localhost:4050').replace(/\/$/, '');

export const getToken = (): string | null =>
  localStorage.getItem('callinsight_token') || localStorage.getItem('token');

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: FormData | string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...options.headers };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData — browser must set it with boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ?? undefined,
    signal: options.signal,
  });

  // Parse response
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Unknown server error' };
  }

  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ||
      (data as { error?: string }).error ||
      `Request failed with status ${res.status}`;
    const err = new Error(msg) as Error & { status: number; data: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (body: { fullName: string; email: string; password: string }) =>
    request<AuthResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  signin: (body: { email: string; password: string }) =>
    request<AuthResponse>('/api/v1/auth/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── Calls API ────────────────────────────────────────────────────────────────

export const callsApi = {
  analyze: (audioFile: File, signal?: AbortSignal) => {
    const form = new FormData();
    form.append('audio', audioFile);
    return request<AnalyzeCallResponse>('/api/v1/calls/analyze', {
      method: 'POST',
      body: form,
      signal,
    });
  },

  getHistory: (page = 1, limit = 20) =>
    request<CallHistoryResponse>(`/api/v1/calls?page=${page}&limit=${limit}`),

  getDetails: (id: string) =>
    request<{ success: boolean; call: CallAnalysis }>(`/api/v1/calls/${id}`),

  delete: (id: string) =>
    request<{ success: boolean; message: string; analysis_id: string }>(`/api/v1/calls/${id}`, {
      method: 'DELETE',
    }),

  downloadPdfUrl: (id: string) => `${BASE_URL}/api/v1/calls/${id}/download-pdf`,
};
