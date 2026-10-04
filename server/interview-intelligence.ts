import type { Message, Profile } from "../shared/types.js";

export type EvidenceDimension =
  | "identity"
  | "impact"
  | "ownership"
  | "experience"
  | "skills"
  | "goals"
  | "preferences";

export interface EvidenceGap {
  dimension: EvidenceDimension;
  label: string;
  score: number;
  target: number;
  reason: string;
}

export interface InterviewAssessment {
  gaps: EvidenceGap[];
  strongestDimension: EvidenceDimension;
  nextFocus: EvidenceDimension;
  completeness: number;
  signals: {
    hasMetric: boolean;
    mentionsLeadership: boolean;
    containsVagueClaim: boolean;
    containsSkillList: boolean;
  };
  inputQuality: InputQuality;
}

export interface InputQuality {
  isRelevant: boolean;
  reason: "professional_evidence" | "contextual_answer" | "too_short" | "non_answer" | "off_topic";
}

const metricPattern = /\b\d+(?:\.\d+)?\s*(?:%|percent|x|hours?|days?|weeks?|months?|users?|people|customers?|euros?|dollars?|€|\$)(?=\s|[.,;!?]|$)/i;
const leadershipPattern = /\b(?:led|lead|leadership|managed|mentored|coached|directed|stakeholders?|cross-functional|team)\b/i;
const vaguePattern = /\b(?:strategic|innovative|hardworking|results-driven|excellent|strong communicator|team player|leadership skills)\b/i;
const professionalPattern = /\b(?:work|job|career|role|company|organization|team|project|product|customer|client|user|business|manager|management|engineer|engineering|developer|designer|design|analyst|analysis|research|researcher|consultant|director|lead|leadership|specialist|founder|officer|marketing|sales|finance|operations|education|healthcare|platform|system|software|data|process|strategy|stakeholder|colleague|skill|responsib|experience|achievement|impact|result|goal|remote|hybrid|on-site|onsite|built|created|designed|developed|implemented|launched|delivered|improved|increased|reduced|saved|grew|managed|mentored|coached|owned|decided|solved|coordinated|facilitated|negotiated)\w*\b/i;
const contextualAnswerPattern = /\b(?:yes|no|partly|approximately|about|around|because|through|using|with|without|during|before|after)\b/i;
const nonAnswerPattern = /^(?:i\s+(?:do not|don't)\s+know|not sure|nothing|none|no idea|n\/a|na|test|testing|hello|hi|hey|blah+|whatever|skip|pass|idk|asdf\w*|qwerty\w*)[.!?]*$/i;
const timeOrMetricPattern = /(?:\b\d+(?:\.\d+)?\s*(?:%|percent|x|hours?|days?|weeks?|months?|years?|users?|people|customers?|euros?|dollars?|€|\$)\b|\b(?:days?|weeks?|months?|years?)\b)/i;

const dimensionOrder: EvidenceDimension[] = ["identity", "impact", "ownership", "experience", "skills", "goals", "preferences"];

const lexicalWords = (value: string) => value.match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? [];

export const assessInputQuality = (input: string, history: Message[] = []): InputQuality => {
  const clean = input.trim();
  const words = lexicalWords(clean);

  if (!clean || words.length === 0 || nonAnswerPattern.test(clean)) {
    return { isRelevant: false, reason: "non_answer" };
  }

  const hasProfessionalSignal = professionalPattern.test(clean);
  const hasMetricOrTime = metricPattern.test(clean) || timeOrMetricPattern.test(clean);
  if (hasProfessionalSignal) return { isRelevant: true, reason: "professional_evidence" };

  const previousQuestion = [...history].reverse().find((message) => message.role === "assistant")?.content ?? "";
  const isShortContextualAnswer =
    words.length <= 8 &&
    (hasMetricOrTime || contextualAnswerPattern.test(clean)) &&
    /\b(?:how|what|when|where|which|who|outcome|result|measure|period|location|arrangement)\b/i.test(previousQuestion);
  if (isShortContextualAnswer) return { isRelevant: true, reason: "contextual_answer" };

  if (words.length < 3) return { isRelevant: false, reason: "too_short" };
  return { isRelevant: false, reason: "off_topic" };
};

export const irrelevantInputReply = (quality: InputQuality) => {
  if (quality.reason === "non_answer" || quality.reason === "too_short") {
    return "I do not have enough professional information in that response yet. Could you rephrase it with a role, action, skill, or result from your work?";
  }
  return "I could not connect that response to your professional profile. Could you answer with a real work example, such as what you did, why it mattered, or what changed?";
};

const scoreExperience = (profile: Profile) => {
  if (!profile.experiences.length) return 0;
  const detailed = profile.experiences.some(
    (item) => item.role && item.organization && item.period && item.impact.some((impact) => impact.length >= 25),
  );
  return detailed ? 2 : 1;
};

const scoreOwnership = (profile: Profile) => {
  const text = profile.experiences.flatMap((item) => item.impact).join(" ");
  if (!text) return 0;
  if (/\b(?:I |owned|decided|designed|built|created|led|implemented|negotiated|launched)\b/i.test(text)) return 2;
  return 1;
};

export const assessInterview = (profile: Profile, latestInput = "", history: Message[] = []): InterviewAssessment => {
  const impactText = profile.achievements.join(" ");
  const evidencedSkills = profile.skills.filter((skill) => skill.evidence.trim().length >= 20).length;
  const scores: Record<EvidenceDimension, number> = {
    identity: profile.headline.trim().length >= 25 ? 2 : profile.headline ? 1 : 0,
    impact: profile.achievements.length > 0 ? (metricPattern.test(impactText) ? 2 : 1) : 0,
    ownership: scoreOwnership(profile),
    experience: scoreExperience(profile),
    skills: evidencedSkills >= 3 ? 2 : profile.skills.length > 0 ? 1 : 0,
    goals: profile.preferences.targetRoles.length > 0 ? 2 : 0,
    preferences: profile.preferences.workStyle || profile.preferences.location ? 2 : 0,
  };

  const reasons: Record<EvidenceDimension, string> = {
    identity: scores.identity === 2 ? "Professional identity is clear." : "The profile needs a clearer professional identity and value proposition.",
    impact: scores.impact === 2 ? "At least one outcome is measurable." : "The profile needs an observable or measurable outcome.",
    ownership: scores.ownership === 2 ? "Personal ownership is explicit." : "The person's own decisions and actions are not yet distinct from the team's work.",
    experience: scores.experience === 2 ? "A role includes context and impact." : "Role, organization, period, or impact context is incomplete.",
    skills: scores.skills === 2 ? "Several skills include evidence." : "Skills need examples showing how they were applied.",
    goals: scores.goals === 2 ? "Target roles are clear." : "The desired next step is not yet clear.",
    preferences: scores.preferences === 2 ? "Working preferences are present." : "Location or working-style preferences are missing.",
  };

  const gaps = dimensionOrder
    .map((dimension) => ({
      dimension,
      label: dimension[0].toUpperCase() + dimension.slice(1),
      score: scores[dimension],
      target: 2,
      reason: reasons[dimension],
    }))
    .sort((a, b) => a.score - b.score || dimensionOrder.indexOf(a.dimension) - dimensionOrder.indexOf(b.dimension));

  const strongestDimension = [...dimensionOrder].sort(
    (a, b) => scores[b] - scores[a] || dimensionOrder.indexOf(a) - dimensionOrder.indexOf(b),
  )[0];
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);

  return {
    gaps,
    strongestDimension,
    nextFocus: gaps[0].dimension,
    completeness: Math.round((total / (dimensionOrder.length * 2)) * 100),
    signals: {
      hasMetric: metricPattern.test(latestInput),
      mentionsLeadership: leadershipPattern.test(latestInput),
      containsVagueClaim: vaguePattern.test(latestInput),
      containsSkillList: latestInput.split(/,|;/).filter((part) => part.trim()).length >= 3,
    },
    inputQuality: assessInputQuality(latestInput, history),
  };
};

const questions: Record<EvidenceDimension, string[]> = {
  identity: [
    "What kind of problems do people rely on you to solve, and who benefits from that work?",
    "If a colleague introduced your work in one sentence, what would you want them to say you make possible?",
    "Which part of your work creates the most value, beyond the tasks in your job description?",
  ],
  impact: [
    "Tell me about a professional achievement you are proud of. What was different after your work?",
    "Which result best demonstrates the value of your work, and how did you know it succeeded?",
    "Can you share an outcome where your contribution changed a customer, team, or business result?",
  ],
  ownership: [
    "What decision or action was specifically yours, and what would probably not have happened without it?",
    "Where did you personally change the direction of the work, rather than simply execute the plan?",
    "What trade-off did you own, and how did you decide between the alternatives?",
  ],
  experience: [
    "Which role best demonstrates this strength? Please include your title, organization, period, and scope.",
    "Give me the context for this work: your role, the organization, the timeframe, and the problem you inherited.",
    "Which experience should an employer examine to understand this capability in practice?",
  ],
  skills: [
    "Which three skills were decisive in that result, and what did you do that demonstrates each one?",
    "Choose the skill you want to be known for. What example proves your level of ability?",
    "Which technical and human skills did the situation require, and where did each affect the outcome?",
  ],
  goals: [
    "What kind of role are you looking for next, and which responsibilities do you want more of?",
    "What would make your next opportunity feel like meaningful progress rather than only a new title?",
    "Which problems, teams, or industries do you want your next role to place you closer to?",
  ],
  preferences: [
    "What working arrangement helps you do your best work: remote, hybrid, on-site, or flexible? Is location important?",
    "Are there any location, schedule, or collaboration preferences an employer should know?",
    "What working environment brings out your best contribution, and what conditions matter most?",
  ],
};

const normalizedWords = (value: string) =>
  new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 4));

export const questionWasAsked = (candidate: string, history: Message[]) => {
  const candidateWords = normalizedWords(candidate);
  return history
    .filter((message) => message.role === "assistant")
    .some((message) => {
      const previousWords = normalizedWords(message.content);
      const overlap = [...candidateWords].filter((word) => previousWords.has(word)).length;
      return overlap >= Math.min(4, Math.ceil(candidateWords.size * 0.45));
    });
};

const chooseFresh = (dimension: EvidenceDimension, history: Message[], seed: string) => {
  const available = questions[dimension].filter((question) => !questionWasAsked(question, history));
  const pool = available.length ? available : questions[dimension];
  const hash = [...seed].reduce((total, character) => total + character.charCodeAt(0), 0);
  return pool[hash % pool.length];
};

export const planNextQuestion = (
  assessment: InterviewAssessment,
  profile: Profile,
  history: Message[],
  latestInput: string,
) => {
  if (assessment.signals.containsVagueClaim) {
    return "You used a strong description there. Can you give me one specific situation, what you personally did, and what changed as a result?";
  }
  if (assessment.signals.mentionsLeadership && !assessment.signals.hasMetric) {
    return "When you led that work, what difficult decision did you make, who did you need to align, and what was the outcome?";
  }
  if (assessment.signals.hasMetric && assessment.gaps.find((gap) => gap.dimension === "ownership")?.score !== 2) {
    return "That result is useful evidence. What part of achieving it was specifically your responsibility, and how was the result measured?";
  }
  if (assessment.signals.containsSkillList && profile.skills.length > 0) {
    return `Let’s test the evidence behind ${profile.skills[0].name}. Which situation best demonstrates how you applied it at a high level?`;
  }
  return chooseFresh(assessment.nextFocus, history, latestInput);
};
