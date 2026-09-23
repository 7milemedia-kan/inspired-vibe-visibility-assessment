'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuestionScreen, ResultsScreen } from '@/components/assessment-screens';
import { ContactScreen, type ContactDetails } from '@/components/contact-screen';
import './assessment-design.css';
import { assessmentCopy as copy } from '@/lib/assessment-copy';
import { flatQuestions, sections } from '@/lib/assessment';

type Phase = 'welcome' | 'section' | 'question' | 'contact' | 'results';
type SavedState = { phase: Phase; current: number; answers: Record<number, number>; submissionId?: string; submitted?: boolean };
type ModelContext = { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> };

declare global { interface Document { readonly modelContext?: ModelContext } }

const STORAGE_KEY = 'visibility-assessment-v2';

export default function Home() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [ready, setReady] = useState(false);
  // Contact details stay in memory, never in localStorage or a URL.
  const [contact, setContact] = useState<ContactDetails>({ name: '', email: '' });
  const [submissionId, setSubmissionId] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [phase, current]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedState;
        setPhase(parsed.phase === 'results' && !parsed.submitted ? 'contact' : parsed.phase);
        if (parsed.submissionId) setSubmissionId(parsed.submissionId);
        setSubmitted(Boolean(parsed.submitted));
        setCurrent(parsed.current);
        setAnswers(parsed.answers ?? {});
      }
    } catch { /* Start fresh if saved data is unavailable. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, current, answers, submissionId, submitted })); }
    catch { /* Private browsing or full storage must not prevent submission. */ }
  }, [answers, current, phase, ready, submissionId, submitted]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: 'complete_visibility_assessment',
      title: 'Complete visibility assessment',
      description: 'Complete all 24 questions and open the required name and email step before results.',
      inputSchema: {
        type: 'object',
        properties: {
          answers: { type: 'array', minItems: 24, maxItems: 24, items: { type: 'integer', minimum: 0, maximum: 4 } },
        },
        required: ['answers'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const values = (input as { answers?: unknown })?.answers;
        if (!Array.isArray(values) || values.length !== 24 || values.some((value) => !Number.isInteger(value) || Number(value) < 0 || Number(value) > 4)) {
          throw new Error('Provide exactly 24 integer answers, each from 0 to 4.');
        }
        const nextAnswers = Object.fromEntries(values.map((value, index) => [index, Number(value)]));
        setAnswers(nextAnswers);
        setSubmissionId(crypto.randomUUID());
        setSubmitted(false);
        setCurrent(23);
        setPhase('contact');
        return { status: 'contact_required' };
      },
    };
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Optional browser capability. */ }
    return () => lifecycle.abort();
  }, []);

  const activeQuestion = flatQuestions[current];
  const selected = answers[current];

  const dimensionScores = useMemo(() => sections.map((section, sectionIndex) => {
    const start = sectionIndex * 4;
    const raw = [0, 1, 2, 3].reduce((sum, offset) => sum + (answers[start + offset] ?? 0), 0);
    return { name: section.name, score: Math.round((raw / 16) * 100) };
  }), [answers]);

  const overallScore = useMemo(() => {
    const total = Object.values(answers).reduce((sum, value) => sum + value, 0);
    return Math.round((total / 96) * 100);
  }, [answers]);

  const goNext = useCallback(() => {
    if (answers[current] === undefined) return;
    if (current === 23) { setPhase('contact'); return; }
    const next = current + 1;
    setCurrent(next);
    setPhase(flatQuestions[next].sectionIndex !== flatQuestions[current].sectionIndex ? 'section' : 'question');
  }, [answers, current]);

  const goBack = useCallback(() => {
    if (current === 0) { setPhase('section'); return; }
    const previous = current - 1;
    setCurrent(previous);
    setPhase('question');
  }, [current]);

  const restart = () => {
    setContact({ name: '', email: '' });
    setSubmissionId(crypto.randomUUID()); setSubmitted(false); setSubmitError('');
    setAnswers({}); setCurrent(0); setPhase('welcome'); localStorage.removeItem(STORAGE_KEY);
  };

  const submitAssessment = async () => {
    if (pending || !contact.name.trim() || !contact.email.trim()) return;
    setPending(true); setSubmitError('');
    try {
      const response = await fetch('/api/assessment?action=submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Assessment-Request': '1' },
        body: JSON.stringify({ id: submissionId, version: 'v2', name: contact.name.trim(),
          email: contact.email.trim(), answers: flatQuestions.map((_, index) => answers[index]) }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save your assessment. Please try again.');
      setSubmitted(true); setContact({ name: '', email: '' }); setPhase('results');
    } catch (error) {
      setSubmitError(error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError'
        ? error.message : 'We could not save your results. Please try again; your answers have been kept.');
    } finally { setPending(false); }
  };

  useEffect(() => {
    if (phase !== 'question') return;
    const handleKey = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (/^[A-E]$/.test(key)) setAnswers((previous) => ({ ...previous, [current]: key.charCodeAt(0) - 65 }));
      if (/^[1-5]$/.test(event.key)) setAnswers((previous) => ({ ...previous, [current]: Number(event.key) - 1 }));
      if (event.key === 'Enter') goNext();
      if (event.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [current, goNext, goBack, phase]);

  if (!ready) return <main className="survey-shell min-h-screen" />;

  if (phase === 'welcome') return <Welcome onStart={() => { setCurrent(0); setPhase('section'); }} />;
  if (phase === 'section') return <SectionIntro sectionIndex={activeQuestion.sectionIndex} onStart={() => setPhase('question')} onBack={activeQuestion.sectionIndex === 0 ? () => setPhase('welcome') : () => { setCurrent(current - 1); setPhase('question'); }} />;
  if (phase === 'results') return <ResultsScreen score={overallScore} dimensions={dimensionScores} onRestart={restart} />;
  if (phase === 'contact') return <ContactScreen contact={contact} onChange={setContact} pending={pending} error={submitError}
    onBack={() => { setCurrent(23); setPhase('question'); }}
    onSubmit={submitAssessment} />;

  return <QuestionScreen current={current} selected={selected} onSelect={value => setAnswers(previous => ({ ...previous, [current]: value }))} onNext={goNext} onBack={goBack} />;
}

function Welcome({ onStart }: { onStart: () => void }) {
  return <main className="survey-shell min-h-screen overflow-hidden"><div className="survey-grid" aria-hidden="true" /><section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-12 sm:px-10 lg:px-16"><div className="grid w-full items-end gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="max-w-4xl"><div className="mb-8 flex items-center gap-3 text-sm font-semibold uppercase tracking-[.19em] text-[var(--signal)]"><span className="h-px w-10 bg-current" />{copy.welcome.eyebrow}</div><h1 className="max-w-4xl font-heading text-[clamp(3.25rem,7vw,7.25rem)] font-semibold leading-[.88] tracking-[-.015em] text-balance">{copy.welcome.headline}</h1><div className="mt-9 max-w-2xl space-y-5 text-lg leading-8 text-white/78">{copy.welcome.paragraphs.map(text => <p key={text}>{text}</p>)}</div><Button onClick={onStart} className="mt-10 h-14 rounded-md bg-[var(--signal)] px-7 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_14px_34px_rgba(191,45,50,.24)] hover:bg-[var(--signal-dark)]">Start My Assessment <ArrowRight className="ml-2 size-5" /></Button></div><aside className="mb-1 rounded-lg border border-white/20 bg-white p-7 text-[var(--ink)] shadow-[0_24px_70px_rgba(0,0,0,.18)]"><p className="text-sm font-semibold uppercase tracking-[.16em] text-[var(--signal)]">What you’ll receive</p><p className="mt-4 text-2xl font-semibold leading-tight">{copy.welcome.receive}</p><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-md bg-[var(--paper-deep)] p-4"><Clock3 className="mb-6 size-5 text-[var(--signal)]" /><p className="text-2xl font-semibold">~10</p><p className="text-sm text-[var(--ink-soft)]">minutes</p></div><div className="rounded-md bg-[var(--paper-deep)] p-4"><Layers3 className="mb-6 size-5 text-[var(--signal)]" /><p className="text-2xl font-semibold">24</p><p className="text-sm text-[var(--ink-soft)]">questions</p></div></div><p className="mt-6 border-t border-black/10 pt-5 text-sm leading-6 text-[var(--ink-soft)]">{copy.welcome.honesty}</p></aside></div></section><section className="welcome-dimensions"><h2>{copy.welcome.dimensionsHeading}</h2><div>{sections.map(section => <article key={section.name}><h3>{section.name}</h3><p>{section.lead}</p></article>)}</div><p>{copy.welcome.note}</p></section></main>;
}

function SectionIntro({ sectionIndex, onStart, onBack }: { sectionIndex: number; onStart: () => void; onBack: () => void }) {
  const section = sections[sectionIndex];
  return <main className="survey-shell min-h-screen overflow-hidden"><div className="survey-grid" aria-hidden="true" /><section className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-12 sm:px-10"><div className="w-full"><button onClick={onBack} className="mb-12 flex items-center gap-2 text-sm font-semibold text-white/65 transition hover:text-white"><ArrowLeft className="size-4" /> Back</button><div className="grid gap-10 lg:grid-cols-[9rem_minmax(0,1fr)]"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--signal)]">Section</p><p className="mt-2 font-heading text-8xl font-semibold tracking-normal">0{sectionIndex + 1}</p><p className="mt-4 text-sm text-white/65">4 questions</p></div><div><p className="text-lg font-semibold uppercase text-[var(--teal)]">{section.name}</p><h1 className="mt-5 max-w-3xl font-heading text-[clamp(2.8rem,6vw,5.8rem)] font-semibold leading-[.92] tracking-normal text-balance">{section.lead}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">{section.description}</p><Button onClick={onStart} className="mt-10 h-13 rounded-md bg-[var(--signal)] px-7 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[var(--signal-dark)]">{section.cta} <ArrowRight className="ml-2 size-4" /></Button></div></div></div></section></main>;
}
