import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, Lightbulb, Share2, Search, Funnel, Target, Trophy, TriangleAlert, ShieldCheck, Users, MessagesSquare, Star, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { sections, flatQuestions, maturityBand } from '../lib/assessment';
import { assessmentCopy as copy } from '../lib/assessment-copy';

const icons = [Target, Lightbulb, Share2, Search, Funnel, ChartNoAxesCombined];
function BrandHeader({ progress }: { progress?: number }) {
  return <header className="assessment-header"><img src="/inspired-vibe-logo.svg" alt="Inspired Vibe — Business Development Agency" width="270" height="80" />
    {progress !== undefined && <div className="header-progress"><div><span>Your progress</span><strong>{progress}% complete</strong></div><Progress aria-label="Assessment progress" value={progress} /></div>}
  </header>;
}

export function QuestionScreen({ current, selected, onSelect, onNext, onBack }: { current: number; selected?: number; onSelect: (value: number) => void; onNext: () => void; onBack: () => void }) {
  const question = flatQuestions[current];
  const section = sections[question.sectionIndex];
  const progress = Math.round((current + 1) / 24 * 100);
  return <main className="assessment-design">
    <BrandHeader progress={progress} />
    <div className="question-stage">
      <section className="question-panel">
        <p className="design-eyebrow">Section {question.sectionIndex + 1} of 6</p>
        <h1>{section.name}</h1>
        <p className="section-lead">{section.lead}</p>
        <div className="question-progress"><Progress value={progress} aria-label="Question progress" /><span>Question {current + 1} of 24</span></div>
        <h2 id="question-heading">{question.prompt}</h2>
        {question.note && <p className="question-note">{question.note}</p>}
        <RadioGroup aria-labelledby="question-heading" value={selected === undefined ? '' : String(selected)} onValueChange={value => onSelect(Number(value))} className="reference-answers">
          {question.choices.map(choice => <label key={choice.label} className={selected === choice.score ? 'reference-answer is-selected' : 'reference-answer'}>
            <RadioGroupItem value={String(choice.score)} className="reference-radio" />
            <span><b>{choice.label}.</b> {choice.text}</span>
          </label>)}
        </RadioGroup>
        <div className="question-navigation"><button onClick={onBack} className="design-back"><ArrowLeft /> Back</button><Button onClick={onNext} disabled={selected === undefined} className="design-cta">{current === 23 ? 'Continue to results' : 'Next question'}<ArrowRight /></Button></div>
      </section>
      <aside className="question-sidebar">
        <div className="question-photo" role="img" aria-label="Inspired Vibe leadership conversation" />
        <div className="dimension-guide"><p><Star /> {copy.welcome.dimensionsHeading}</p><ul>{sections.map((item, index) => { const Icon = icons[index]; return <li key={item.name} aria-current={index === question.sectionIndex ? 'step' : undefined}><Icon /><span>{item.name}</span></li>; })}</ul></div>
      </aside>
    </div>
    <footer className="honesty-note"><ShieldCheck /><p>Answer based on what is <strong>actually happening today,</strong><br />not what is planned for next quarter.</p></footer>
  </main>;
}

function Paragraphs({ items }: { items: string[] }) {
  return <>{items.map((text, index) => <p key={index}>{text}</p>)}</>;
}

export function ResultsScreen({ score, dimensions, onRestart }: { score: number; dimensions: { name: string; score: number }[]; onRestart: () => void }) {
  const high = Math.max(...dimensions.map(d => d.score));
  const low = Math.min(...dimensions.map(d => d.score));
  const strengths = dimensions.map((d, index) => ({ ...d, index })).filter(d => d.score === high);
  const gaps = dimensions.map((d, index) => ({ ...d, index })).filter(d => d.score === low);
  const allEqual = high === low;
  const band = copy.bands[score < 40 ? 0 : score < 60 ? 1 : score < 80 ? 2 : 3];
  const gapNames = gaps.map(d => d.name).join(' · ');
  const journeyIcons = [Search, ShieldCheck, Users, MessagesSquare];
  return <main className="assessment-design results-design"><BrandHeader />
    <section className="results-hero"><div className="results-hero-copy">
      <p className="design-eyebrow">{copy.hero.eyebrow}</p><h1>Your Authority Score is</h1>
      <p className="overall-number">{score}<span>/ 100</span></p><p className="maturity-badge">{maturityBand(score)}</p>
      <Paragraphs items={copy.hero.paragraphs} />
      <div className="results-manifesto"><Star fill="currentColor" /><p>{copy.hero.emphasis}</p></div>
    </div><div className="results-hero-photo" role="img" aria-label="Inspired Vibe leadership conversation" /></section>
    <div className="results-content">
      <section className="band-panel"><div><h2>{band.title}</h2><Paragraphs items={band.paragraphs} /></div><div className="band-range"><h3>Where your score falls</h3><strong>{band.range}</strong><span>{band.name}</span></div></section>
      <section className="dimension-breakdown"><h2>{copy.breakdown.headline}</h2><div className="breakdown-intro"><Paragraphs items={copy.breakdown.paragraphs} /></div><div className="dimension-grid">{dimensions.map((d, index) => { const Icon = icons[index]; const gap = !allEqual && d.score === low; return <article key={d.name} className={gap ? 'dimension-score is-gap' : 'dimension-score'}><Icon /><h3>{d.name}</h3><div className="score-circle" style={{ '--score': d.score } as CSSProperties} aria-label={d.name + ': ' + d.score + ' out of 100'}><div><strong>{d.score}</strong><span>/100</span></div></div><p>{copy.breakdown.descriptions[index]}</p></article>; })}</div></section>
      <div className="insight-grid">
        <section className="insight-card strength-card"><Trophy /><div>
          <p className="design-eyebrow">{allEqual ? 'Your system balance' : strengths.length > 1 ? 'Your strongest areas' : copy.strength.eyebrow}</p>
          <h2>{allEqual ? 'All six dimensions are aligned at ' + high + '/100.' : (strengths.length > 1 ? 'Your strongest areas are ' : 'Your strongest area is ') + strengths.map(d => d.name).join(' · ')}</h2>
          {allEqual ? <p>Your answers give every dimension the same score. No single area ranks above the others.</p> : <><Paragraphs items={copy.strength.paragraphs} />{strengths.map(d => <div className="dynamic-explanation" key={d.name}>{strengths.length > 1 && <h3>{d.name}</h3>}<Paragraphs items={copy.strengths[d.index].paragraphs} /></div>)}<p className="copy-emphasis">{copy.strength.emphasis}</p></>}
        </div></section>
        <section className="insight-card gap-card"><TriangleAlert /><div>
          <p className="design-eyebrow">{allEqual ? 'Your next opportunity' : copy.gap.eyebrow}</p>
          <h2>{allEqual ? 'Choose your next improvement.' : (gaps.length > 1 ? 'Your biggest opportunities are ' : 'Your biggest opportunity is ') + gapNames}</h2>
          {allEqual ? <p>No single dimension scores below the others. Choose one concrete action that supports your current business priorities.</p> : <><Paragraphs items={copy.gap.paragraphs} />{gaps.length > 1 && <p>These areas share your lowest score.</p>}{gaps.map(d => <div className="dynamic-explanation" key={d.name}>{gaps.length > 1 && <h3>{d.name}</h3>}<Paragraphs items={copy.gaps[d.index].paragraphs} /></div>)}<p className="copy-emphasis">{copy.gap.emphasis}</p></>}
        </div></section>
      </div>
      <section className="buyer-journey"><div><h2>{copy.journey.headline}</h2><Paragraphs items={copy.journey.paragraphs} /><p className="copy-emphasis">{copy.journey.endpoint}</p></div><ol>{copy.journey.steps.map((step,index) => { const Icon = journeyIcons[index]; return <li key={step.title}><Icon /><h3>{step.title}</h3><p>{step.copy}</p></li>; })}</ol></section>
      <section className="priority-panel"><Target /><div><p className="design-eyebrow">{copy.priority.eyebrow}</p>
        <h2>{allEqual ? 'Turn your score into a next step.' : gaps.length > 1 ? 'Choose a focus from your tied priorities.' : 'Start with ' + gaps[0].name}</h2>
        <Paragraphs items={copy.priority.paragraphs.slice(0,2)} />
        {!allEqual && <><p>{gaps.length === 1 ? copy.priority.paragraphs[2].replace('[DYNAMIC PRIORITY AREA]', gapNames) : 'Based on your assessment, these equally scored areas are worth looking at first: ' + gapNames + '.'}</p>{gaps.map(d => <div className="dynamic-explanation" key={d.name}>{gaps.length > 1 && <h3>{d.name}</h3>}<Paragraphs items={copy.priorities[d.index].paragraphs} /></div>)}</>}
        <p>{copy.priority.paragraphs[3]}</p><p className="diagnostic-note">{copy.priority.note}</p>
      </div></section>
      <section className="context-transition"><h2>{copy.transition}</h2></section>
      <section className="review-panel"><div><p className="design-eyebrow">{copy.review.eyebrow}</p><h2>{copy.review.headline}</h2><Paragraphs items={copy.review.paragraphs} /><ul>{copy.review.bullets.map(text => <li key={text}>{text}</li>)}</ul><a className="design-cta" href="https://inspiredvibe.com/contact/" target="_blank" rel="noopener noreferrer">{copy.review.cta}<ArrowRight /></a><p className="review-note">{copy.review.microcopy}</p></div><div className="review-photo" role="img" aria-label="A conversation with Inspired Vibe" /></section>
      <div className="results-footer"><span>24 questions · Six equally weighted dimensions · Based on your self-assessment</span><button className="design-back" onClick={onRestart}><RotateCcw /> Retake assessment</button></div>
    </div>
  </main>;
}
