import { ArrowLeft, ArrowRight } from 'lucide-react';

export type ContactDetails = { name: string; email: string };

export function ContactScreen({ contact, onChange, onBack, onSubmit, pending, error }: {
  contact: ContactDetails;
  onChange: (contact: ContactDetails) => void;
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
  error: string;
}) {
  return <main className="assessment-design">
    <header className="assessment-header">
      <img src="/inspired-vibe-logo.svg" alt="Inspired Vibe — Business Development Agency" width="270" height="80" />
    </header>
    <section className="contact-stage">
      <div className="question-panel contact-panel">
        <p className="design-eyebrow">Assessment complete · One last step</p>
        <h1>Get your Authority Score</h1>
        <p>Enter your name and email to see your score, six-part breakdown, strongest area, and biggest opportunity.</p>
        <form aria-busy={pending} onSubmit={event => { event.preventDefault(); if (!pending) onSubmit(); }}>
          <div className="contact-field">
            <label htmlFor="assessment-name">Name <span>(required)</span></label>
            <input id="assessment-name" name="name" type="text" autoComplete="name" required
              disabled={pending} maxLength={120} pattern={'.*\\S.*'} title="Please enter your name, not just spaces."
              value={contact.name} onChange={event => onChange({ ...contact, name: event.target.value })} />
          </div>
          <div className="contact-field">
            <label htmlFor="assessment-email">Email <span>(required)</span></label>
            <input id="assessment-email" name="email" type="email" autoComplete="email" required
              disabled={pending} maxLength={254} spellCheck={false} autoCapitalize="none"
              value={contact.email} onChange={event => onChange({ ...contact, email: event.target.value })} />
          </div>
          <p className="contact-note">By submitting, you share your name, email, answers, and scores with Inspired Vibe for assessment review. Your results will appear on the next screen.</p>
          {error && <p className="submission-error" role="alert">{error}</p>}
          <div className="question-navigation">
            <button type="button" disabled={pending} className="design-back" onClick={onBack}><ArrowLeft /> Back</button>
            <button type="submit" disabled={pending} className="design-cta">{pending ? 'Saving your results…' : 'See my results'} <ArrowRight /></button>
          </div>
        </form>
      </div>
    </section>
  </main>;
}
