import type { SafetySignal, SafetyZone } from './types';

// Stub safety classifier.
//
// The MVP product replaces this with a clinician-reviewed classifier behind
// the same one-call signature. PRD §Goal 3 targets:
//   - red-zone false-positive rate < 5%
//   - zero red-zone false negatives during soft launch
//   - 100% of red-zone events surface to parent in < 60s
//
// Zones:
//   green  — no concern detected
//   yellow — patterns to track over time; does NOT break privacy
//   red    — severe-danger threshold (suicidal ideation, abuse signals,
//            imminent harm); breaks the child's privacy by design and is
//            surfaced to the parent with disclaimer + conversation starters.

const RED_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\b(kill myself|end my life|don't want to be alive|want to die)\b/i, reason: 'suicidal ideation' },
  { re: /\b(hurt myself|cut myself|hurting myself)\b/i, reason: 'self-harm' },
  { re: /\b(touched me|hit me|hits me|hurts me)\b/i, reason: 'possible abuse disclosure' },
  { re: /\b(no one can know|don't tell anyone|secret)\b.*\b(grown ?up|adult|teacher|uncle|aunt|step|parent)\b/i, reason: 'secrecy with adult' },
  { re: /\b(scared to go home|scared of (mom|dad|stepdad|stepmom))\b/i, reason: 'fear of caregiver' },
];

const AMBER_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\b(everyone hates me|nobody likes me|i'?m alone)\b/i, reason: 'persistent loneliness' },
  { re: /\b(i hate myself|i'?m stupid|i'?m bad)\b/i, reason: 'negative self-talk' },
  { re: /\b(can'?t stop crying|cry every (day|night))\b/i, reason: 'persistent distress' },
];

export function classifyTextForSafety(text: string): SafetySignal {
  const matchedRed = RED_PATTERNS.filter((p) => p.re.test(text));
  if (matchedRed.length > 0) {
    return {
      zone: 'red',
      reason: matchedRed.map((m) => m.reason).join(', '),
      matchedTerms: matchedRed.map((m) => m.re.source),
    };
  }
  const matchedAmber = AMBER_PATTERNS.filter((p) => p.re.test(text));
  if (matchedAmber.length > 0) {
    return {
      zone: 'amber',
      reason: matchedAmber.map((m) => m.reason).join(', '),
      matchedTerms: matchedAmber.map((m) => m.re.source),
    };
  }
  return { zone: 'green' };
}

export function maxZone(a: SafetyZone, b: SafetyZone): SafetyZone {
  const order = { green: 0, amber: 1, red: 2 } as const;
  return order[a] >= order[b] ? a : b;
}

// Conversation-starter generator for parent notifications when a red-zone
// event fires. Real product: LLM-generated, child-pattern-aware. Stub: small
// templated set keyed by reason.
export function generateConversationStarters(reason: string, childName: string): string[] {
  const r = reason.toLowerCase();
  if (r.includes('suicidal') || r.includes('self-harm')) {
    return [
      `Sit beside ${childName} when it is quiet. Say: "I love you. I am not going anywhere. Can you tell me what has been heavy?"`,
      `Avoid leading with the words from the alert. Lead with presence. Then: "Sometimes feelings get really big. Have yours been really big lately?"`,
      `If ${childName} confirms, ask: "Are you safe right now? Can we make a plan together?" Then call your child's pediatrician or 988 for guidance.`,
    ];
  }
  if (r.includes('abuse') || r.includes('fear of caregiver') || r.includes('secrecy with adult')) {
    return [
      `Find a private, calm moment. Say: "You can tell me anything, even hard things. You will not be in trouble."`,
      `Listen without reacting visibly. Ask open questions: "Can you tell me more about that?" Avoid leading questions.`,
      `Do not promise to keep it a secret. Do tell ${childName} that you will help keep them safe. Contact your pediatrician or local child-welfare resource for next steps.`,
    ];
  }
  return [
    `Pick a low-pressure moment with ${childName}. Read tonight's storybook together if they have shared it. Notice what they linger on.`,
    `Try: "Was there anything today that was hard, even a little?" Make it easy to answer "yes" without elaborating.`,
    `If they say no, that's okay. The opening is what matters. Try again tomorrow.`,
  ];
}
