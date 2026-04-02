import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Kanban, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data;
      login(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Login failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-950 via-brand-900 to-[var(--bg-primary)] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-brand-400"
              style={{
                width: `${200 + i * 150}px`, height: `${200 + i * 150}px`,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: 1 - i * 0.15,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
            <Kanban size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white">TaskFlow</span>
        </div>

        <div className="z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage tasks like<br />
            <span className="text-brand-300">a pro team.</span>
          </h2>
          <p className="text-brand-200/70 text-lg leading-relaxed">
            Real-time collaboration, Kanban boards, and smart analytics—all in one place.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { label: 'Teams', value: '10K+' },
              { label: 'Tasks Done', value: '2M+' },
              { label: 'Uptime', value: '99.9%' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-brand-200/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-brand-200/40 text-sm z-10">© 2024 TaskFlow. Built for high-performance teams.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Kanban size={16} className="text-white" />
            </div>
            <span className="font-bold text-[var(--text-primary)]">TaskFlow</span>
          </div>

          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Welcome back</h1>
          <p className="text-[var(--text-secondary)] mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-3 mt-2"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">
              Create one free →
            </Link>
          </p>

          {/* Demo hint */}
          <div className="mt-6 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Demo: <span className="text-[var(--text-secondary)] font-mono">demo@taskflow.dev</span>
              {' / '}
              <span className="text-[var(--text-secondary)] font-mono">Demo@1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
