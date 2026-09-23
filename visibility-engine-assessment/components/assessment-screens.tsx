import type { CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, Lightbulb, Share2, Search, Funnel, Target, Trophy, TriangleAlert, ShieldCheck, Users, MessagesSquare, Star, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { sections, flatQuestions, maturityBand } from '../lib/assessment';

const icons = [Target, Lightbulb, Share2, Search, Funnel, ChartNoAxesCombined];
const advice = [
  'Make your difference easy to recognize across your website, leadership profiles, and sales materials.',
  'Capture leadership insights on a recurring cadence and turn buyer questions into useful content.',
  'Give each strong insight a distribution plan so the right buyers encounter it across channels.',
  'Review what buyers find when they search, then improve the pages and assets that answer their questions.',
  'Connect your expertise to a clear next step and a consistent follow-up process.',
  'Assign clear ownership, plan ahead, and review performance so execution keeps moving.',
];
const summaries = [
  ['Your positioning needs to be easier for buyers to recognize.', 'Buyers can see parts of your positioning; make the story more consistent.', 'Buyers see a clear position and understand the outcomes you deliver.'],
  ['More of your best thinking needs to reach the market.', 'You are producing useful thinking, but the rhythm could be stronger.', 'Your expertise is captured and turned into useful buyer-facing assets.'],
  ['Your ideas are not yet reaching enough of the right buyers.', 'Your expertise travels, but distribution could be more coordinated.', 'Your expertise consistently reaches buyers across coordinated channels.'],
  ['Buyers may struggle to find credible evidence of your expertise.', 'Buyers can find you, with room to improve search visibility.', 'Buyers can find your expertise when they research their problems.'],
  ['Interest needs a clearer path to a meaningful next step.', 'You are creating interest, but some buyers may miss the next step.', 'Your visibility gives buyers a clear path to engage and move forward.'],
  ['Execution still depends on individual effort and availability.', 'Parts of the system continue, but ownership and consistency can improve.', 'You show up, follow through, and keep the system in motion.'],
];
const bands = [
  { range: '0–39', title: 'Your expertise has more to give.', emphasis: 'Build the foundation first.', copy: 'Your answers suggest that valuable expertise is not yet supported by a consistent visibility system. Begin with one clear, repeatable improvement.', note: 'Create a reliable foundation before increasing activity.' },
  { range: '40–59', title: 'You have useful pieces in motion.', emphasis: 'Now connect the system.', copy: 'Buyers can encounter parts of your expertise, but the experience is uneven. Connect your story, ownership, and follow-through so those pieces work together.', note: 'Turn fragmented activity into a connected buyer experience.' },
  { range: '60–79', title: 'Your visibility system is working.', emphasis: 'Now the gaps matter more.', copy: 'Buyers are encountering and appreciating parts of your system and building confidence. Strengthen the weaker areas to make that experience more consistent.', note: 'You have the foundations in place. Focus on closing your biggest gaps to strengthen buyer confidence.' },
  { range: '80–100', title: 'Your authority has a strong foundation.', emphasis: 'Keep the system compounding.', copy: 'Your answers suggest a connected, repeatable visibility system. Protect what is working and refine the areas with the most room to improve.', note: 'Maintain the cadence, review the evidence, and keep refining.' },
];

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
        <div className="question-navigation"><button onClick={onBack} className="design-back"><ArrowLeft /> Back</button><Button onClick={onNext} disabled={selected === undefined} className="design-cta">{current === 23 ? 'See my results' : 'Next question'}<ArrowRight /></Button></div>
      </section>
      <aside className="question-sidebar">
        <div className="question-photo" role="img" aria-label="Inspired Vibe leadership conversation" />
        <div className="dimension-guide"><p><Star /> This assessment measures six parts of your visibility system:</p><ul>{sections.map((item, index) => { const Icon = icons[index]; return <li key={item.name} aria-current={index === question.sectionIndex ? 'step' : undefined}><Icon /><span>{item.name}</span></li>; })}</ul></div>
      </aside>
    </div>
    <footer className="honesty-note"><ShieldCheck /><p>Answer based on what is <strong>actually happening today,</strong><br />not what is planned for next quarter.</p></footer>
  </main>;
}

export function ResultsScreen({ score, dimensions, onRestart }: { score: number; dimensions: { name: string; score: number }[]; onRestart: () => void }) {
  const high = Math.max(...dimensions.map(d => d.score));
  const low = Math.min(...dimensions.map(d => d.score));
  const strengths = dimensions.filter(d => d.score === high);
  const gaps = dimensions.filter(d => d.score === low);
  const allEqual = high === low;
  const band = bands[score < 40 ? 0 : score < 60 ? 1 : score < 80 ? 2 : 3];
  const gapIndex = dimensions.findIndex(d => d.score === low);
  const gapNames = gaps.map(d => d.name).join(' · ');
  return <main className="assessment-design results-design"><BrandHeader />
    <section className="results-hero"><div className="results-hero-copy">
      <p className="design-eyebrow">Your visibility engine results</p><h1>Your Visibility Score is</h1>
      <p className="overall-number">{score}<span>/ 100</span></p><p className="maturity-badge">{maturityBand(score)}</p>
      <p>Your score shows how effectively your expertise is building credibility before the sales conversation starts.</p>
      <p>It reflects whether buyers can understand what makes you different, encounter your thinking, find credible evidence of your expertise, and move toward a meaningful next step without relying on you to create all of that confidence personally.</p>
      <div className="results-manifesto"><Star fill="currentColor" /><p>The goal is not more visibility.<br /><strong>It is more buyer confidence before you enter the room.</strong></p></div>
    </div><div className="results-hero-photo" role="img" aria-label="Inspired Vibe leadership conversation" /></section>
    <div className="results-content">
      <section className="band-panel"><div><h2>{band.title}<br /><em>{band.emphasis}</em></h2><p>{band.copy}</p></div><div className="band-range"><h3>Where your score falls</h3><strong>{band.range}</strong><span>{maturityBand(score)}</span></div><p>{band.note}</p></section>
      <section className="dimension-breakdown"><h2>Here’s where buyer confidence is being built and where it may be getting stuck.</h2><div className="dimension-grid">{dimensions.map((d, index) => { const Icon = icons[index]; const gap = !allEqual && d.score === low; return <article key={d.name} className={gap ? 'dimension-score is-gap' : 'dimension-score'}><Icon /><h3>{d.name}</h3><div className="score-circle" style={{ '--score': d.score } as CSSProperties} aria-label={d.name + ': ' + d.score + ' out of 100'}><div><strong>{d.score}</strong><span>/100</span></div></div><p>{summaries[index][d.score < 40 ? 0 : d.score < 70 ? 1 : 2]}</p></article>; })}</div></section>
      <div className="insight-grid"><section className="insight-card strength-card"><Trophy /><div><p className="design-eyebrow">{allEqual ? 'Your system balance' : 'Your strongest area' + (strengths.length > 1 ? 's' : '')}</p><h2>{allEqual ? 'All six dimensions are aligned at ' + high + '/100.' : strengths.map(d => d.name).join(' · ')}</h2><p>{allEqual ? 'Your answers give every dimension the same score. Review the breakdown to choose the improvement most relevant to your business.' : 'This is where your answers show the strongest foundation for buyers to trust, engage, and move forward with you.'}</p></div></section>
      <section className="insight-card gap-card"><TriangleAlert /><div><p className="design-eyebrow">{allEqual ? 'Your next opportunity' : 'Your biggest gap' + (gaps.length > 1 ? 's' : '')}</p><h2>{allEqual ? 'Choose your next improvement.' : gapNames}</h2><p>{allEqual ? 'No single dimension scores below the others. Choose one concrete action that supports your current business priorities.' : gaps.length > 1 ? 'These dimensions share the lowest score. Start with the one most closely connected to your current buyer journey.' : advice[gapIndex]}</p></div></section></div>
      <section className="buyer-journey"><div><h2>The question is not whether buyers can eventually understand your value.<br /><em>It’s how much work they have to do before they get there.</em></h2><p>By the time a qualified prospect reaches your sales team, they may already have searched your company, looked at your leadership, and reviewed your content.</p></div><ol>{[{Icon: Search, title: 'They research', copy: 'They look for answers before they reach out to you.'},{Icon: ShieldCheck,title: 'They assess credibility',copy: 'They decide who they believe can help them.'},{Icon: Users,title: 'They build confidence',copy: 'They gain confidence from what they discover.'},{Icon: MessagesSquare,title: 'They start the conversation',copy: 'The conversation starts with trust, not a blank slate.'}].map(({Icon,title,copy}) => <li key={title}><Icon /><h3>{title}</h3><p>{copy}</p></li>)}</ol></section>
      <section className="priority-panel"><Target /><div><p className="design-eyebrow">Where to look first</p><h2>{allEqual ? 'Turn your score into a next step.' : gaps.length > 1 ? 'Choose a focus from your tied priorities.' : 'Start with ' + gaps[0].name}</h2><p>{allEqual || gaps.length > 1 ? 'Choose one dimension, agree on a specific action and an owner, and review the result before adding more activity.' : advice[gapIndex]}</p><strong>{allEqual ? 'Your score gives you the pattern. Context helps you decide what to do with it.' : 'Recommended focus: ' + gapNames}</strong></div></section>
      <section className="review-panel"><div><p className="design-eyebrow">Your next step</p><h2>Put your Visibility Score in context.</h2><p>Use your results to start a conversation about your highest-impact opportunities and the next steps that can help you build more buyer confidence.</p><a className="design-cta" href="https://inspiredvibe.com/contact/" target="_blank" rel="noopener noreferrer">Discuss my visibility score <ArrowRight /></a><p className="review-note">Start with your results, not from zero.</p></div><div className="review-photo" role="img" aria-label="A conversation with Inspired Vibe" /></section>
      <div className="results-footer"><span>24 questions · Six equally weighted dimensions · Based on your self-assessment</span><button className="design-back" onClick={onRestart}><RotateCcw /> Retake assessment</button></div>
    </div>
  </main>;
}
