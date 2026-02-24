import { FormEvent, useEffect, useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'register';

type AuthPageProps = {
  onAuthSuccess: () => void;
};

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [canResendVerification, setCanResendVerification] = useState(false);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const isRateLimitError = (text: string) => {
    const lower = text.toLowerCase();
    return lower.includes('rate limit') || lower.includes('too many') || lower.includes('429');
  };

  const isEmailNotConfirmedError = (text: string) => {
    const lower = text.toLowerCase();
    return lower.includes('email not confirmed') || lower.includes('email_not_confirmed');
  };

  const parseRetrySeconds = (text: string) => {
    const match = text.match(/(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)/i);
    if (!match) return 60;
    const value = Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) return 60;
    const unit = match[2].toLowerCase();
    return unit.startsWith('m') ? value * 60 : value;
  };

  const handleResendVerification = async () => {
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Enter your email first, then resend verification.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const result = await response.json().catch(() => ({ message: 'Could not resend verification email.' }));

      if (!response.ok) {
        throw new Error(result.message || 'Could not resend verification email.');
      }

      setMessage(result.message || 'Verification email sent. Please check inbox/spam and then login.');
      setCooldownSeconds(60);
    } catch (authError) {
      const authMessage = authError instanceof Error ? authError.message : 'Could not resend verification email.';
      if (isRateLimitError(authMessage)) {
        setCooldownSeconds(parseRetrySeconds(authMessage));
        setError('Too many requests. Please wait and try again.');
      } else {
        setError(authMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCanResendVerification(false);

    if (mode === 'register' && cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds}s before trying again.`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json().catch(() => ({ message: 'Authentication failed. Please try again.' }));

      if (!response.ok) {
        throw new Error(result.message || 'Authentication failed. Please try again.');
      }

      if (mode === 'register') {
        setMessage(result.message || 'Registration successful. You are now logged in.');
      } else {
        setMessage(result.message || 'Login successful.');
      }

      onAuthSuccess();
    } catch (authError) {
      const authMessage = authError instanceof Error ? authError.message : 'Authentication failed. Please try again.';

      if (isRateLimitError(authMessage)) {
        setCooldownSeconds(parseRetrySeconds(authMessage));
        setMode('login');
        setMessage('Too many requests were made. Try Login now or wait and retry Register.');
      } else if (isEmailNotConfirmedError(authMessage)) {
        setCanResendVerification(true);
        setError('Your account email is not confirmed yet. Check inbox/spam for verification email, then login again.');
      } else if (authMessage.toLowerCase().includes('invalid login credentials')) {
        setError('Invalid email or password. If this is a new account, register first and verify your email.');
      } else {
        setError(authMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-mesh px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            <BookOpen className="text-cyan-300" size={30} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Study Kit Generator</h1>
          <p className="mt-2 text-sm text-slate-300">{mode === 'login' ? 'Log in to continue' : 'Create your account'}</p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-700/70 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setMessage('');
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'login' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setMessage('');
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'register' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="mb-1 block text-sm text-slate-300">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="mb-1 block text-sm text-slate-300">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="At least 6 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>}

          {canResendVerification && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading || cooldownSeconds > 0}
              className="w-full rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cooldownSeconds > 0 ? `Retry in ${cooldownSeconds}s` : 'Retry request'}
            </button>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'register' && cooldownSeconds > 0)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-4 py-3 font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Please wait...
              </>
            ) : mode === 'register' && cooldownSeconds > 0 ? (
              `Retry in ${cooldownSeconds}s`
            ) : mode === 'login' ? (
              'Login'
            ) : (
              'Register'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
