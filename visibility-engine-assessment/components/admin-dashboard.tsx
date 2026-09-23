import { useEffect, useState } from 'react';
import '../app/assessment-design.css';
import '../app/admin.css';

type Submission = {
  id: string; name: string; email: string; version: string; createdAt: string;
  answers: { number: number; section: string; question: string; label: string; text: string; score: number }[];
  result: { score: number; band: string; dimensions: { name: string; score: number }[]; strongest: string[]; gaps: string[]; allEqual: boolean };
};
async function api(action: string, body?: unknown, cursor?: string) {
  const response = await fetch('/api/assessment?action=' + action + (cursor ? '&before=' + encodeURIComponent(cursor) : ''), {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json', 'X-Assessment-Request': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  return { response, data };
}
export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [rows, setRows] = useState<Submission[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [search, setSearch] = useState('');
  async function load(next?: string) {
    setBusy(true); setError('');
    try {
      const { response, data } = await api('results', undefined, next);
      if (response.status === 401) { setAuthenticated(false); setRows([]); setSelected(null); return; }
      if (!response.ok) throw new Error(data.error);
      setAuthenticated(true);
      setRows(previous => next ? [...previous, ...data.submissions] : data.submissions);
      setCursor(data.nextCursor);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load results. Please retry.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  async function login(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const { response, data } = await api('login', { password });
      setPassword('');
      if (!response.ok) throw new Error(data.error);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to log in.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError('');
    try {
      const { response } = await api('logout', {});
      if (!response.ok) throw new Error('Logout failed. Please try again.');
      setAuthenticated(false); setRows([]); setSelected(null); setSearch('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Logout failed.'); }
    finally { setBusy(false); }
  }
  const visible = rows.filter(row => (row.name + ' ' + row.email).toLowerCase().includes(search.toLowerCase()));
  return <main className="assessment-design admin-design">
    <header className="assessment-header"><img src="/inspired-vibe-logo.svg" alt="Inspired Vibe" width="270" height="80" /><span>Private assessment results</span></header>
    <div className="admin-container">
      <div className="admin-heading"><div><p className="design-eyebrow">Inspired Vibe · Admin</p><h1>Assessment results</h1></div>{authenticated && <button className="design-back" disabled={busy} onClick={logout}>Log out</button>}</div>
      {error && <p role="alert" className="submission-error">{error}</p>}
      {!authenticated ? <form onSubmit={login} className="question-panel admin-login" aria-busy={busy}>
        <h2>Enter your admin password</h2><p>Names, email addresses, and assessment responses are only available after login.</p>
        <div className="contact-field"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" required autoComplete="current-password" maxLength={256} value={password} onChange={e => setPassword(e.target.value)} disabled={busy} /></div>
        <button type="submit" className="design-cta" disabled={busy}>{busy ? 'Please wait…' : 'Log in'}</button>
      </form> : <>
        <div className="admin-toolbar"><div className="contact-field"><label htmlFor="admin-search">Search loaded results by name or email</label><input id="admin-search" type="search" value={search} onChange={e => setSearch(e.target.value)} /></div><button className="design-back" disabled={busy} onClick={() => { setSelected(null); void load(); }}>Refresh</button></div>
        <p>{rows.length} submission{rows.length === 1 ? '' : 's'} loaded{cursor ? ' · More available below' : ''}</p>
        {!rows.length && !busy && <p className="admin-empty">No completed assessments yet. Results will appear here after visitors submit.</p>}
        <div className="admin-table-wrap"><table><thead><tr><th>Submitted</th><th>Name</th><th>Email</th><th>Authority Score</th><th>Result band</th><th>Details</th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td>{new Date(row.createdAt).toLocaleString()}</td><td>{row.name}</td><td>{row.email}</td><td>{row.result.score} / 100</td><td>{row.result.band}</td><td><button onClick={() => setSelected(row)} className="admin-view" aria-label={'View results for ' + row.name}>View</button></td></tr>)}</tbody></table></div>
        {search && !visible.length && <p>No matching results on the loaded pages.</p>}
        {cursor && <button disabled={busy} className="design-cta admin-load" onClick={() => void load(cursor)}>{busy ? 'Loading…' : 'Load more results'}</button>}
        {selected && <section className="question-panel admin-details" aria-label="Submission details">
          <div className="admin-heading"><h2>{selected.name}</h2><button className="design-back" onClick={() => setSelected(null)}>Close details</button></div>
          <p>{selected.email} · {new Date(selected.createdAt).toLocaleString()} · Assessment {selected.version}</p>
          <h3>Authority Score: {selected.result.score} / 100</h3><p>{selected.result.band}</p>
          <div className="admin-dimensions">{selected.result.dimensions.map(d => <div key={d.name}><strong>{d.score}/100</strong><span>{d.name}</span></div>)}</div>
          <p><b>Strongest:</b> {selected.result.allEqual ? 'All six areas are tied.' : selected.result.strongest.join(' · ')}</p>
          <p><b>Priority areas:</b> {selected.result.allEqual ? 'No single area scores below the others.' : selected.result.gaps.join(' · ')}</p>
          <h3>All 24 answers</h3><ol className="admin-answers">{selected.answers.map(answer => <li key={answer.number}><span>{answer.section}</span><h4>{answer.question}</h4><p>{answer.label}. {answer.text} <small>({answer.score}/4)</small></p></li>)}</ol>
        </section>}
      </>}
    </div>
  </main>;
}
