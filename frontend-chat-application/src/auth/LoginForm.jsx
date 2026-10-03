import { useState } from 'react';
import { login } from './AuthService';

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onLogin(await login(username.trim(), ''));
    } catch {
      setError('Could not sign in. Check that the backend is running and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold">ChatApp</h1>
        <p className="text-sm text-slate-400">Development login. Choose a username to try direct messages.</p>
        <label className="block text-sm" htmlFor="username">Username</label>
        <input id="username" autoComplete="username" required value={username} placeholder="Username"
          onChange={(event) => setUsername(event.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500" />
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={busy || !username.trim()} className="w-full rounded-md bg-blue-600 px-3 py-2 hover:bg-blue-500 disabled:opacity-50">
          {busy ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </main>
  );
}
