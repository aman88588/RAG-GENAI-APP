import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Mic2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api.service';

export default function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = 'Full name is required.';
    else if (formData.fullName.trim().length < 3) e.fullName = 'Name must be at least 3 characters.';
    else if (formData.fullName.trim().length > 50) e.fullName = 'Name must be under 50 characters.';
    if (!formData.email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Enter a valid email address.';
    if (!formData.password) e.password = 'Password is required.';
    else if (formData.password.length < 6) e.password = 'Password must be at least 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setServerError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setServerError('');
    try {
      const data = await authApi.signup({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      if (data.success && data.data?.token && data.data?.user) {
        login(data.data.user, data.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left illustration */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 p-12">
        <div className="max-w-md text-center text-white">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur shadow-xl">
            <Mic2 className="h-12 w-12 text-white" />
          </div>
          <h2 className="mb-4 text-3xl font-extrabold">Join CallInsight</h2>
          <p className="text-lg leading-relaxed text-indigo-100">
            Turn raw MP3 call recordings into structured insights — lead quality, mistakes, and coaching.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-3 text-left">
            {[
              '🎙 Upload MP3 call recordings',
              '📝 AI-powered transcription',
              '🔥 Hot / Warm / Cold lead scoring',
              '💡 Sales coaching suggestions',
              '📄 Download PDF reports',
            ].map((f) => (
              <div key={f} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm backdrop-blur">
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Mic2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">CallInsight</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-slate-900">Create an account</h1>
          <p className="mt-1 text-sm text-slate-500">Start analysing your sales calls for free.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            {serverError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="fullName" name="fullName" type="text"
                  value={formData.fullName} onChange={handleChange}
                  placeholder="Aman Prajapati"
                  className={`input-field pl-10 ${errors.fullName ? 'input-error' : ''}`}
                  autoComplete="name"
                />
              </div>
              {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email" name="email" type="email"
                  value={formData.email} onChange={handleChange}
                  placeholder="you@example.com"
                  className={`input-field pl-10 ${errors.email ? 'input-error' : ''}`}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className={`input-field pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base">
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</> : 'Create Account'}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/signin" className="font-semibold text-blue-600 hover:text-blue-700">Sign In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
