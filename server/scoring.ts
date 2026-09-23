import { flatQuestions, sections, maturityBand } from '../visibility-engine-assessment/lib/assessment';
export function calculateResults(answers: number[]) {
  const score = Math.round(answers.reduce((sum, value) => sum + value, 0) / 96 * 100);
  const dimensions = sections.map((section, index) => ({
    name: section.name,
    score: Math.round(answers.slice(index * 4, index * 4 + 4).reduce((sum, value) => sum + value, 0) / 16 * 100),
  }));
  const high = Math.max(...dimensions.map(d => d.score));
  const low = Math.min(...dimensions.map(d => d.score));
  return {
    score, band: maturityBand(score), dimensions,
    strongest: dimensions.filter(d => d.score === high).map(d => d.name),
    gaps: dimensions.filter(d => d.score === low).map(d => d.name),
    allEqual: high === low,
  };
}
export function answerSnapshot(answers: number[]) {
  return flatQuestions.map((question, index) => ({
    number: index + 1, section: sections[question.sectionIndex].name,
    question: question.prompt, ...question.choices[answers[index]],
  }));
}
