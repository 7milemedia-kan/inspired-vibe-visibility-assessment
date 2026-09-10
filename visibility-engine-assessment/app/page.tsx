'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Check, Clock3, Layers3, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { flatQuestions, maturityBand, sections } from '@/lib/assessment';

type Phase = 'welcome' | 'section' | 'question' | 'results';
type SavedState = { phase: Phase; current: number; answers: Record<number, number> };
type ModelContext = { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> };

declare global { interface Document { readonly modelContext?: ModelContext } }

const STORAGE_KEY = 'visibility-engine-assessment-v1';

export default function Home() {
  const [phase, setPhase] = useState<Phase>('welcome');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedState;
        setPhase(parsed.phase);
        setCurrent(parsed.current);
        setAnswers(parsed.answers ?? {});
      }
    } catch { /* Start fresh if saved data is unavailable. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ phase, current, answers }));
  }, [answers, current, phase, ready]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tool = {
      name: 'complete_visibility_assessment',
      title: 'Complete visibility assessment',
      description: 'Submit scores for all 24 questions and display the calculated assessment results.',
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
        setCurrent(23);
        setPhase('results');
        const total = values.reduce<number>((sum, value) => sum + Number(value), 0);
        const score = Math.round((total / 96) * 100);
        return { score, category: maturityBand(score) };
      },
    };
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* Optional browser capability. */ }
    return () => lifecycle.abort();
  }, []);

  const activeQuestion = flatQuestions[current];
  const activeSection = sections[activeQuestion?.sectionIndex ?? 0];
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
    if (current === 23) { setPhase('results'); return; }
    const next = current + 1;
    setCurrent(next);
    setPhase(flatQuestions[next].sectionIndex !== flatQuestions[current].sectionIndex ? 'section' : 'question');
  }, [answers, current]);

  const goBack = () => {
    if (current === 0) { setPhase('section'); return; }
    const previous = current - 1;
    setCurrent(previous);
    setPhase('question');
  };

  const restart = () => {
    setAnswers({}); setCurrent(0); setPhase('welcome'); localStorage.removeItem(STORAGE_KEY);
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
  }, [current, goNext, phase]);

  if (!ready) return <main className="survey-shell min-h-screen" />;

  if (phase === 'welcome') return <Welcome onStart={() => { setCurrent(0); setPhase('section'); }} />;
  if (phase === 'section') return <SectionIntro sectionIndex={activeQuestion.sectionIndex} onStart={() => setPhase('question')} onBack={activeQuestion.sectionIndex === 0 ? () => setPhase('welcome') : () => { setCurrent(current - 1); setPhase('question'); }} />;
  if (phase === 'results') return <Results score={overallScore} dimensions={dimensionScores} onRestart={restart} />;

  return (
    <main className="survey-shell min-h-screen">
      <div className="survey-grid" aria-hidden="true" />
      <header className="relative mx-auto flex w-full max-w-6xl items-center gap-5 px-5 py-6 sm:px-10">
        <button onClick={goBack} className="flex size-10 items-center justify-center rounded-sm border border-white/30 bg-white/10 text-white transition hover:bg-white hover:text-[var(--ink)]" aria-label="Previous question"><ArrowLeft className="size-4" /></button>
        <div className="flex-1"><div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-[.15em] text-white/70"><span>{activeSection.name}</span><span>{current + 1} / 24</span></div><Progress value={((current + 1) / 24) * 100} className="h-1.5 bg-white/20 [&_[data-slot=progress-indicator]]:bg-[var(--signal)]" /></div>
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl gap-8 px-5 pb-12 pt-5 sm:px-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:pt-10">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.18em] text-[var(--signal)]">Question {current + 1}</p>
          <h1 className="max-w-4xl font-heading text-[clamp(2rem,4.5vw,4.4rem)] font-semibold leading-[1.02] tracking-[-.045em] text-balance">{activeQuestion.prompt}</h1>
          {activeQuestion.note && <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">{activeQuestion.note}</p>}

          <RadioGroup value={selected === undefined ? '' : String(selected)} onValueChange={(value) => setAnswers((previous) => ({ ...previous, [current]: Number(value) }))} className="mt-9 gap-3">
            {activeQuestion.choices.map((choice) => (
              <label key={choice.label} className={`answer-card group ${selected === choice.score ? 'answer-card-selected' : ''}`}>
                <RadioGroupItem value={String(choice.score)} className="sr-only" />
                <span className="answer-letter">{choice.label}</span>
                <span className="flex-1 text-base font-medium leading-6 sm:text-lg">{choice.text}</span>
                <span className="answer-check"><Check className="size-4" /></span>
              </label>
            ))}
          </RadioGroup>

          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="hidden text-sm text-white/65 sm:block">Press A–E or 1–5 to choose</p>
            <Button onClick={goNext} disabled={selected === undefined} className="ml-auto h-12 rounded-md bg-[var(--signal)] px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[var(--signal-dark)]">{current === 23 ? 'See My Results' : 'Continue'} <ArrowRight className="ml-2 size-4" /></Button>
          </div>
        </div>
        <aside className="hidden border-l border-white/20 pl-7 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/65">Section {activeQuestion.sectionIndex + 1} of 6</p>
          <p className="mt-3 text-lg font-semibold leading-snug">{activeSection.name}</p>
          <div className="mt-7 space-y-3">{sections.map((section, index) => <div key={section.name} className={`flex items-center gap-3 text-sm ${index === activeQuestion.sectionIndex ? 'font-semibold text-white' : index < activeQuestion.sectionIndex ? 'text-[var(--signal)]' : 'text-white/55'}`}><span className={`size-2 rounded-full ${index <= activeQuestion.sectionIndex ? 'bg-[var(--signal)]' : 'bg-white/25'}`} />{index + 1}. {section.name}</div>)}</div>
        </aside>
      </section>
    </main>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return <main className="survey-shell min-h-screen overflow-hidden"><div className="survey-grid" aria-hidden="true" /><section className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-12 sm:px-10 lg:px-16"><div className="grid w-full items-end gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]"><div className="max-w-4xl"><div className="mb-8 flex items-center gap-3 text-sm font-semibold uppercase tracking-[.19em] text-[var(--signal)]"><span className="h-px w-10 bg-current" />Your Visibility Engine Assessment</div><h1 className="max-w-4xl font-heading text-[clamp(3.25rem,7vw,7.25rem)] font-semibold leading-[.88] tracking-[-.015em] text-balance">Let’s see how much credibility is being built before you enter the room.</h1><div className="mt-9 max-w-2xl space-y-5 text-lg leading-8 text-white/78"><p>This assessment looks at six parts of the system behind your visibility—not how often you post or how many followers you have.</p><p>We’re looking at whether the expertise your buyers trust is actually being positioned, captured, distributed, found, and connected to a meaningful next step.</p></div><Button onClick={onStart} className="mt-10 h-14 rounded-md bg-[var(--signal)] px-7 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_14px_34px_rgba(191,45,50,.24)] hover:bg-[var(--signal-dark)]">Start My Assessment <ArrowRight className="ml-2 size-5" /></Button></div><aside className="mb-1 rounded-lg border border-white/20 bg-white p-7 text-[var(--ink)] shadow-[0_24px_70px_rgba(0,0,0,.18)]"><p className="text-sm font-semibold uppercase tracking-[.16em] text-[var(--signal)]">What you’ll receive</p><p className="mt-4 text-2xl font-semibold leading-tight">Your score, six-part breakdown, strongest area, and first-priority gap.</p><div className="mt-8 grid grid-cols-2 gap-3"><div className="rounded-md bg-[var(--paper-deep)] p-4"><Clock3 className="mb-6 size-5 text-[var(--signal)]" /><p className="text-2xl font-semibold">~10</p><p className="text-sm text-[var(--ink-soft)]">minutes</p></div><div className="rounded-md bg-[var(--paper-deep)] p-4"><Layers3 className="mb-6 size-5 text-[var(--signal)]" /><p className="text-2xl font-semibold">24</p><p className="text-sm text-[var(--ink-soft)]">questions</p></div></div><p className="mt-6 border-t border-black/10 pt-5 text-sm leading-6 text-[var(--ink-soft)]">Answer based on what is actually happening today—not what is planned for next quarter.</p></aside></div></section></main>;
}

function SectionIntro({ sectionIndex, onStart, onBack }: { sectionIndex: number; onStart: () => void; onBack: () => void }) {
  const section = sections[sectionIndex];
  return <main className="survey-shell min-h-screen overflow-hidden"><div className="survey-grid" aria-hidden="true" /><section className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-12 sm:px-10"><div className="w-full"><button onClick={onBack} className="mb-12 flex items-center gap-2 text-sm font-semibold text-white/65 transition hover:text-white"><ArrowLeft className="size-4" /> Back</button><div className="grid gap-10 lg:grid-cols-[9rem_minmax(0,1fr)]"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--signal)]">Section</p><p className="mt-2 font-heading text-8xl font-semibold tracking-normal">0{sectionIndex + 1}</p><p className="mt-4 text-sm text-white/65">4 questions</p></div><div><p className="text-lg font-semibold uppercase text-[var(--teal)]">{section.name}</p><h1 className="mt-5 max-w-3xl font-heading text-[clamp(2.8rem,6vw,5.8rem)] font-semibold leading-[.92] tracking-normal text-balance">{section.lead}</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">{section.description}</p><Button onClick={onStart} className="mt-10 h-13 rounded-md bg-[var(--signal)] px-7 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[var(--signal-dark)]">{section.cta} <ArrowRight className="ml-2 size-4" /></Button></div></div></div></section></main>;
}

function Results({ score, dimensions, onRestart }: { score: number; dimensions: { name: string; score: number }[]; onRestart: () => void }) {
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const strongest = sorted[0]; const gap = sorted.at(-1)!;
  return <main className="survey-shell min-h-screen"><div className="survey-grid" aria-hidden="true" /><section className="relative mx-auto w-full max-w-6xl px-5 py-12 sm:px-10 lg:py-16"><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-sm font-semibold uppercase tracking-[.18em] text-[var(--signal)]">Your Visibility Score</p><h1 className="mt-3 font-heading text-[clamp(3rem,6vw,6rem)] font-semibold leading-[.9] tracking-normal">{maturityBand(score)}</h1></div><button onClick={onRestart} className="flex items-center gap-2 rounded-md border border-white/25 bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper-deep)]"><RotateCcw className="size-4" /> Restart</button></div><div className="mt-10 grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]"><div className="score-orb"><span className="font-heading text-8xl font-semibold tracking-normal">{score}</span><span className="mt-1 text-sm font-semibold uppercase tracking-[.18em]">out of 100</span></div><div className="grid gap-4 sm:grid-cols-2"><div className="result-callout"><Sparkles className="size-5 text-[var(--signal)]" /><p className="mt-7 text-sm font-semibold uppercase tracking-[.15em] text-[var(--ink-soft)]">Strongest area</p><p className="mt-2 text-2xl font-semibold">{strongest.name}</p><p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">This is the part of your visibility engine with the strongest current foundation.</p></div><div className="result-callout"><BarChart3 className="size-5 text-[var(--signal)]" /><p className="mt-7 text-sm font-semibold uppercase tracking-[.15em] text-[var(--ink-soft)]">First-priority gap</p><p className="mt-2 text-2xl font-semibold">{gap.name}</p><p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">This may be the most useful place to focus before adding more activity elsewhere.</p></div></div></div><div className="mt-5 rounded-lg border border-white/20 bg-white p-6 text-[var(--ink)] sm:p-8"><h2 className="font-heading text-4xl font-semibold tracking-normal">Your six-part breakdown</h2><div className="mt-7 grid gap-5 sm:grid-cols-2">{dimensions.map((dimension, index) => <div key={dimension.name}><div className="mb-2 flex items-end justify-between gap-4"><p className="font-semibold"><span className="mr-2 text-[var(--signal)]">0{index + 1}</span>{dimension.name}</p><span className="text-lg font-semibold">{dimension.score}</span></div><div className="h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[var(--teal)] transition-all duration-700" style={{ width: `${dimension.score}%` }} /></div></div>)}</div></div></section></main>;
}
