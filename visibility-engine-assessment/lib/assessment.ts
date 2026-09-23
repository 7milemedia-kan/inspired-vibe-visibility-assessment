import { assessmentCopy } from './assessment-copy.js';
export type Choice = { label: string; text: string; score: number };
export type Question = { prompt: string; note?: string; choices: Choice[] };
export type Section = { name: string; lead: string; description: string; cta: string; questions: Question[] };

export const sections: Section[] = [
  {
    "name": "Why Buyers Choose You",
    "lead": "Can buyers quickly understand what makes your approach different and why it matters to them?",
    "description": "",
    "cta": "Start Section 1",
    "questions": [
      {
        "prompt": "How quickly can a qualified buyer understand what makes your company different and why that difference matters?",
        "choices": [
          {
            "label": "A",
            "text": "They usually cannot tell",
            "score": 0
          },
          {
            "label": "B",
            "text": "It typically requires a sales conversation",
            "score": 1
          },
          {
            "label": "C",
            "text": "They can understand some of it",
            "score": 2
          },
          {
            "label": "D",
            "text": "It is clear in most places buyers encounter us",
            "score": 3
          },
          {
            "label": "E",
            "text": "It is clear, differentiated, and consistently reinforced",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How clearly is the way you explain your company documented so your team can communicate it consistently?",
        "choices": [
          {
            "label": "A",
            "text": "It is not documented",
            "score": 0
          },
          {
            "label": "B",
            "text": "We rely mostly on what people know internally",
            "score": 1
          },
          {
            "label": "C",
            "text": "Parts of it are documented",
            "score": 2
          },
          {
            "label": "D",
            "text": "We have a documented approach that the team uses",
            "score": 3
          },
          {
            "label": "E",
            "text": "It is documented, consistently used, and regularly refined",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How clearly can buyers see your founder or leadership team's point of view on the problems your market cares about?",
        "choices": [
          {
            "label": "A",
            "text": "There is no clear point of view",
            "score": 0
          },
          {
            "label": "B",
            "text": "It mostly comes out in live conversations",
            "score": 1
          },
          {
            "label": "C",
            "text": "Buyers can find some recurring ideas",
            "score": 2
          },
          {
            "label": "D",
            "text": "Our point of view is clear and repeatable",
            "score": 3
          },
          {
            "label": "E",
            "text": "Our point of view is clear, distinctive, and consistently visible",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How consistent is the story buyers encounter across your website, social channels, content, and sales materials?",
        "choices": [
          {
            "label": "A",
            "text": "Very inconsistent",
            "score": 0
          },
          {
            "label": "B",
            "text": "Mostly inconsistent",
            "score": 1
          },
          {
            "label": "C",
            "text": "It varies depending on where they look",
            "score": 2
          },
          {
            "label": "D",
            "text": "Mostly consistent",
            "score": 3
          },
          {
            "label": "E",
            "text": "Highly consistent across the buyer journey",
            "score": 4
          }
        ]
      }
    ]
  },
  {
    "name": "Your Thinking in the Market",
    "lead": "Does the experience inside customer, sales, and leadership conversations become something buyers can learn from?",
    "description": "",
    "cta": "Start Section 2",
    "questions": [
      {
        "prompt": "How often does your best thinking become something buyers can learn from before speaking with your team?",
        "choices": [
          {
            "label": "A",
            "text": "Almost never",
            "score": 0
          },
          {
            "label": "B",
            "text": "A few times a year",
            "score": 1
          },
          {
            "label": "C",
            "text": "About once a month or less",
            "score": 2
          },
          {
            "label": "D",
            "text": "Multiple times per month",
            "score": 3
          },
          {
            "label": "E",
            "text": "It happens through a consistent, repeatable process",
            "score": 4
          }
        ]
      },
      {
        "prompt": "What usually has to happen before your best thinking becomes something buyers can learn from?",
        "choices": [
          {
            "label": "A",
            "text": "There is no process",
            "score": 0
          },
          {
            "label": "B",
            "text": "It usually depends on the founder or executive in the conversation",
            "score": 1
          },
          {
            "label": "C",
            "text": "We have an informal process",
            "score": 2
          },
          {
            "label": "D",
            "text": "We have a repeatable process",
            "score": 3
          },
          {
            "label": "E",
            "text": "We have a repeatable process with clear ownership and timelines",
            "score": 4
          }
        ]
      },
      {
        "prompt": "When a valuable conversation, interview, presentation, or insight happens, how consistently does it get reused to support the sales process after the moment has passed?",
        "choices": [
          {
            "label": "A",
            "text": "It usually ends there",
            "score": 0
          },
          {
            "label": "B",
            "text": "We may reuse one or two pieces",
            "score": 1
          },
          {
            "label": "C",
            "text": "We sometimes turn it into additional material",
            "score": 2
          },
          {
            "label": "D",
            "text": "We consistently turn it into several useful pieces",
            "score": 3
          },
          {
            "label": "E",
            "text": "We systematically extend it across multiple formats and places buyers spend time",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How closely does the thinking you share reflect the real questions, concerns, and problems buyers bring into sales conversations?",
        "choices": [
          {
            "label": "A",
            "text": "Rarely",
            "score": 0
          },
          {
            "label": "B",
            "text": "Sometimes",
            "score": 1
          },
          {
            "label": "C",
            "text": "It varies",
            "score": 2
          },
          {
            "label": "D",
            "text": "Usually",
            "score": 3
          },
          {
            "label": "E",
            "text": "It is consistently shaped by what buyers and sales are telling us",
            "score": 4
          }
        ]
      }
    ]
  },
  {
    "name": "Reaching the Right Buyers",
    "lead": "Is your best thinking reaching the people who need to see it before they decide?",
    "description": "",
    "cta": "Start Section 3",
    "questions": [
      {
        "prompt": "How consistently is your best thinking reaching buyers in the places they already spend time?",
        "choices": [
          {
            "label": "A",
            "text": "It is not reaching them consistently",
            "score": 0
          },
          {
            "label": "B",
            "text": "It is reaching buyers in one main place",
            "score": 1
          },
          {
            "label": "C",
            "text": "It is reaching buyers in two places",
            "score": 2
          },
          {
            "label": "D",
            "text": "It is reaching buyers consistently in three places",
            "score": 3
          },
          {
            "label": "E",
            "text": "It is reaching buyers through four or more coordinated channels",
            "score": 4
          }
        ]
      },
      {
        "prompt": "When you share an important idea or piece of expertise, is there a clear plan for how the right buyers will actually encounter it?",
        "choices": [
          {
            "label": "A",
            "text": "No",
            "score": 0
          },
          {
            "label": "B",
            "text": "Rarely",
            "score": 1
          },
          {
            "label": "C",
            "text": "Sometimes",
            "score": 2
          },
          {
            "label": "D",
            "text": "Usually",
            "score": 3
          },
          {
            "label": "E",
            "text": "Always, with the message adapted for each relevant channel",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How often do clients, partners, guests, or industry relationships help your expertise reach buyers beyond your existing audience?",
        "choices": [
          {
            "label": "A",
            "text": "Never",
            "score": 0
          },
          {
            "label": "B",
            "text": "Rarely",
            "score": 1
          },
          {
            "label": "C",
            "text": "Occasionally",
            "score": 2
          },
          {
            "label": "D",
            "text": "Regularly",
            "score": 3
          },
          {
            "label": "E",
            "text": "It is intentionally built into how we expand our reach",
            "score": 4
          }
        ]
      },
      {
        "prompt": "Who is responsible for making sure your expertise continues reaching and interacting with the right buyers?",
        "choices": [
          {
            "label": "A",
            "text": "No one clearly owns it",
            "score": 0
          },
          {
            "label": "B",
            "text": "The founder handles most of it",
            "score": 1
          },
          {
            "label": "C",
            "text": "Ownership is shared or unclear",
            "score": 2
          },
          {
            "label": "D",
            "text": "There is a dedicated owner",
            "score": 3
          },
          {
            "label": "E",
            "text": "There is a dedicated owner with a clear, repeatable process",
            "score": 4
          }
        ]
      }
    ]
  },
  {
    "name": "What Buyers Find",
    "lead": "When buyers research you, can they find proof that you understand their problem?",
    "description": "",
    "cta": "Start Section 4",
    "questions": [
      {
        "prompt": "When buyers search for the problems you solve, how likely are they to find useful evidence of your expertise?",
        "choices": [
          {
            "label": "A",
            "text": "Very unlikely",
            "score": 0
          },
          {
            "label": "B",
            "text": "They may find our basic website",
            "score": 1
          },
          {
            "label": "C",
            "text": "They can find some useful material",
            "score": 2
          },
          {
            "label": "D",
            "text": "They regularly find relevant expertise from us",
            "score": 3
          },
          {
            "label": "E",
            "text": "We actively manage and improve what buyers find",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How much attention are you giving to what buyers may find about your company through AI search and answer tools?",
        "choices": [
          {
            "label": "A",
            "text": "None",
            "score": 0
          },
          {
            "label": "B",
            "text": "We are aware of it but are not doing anything yet",
            "score": 1
          },
          {
            "label": "C",
            "text": "We have started testing a few things",
            "score": 2
          },
          {
            "label": "D",
            "text": "We actively work to improve how our expertise appears",
            "score": 3
          },
          {
            "label": "E",
            "text": "We actively monitor, improve, and refine our presence",
            "score": 4
          }
        ]
      },
      {
        "prompt": "When buyers find your podcasts, videos, articles, or other expertise, how easy is it for them to understand what the content is about and why it matters?",
        "choices": [
          {
            "label": "A",
            "text": "Often unclear",
            "score": 0
          },
          {
            "label": "B",
            "text": "Inconsistent",
            "score": 1
          },
          {
            "label": "C",
            "text": "Basic information is usually there",
            "score": 2
          },
          {
            "label": "D",
            "text": "Clear and consistently presented",
            "score": 3
          },
          {
            "label": "E",
            "text": "Clear, consistently presented, and improved based on buyer behavior and search data",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How often do you check what buyers actually see when they research your company, leadership, category, or the problems you solve?",
        "choices": [
          {
            "label": "A",
            "text": "Never",
            "score": 0
          },
          {
            "label": "B",
            "text": "Rarely",
            "score": 1
          },
          {
            "label": "C",
            "text": "Occasionally",
            "score": 2
          },
          {
            "label": "D",
            "text": "Regularly",
            "score": 3
          },
          {
            "label": "E",
            "text": "Regularly, with clear actions taken based on what we find",
            "score": 4
          }
        ]
      }
    ]
  },
  {
    "name": "From Interest to Conversation",
    "lead": "Once a buyer trusts what they see, is it easy to take the next step with your team?",
    "description": "",
    "cta": "Start Section 5",
    "questions": [
      {
        "prompt": "Once a buyer trusts what they are seeing, how clear is the next step they can take with your company?",
        "choices": [
          {
            "label": "A",
            "text": "There is no clear next step",
            "score": 0
          },
          {
            "label": "B",
            "text": "The next step is rarely obvious",
            "score": 1
          },
          {
            "label": "C",
            "text": "Some content has a clear next step",
            "score": 2
          },
          {
            "label": "D",
            "text": "Most buyer-facing content makes the next step clear",
            "score": 3
          },
          {
            "label": "E",
            "text": "We consistently guide buyers toward the right next step based on their level of interest",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How easy is it for an interested buyer to contact you without having to search for how to contact you?",
        "choices": [
          {
            "label": "A",
            "text": "There is no clear way",
            "score": 0
          },
          {
            "label": "B",
            "text": "We mainly rely on a general contact form",
            "score": 1
          },
          {
            "label": "C",
            "text": "We have a few specific ways buyers can respond",
            "score": 2
          },
          {
            "label": "D",
            "text": "We have several clear entry points",
            "score": 3
          },
          {
            "label": "E",
            "text": "Buyers have clear next steps tied to what they are interested in",
            "score": 4
          }
        ]
      },
      {
        "prompt": "What happens after a buyer shows interest but is not ready to speak with sales yet?",
        "choices": [
          {
            "label": "A",
            "text": "Nothing consistent",
            "score": 0
          },
          {
            "label": "B",
            "text": "Someone follows up manually when possible",
            "score": 1
          },
          {
            "label": "C",
            "text": "We have basic automated follow-up",
            "score": 2
          },
          {
            "label": "D",
            "text": "We have defined follow-up sequences",
            "score": 3
          },
          {
            "label": "E",
            "text": "Follow-up changes based on what the buyer has shown interest in or done",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How clearly can you see whether the expertise buyers encounter is contributing to sales conversations or pipeline activity?",
        "choices": [
          {
            "label": "A",
            "text": "We cannot see it",
            "score": 0
          },
          {
            "label": "B",
            "text": "We rely mostly on anecdotes",
            "score": 1
          },
          {
            "label": "C",
            "text": "We track some of it manually",
            "score": 2
          },
          {
            "label": "D",
            "text": "We review it regularly",
            "score": 3
          },
          {
            "label": "E",
            "text": "We have reliable reporting that connects buyer activity to sales outcomes",
            "score": 4
          }
        ]
      }
    ]
  },
  {
    "name": "Keeping It Working",
    "lead": "Does your expertise keep reaching buyers, or does it still depend on you personally closing the deal?",
    "description": "",
    "cta": "Start Final Section",
    "questions": [
      {
        "prompt": "Who is responsible for making sure your expertise keeps working in the market day to day?",
        "choices": [
          {
            "label": "A",
            "text": "There is no clear owner",
            "score": 0
          },
          {
            "label": "B",
            "text": "The founder owns most of it",
            "score": 1
          },
          {
            "label": "C",
            "text": "Responsibility is shared across the team",
            "score": 2
          },
          {
            "label": "D",
            "text": "There is a dedicated internal or external owner",
            "score": 3
          },
          {
            "label": "E",
            "text": "There is an accountable team with clearly defined roles",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How far ahead does your team plan the ideas and expertise that buyers need?",
        "choices": [
          {
            "label": "A",
            "text": "We do not plan ahead",
            "score": 0
          },
          {
            "label": "B",
            "text": "It is mostly ad hoc",
            "score": 1
          },
          {
            "label": "C",
            "text": "We plan a short time ahead",
            "score": 2
          },
          {
            "label": "D",
            "text": "We consistently plan about 30 days ahead",
            "score": 3
          },
          {
            "label": "E",
            "text": "We consistently plan 60 to 90 days ahead based on business priorities",
            "score": 4
          }
        ]
      },
      {
        "prompt": "What happens when the founder or key executive is unavailable?",
        "choices": [
          {
            "label": "A",
            "text": "Most activity stops",
            "score": 0
          },
          {
            "label": "B",
            "text": "Progress often stalls",
            "score": 1
          },
          {
            "label": "C",
            "text": "Some things continue, but others wait",
            "score": 2
          },
          {
            "label": "D",
            "text": "Most activity continues",
            "score": 3
          },
          {
            "label": "E",
            "text": "The system continues reliably without the founder driving every step",
            "score": 4
          }
        ]
      },
      {
        "prompt": "How often do you review what is helping buyers understand and trust your business, then adjust based on what you learn?",
        "choices": [
          {
            "label": "A",
            "text": "We do not review it",
            "score": 0
          },
          {
            "label": "B",
            "text": "We only look when something is not working",
            "score": 1
          },
          {
            "label": "C",
            "text": "We review it occasionally",
            "score": 2
          },
          {
            "label": "D",
            "text": "We review it monthly",
            "score": 3
          },
          {
            "label": "E",
            "text": "We review it monthly and make documented changes based on the findings",
            "score": 4
          }
        ]
      }
    ]
  }
];

export const flatQuestions = sections.flatMap((section, sectionIndex) =>
  section.questions.map((question, questionIndex) => ({ ...question, sectionIndex, questionIndex })),
);

export const maturityBand = (score: number) => assessmentCopy.bands[score < 40 ? 0 : score < 60 ? 1 : score < 80 ? 2 : 3].name;
