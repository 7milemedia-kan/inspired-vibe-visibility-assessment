export type Choice = { label: string; text: string; score: number };
export type Question = { prompt: string; note?: string; choices: Choice[] };
export type Section = { name: string; lead: string; description: string; cta: string; questions: Question[] };

const choices = (...texts: string[]): Choice[] =>
  texts.map((text, score) => ({ label: String.fromCharCode(65 + score), text, score }));

export const sections: Section[] = [
  {
    name: 'Market Authority & Positioning',
    lead: 'Before buyers trust you, they have to understand you.',
    description: 'You may know exactly why your company is different. The question is whether a qualified buyer can see that difference without needing you to explain it personally.',
    cta: 'Start Section 1',
    questions: [
      { prompt: 'How quickly can the right buyer understand what makes your company meaningfully different?', choices: choices('It usually is not clear without a conversation', 'Someone from our team normally has to explain it', 'The basics are clear, but the difference is not always obvious', 'It is clear across most of our key buyer touchpoints', 'It is clear, differentiated, and consistently reinforced') },
      { prompt: 'How consistently does your team communicate the same core story about the company?', choices: choices('It varies depending on who is speaking', 'We have general ideas, but nothing formal guides the message', 'We have some shared language, but it is not used everywhere', 'We have a documented message that guides most market-facing communication', 'We have a documented message that is consistently used, tested, and refined') },
      { prompt: 'Does your leadership have a point of view buyers would recognize as distinctly yours?', choices: choices('Not really', 'Our point of view mostly comes out when someone asks us directly', 'We have a few repeatable ideas or themes', 'We have a clear point of view that shows up consistently', 'Our point of view is recognizable across the market and tied to what we want to be known for') },
      { prompt: 'If a buyer moves from your website to LinkedIn to sales material, how consistent is the story they experience?', choices: choices('It feels noticeably different from place to place', 'There are more differences than similarities', 'Some pieces align, but others do not', 'The story is mostly consistent', 'The positioning feels intentionally connected across the buyer journey') },
    ],
  },
  {
    name: 'Thought Leadership Production',
    lead: 'Your best thinking already exists. Does it make it out of the room?',
    description: 'Your expertise shows up every day in conversations, decisions, customer questions, sales calls, and industry observations. This section looks at whether that thinking is being captured and turned into something buyers can experience before they speak with you.',
    cta: 'Start Section 2',
    questions: [
      { prompt: 'How often is founder or executive expertise intentionally captured in a reusable format?', note: 'Think podcast, video, interview, recorded conversation, voice note, or another format that can continue working after the conversation ends.', choices: choices('Almost never', 'A few times a year', 'Occasionally, roughly monthly or less', 'At least a couple of times each month', 'We have a consistent recurring cadence') },
      { prompt: 'What usually has to happen before your expertise becomes market-facing content?', choices: choices('Nothing happens unless the founder creates it personally', 'The founder usually has to prompt or drive the process', 'The team has an informal process, but it is inconsistent', 'There is a repeatable workflow with clear ownership', 'There is a repeatable workflow with clear ownership, timing, and accountability') },
      { prompt: 'Once you have a strong conversation or piece of insight, how much additional value do you get from it?', choices: choices('It usually ends there', 'It may become one or two additional pieces', 'We repurpose good material sometimes', 'Strong conversations consistently become several useful assets', 'One strong conversation is systematically turned into multiple assets across channels and buyer touchpoints') },
      { prompt: 'How closely is your thought leadership connected to the problems buyers actually bring into sales conversations?', choices: choices('Rarely', 'Sometimes, but mostly by accident', 'It is a mix of buyer-relevant and general topics', 'Most topics connect directly to buyer and business priorities', 'Buyer questions, sales conversations, and business priorities consistently shape what we publish') },
    ],
  },
  {
    name: 'Distribution',
    lead: 'Strong expertise cannot build confidence if the right buyers never encounter it.',
    description: 'Creating the asset is only the beginning. This section looks at whether your expertise consistently travels beyond the place where it was originally created.',
    cta: 'Start Section 3',
    questions: [
      { prompt: 'Across how many channels does your leadership expertise show up consistently?', choices: choices('None consistently', 'One primary channel', 'Two channels', 'Three channels', 'Four or more coordinated channels') },
      { prompt: 'After a strong piece of content is created, is there a clear plan for where it goes next?', choices: choices('No', 'Rarely', 'Sometimes', 'Usually', 'Always, with the content adapted for the channel rather than simply reposted') },
      { prompt: 'How often do relationships help extend the reach of your expertise?', note: 'Think guests, partners, clients, associations, industry peers, or other trusted networks.', choices: choices('Never', 'Rarely', 'Occasionally', 'Regularly', 'Relationship-based amplification is intentionally built into our distribution') },
      { prompt: 'Who makes sure your visibility stays active after something is published?', choices: choices('No one clearly owns it', 'The founder handles most of it', 'Responsibility is shared and sometimes unclear', 'A dedicated person or partner owns publishing and engagement', 'A dedicated owner follows a defined process for publishing, engagement, and follow-through') },
    ],
  },
  {
    name: 'Discoverability',
    lead: 'Buyers cannot trust expertise they cannot find.',
    description: 'Prospects are researching before the first call. This section looks at whether credible evidence of your expertise is showing up when they search your company, your people, your category, and the problems you solve.',
    cta: 'Start Section 4',
    questions: [
      { prompt: 'How intentionally are you improving the way buyers find your company and expertise through search?', choices: choices('We are not', 'We have basic website SEO, but little beyond that', 'We optimize occasionally', 'We have an ongoing search strategy', 'Search is actively managed and connected to our content and performance data') },
      { prompt: 'How much attention are you giving to how your expertise appears in AI-driven search and answer platforms?', choices: choices('None', 'We are aware of it but have not acted', 'We have done limited testing', 'We are actively optimizing for AI and answer-engine visibility', 'We actively optimize, monitor, and refine how our expertise appears in those environments') },
      { prompt: 'How consistently are your podcast, video, and long-form assets optimized so buyers can actually find them?', choices: choices('They generally are not optimized', 'It depends on the asset', 'We use basic optimization', 'Titles, descriptions, metadata, and supporting pages are consistently optimized', 'Optimization is consistent and informed by search or performance data') },
      { prompt: 'How often do you look at what a buyer actually sees when they search for your company, leaders, category, or key problems?', choices: choices('Never', 'Rarely', 'Occasionally', 'Regularly', 'Regularly, and what we find leads to specific actions') },
    ],
  },
  {
    name: 'Conversion',
    lead: 'Credibility only helps the business if buyers know what to do with it.',
    description: 'A prospect can understand you, trust you, and still disappear if there is no clear next step. This section looks at whether visibility is actually connected to a buyer journey.',
    cta: 'Start Section 5',
    questions: [
      { prompt: 'When buyers engage with your expertise, how clear is the next step?', choices: choices('There usually is not one', 'A next step appears occasionally', 'Some content has a next step, some does not', 'Most content gives the right buyer a clear next action', 'We intentionally match next steps to where the buyer is in the journey') },
      { prompt: 'How intentionally are you capturing interest from buyers who are not ready to talk yet?', choices: choices('We are not', 'We mostly rely on a contact form', 'We have one or two lead-capture opportunities', 'We have multiple defined ways for buyers to raise their hand', 'Lead capture is integrated across campaigns, content, and buyer intent') },
      { prompt: 'What happens after someone raises their hand?', choices: choices('Nothing consistent', 'Someone follows up manually when possible', 'We have basic automated follow-up', 'We have defined nurture sequences', 'Follow-up changes based on what the prospect did and where they are in the buyer journey') },
      { prompt: 'How clearly can you see whether visibility is influencing real sales conversations?', choices: choices('We cannot', 'Mostly through anecdotes', 'We can connect some activity manually', 'We review visibility and pipeline influence regularly', 'We have reliable reporting that connects engagement to sales or pipeline activity') },
    ],
  },
  {
    name: 'Execution & Consistency',
    lead: 'The system should keep moving even when you are not the one pushing it.',
    description: 'This is where founder dependency becomes visible. A strong system should preserve the founder’s voice and expertise without requiring the founder to personally drive every step.',
    cta: 'Start Final Section',
    questions: [
      { prompt: 'Who owns your visibility system day to day?', choices: choices('No one clearly owns it', 'The founder owns most of it', 'Responsibility is shared across several people', 'A dedicated internal person or partner owns it', 'An accountable team owns it with clearly defined roles') },
      { prompt: 'How far ahead is your visibility and content activity actually planned?', choices: choices('It is mostly reactive', 'We plan when something comes up', 'We usually have a short-term plan', 'We consistently plan at least 30 days ahead', 'We work from a 60 to 90 day plan tied to current business priorities') },
      { prompt: 'What happens to execution when the founder becomes unavailable?', choices: choices('It stops', 'It usually slows down significantly', 'Some things continue, but key pieces stall', 'Most of the system continues', 'The system continues reliably without the founder having to drive every step') },
      { prompt: 'How consistently do you look at what is working and adjust your visibility strategy?', choices: choices('We do not', 'Mostly when something goes wrong', 'Irregularly or a few times a year', 'We review performance monthly', 'We review monthly and make documented decisions about what to change next') },
    ],
  },
];

export const flatQuestions = sections.flatMap((section, sectionIndex) =>
  section.questions.map((question, questionIndex) => ({ ...question, sectionIndex, questionIndex })),
);

export const maturityBand = (score: number) => {
  if (score <= 39) return 'Expertise Trapped';
  if (score <= 59) return 'Visible but Fragmented';
  if (score <= 79) return 'Emerging Visibility Engine';
  return 'Compounding Market Authority';
};
