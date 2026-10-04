import type { Message, Profile } from "../shared/types.js";
import { assessInputQuality, assessInterview, irrelevantInputReply, planNextQuestion } from "./interview-intelligence.js";
import { refreshProfile, uid } from "./profile.js";

type DemoResult = { reply: string; profile: Profile };

const splitList = (value: string) =>
  value
    .split(/,|;|\band\b/i)
    .map((item) => item.trim().replace(/[.!]$/, ""))
    .filter((item) => item.length > 1)
    .slice(0, 8);

const impactPattern = /\b(?:improved|increased|reduced|decreased|saved|grew|launched|delivered|achieved|cut|raised|resulted)\b|\b\d+\s*(?:%|percent|x|hours?|days?|users?|people)(?=\s|[.,;!?]|$)/i;
const experiencePattern = /\b(?:at|for)\s+([A-Z][A-Za-z0-9& .-]{2,50})/;

export const demoEmployeeTurn = (profile: Profile, history: Message[], input: string): DemoResult => {
  const clean = input.trim();
  const inputQuality = assessInputQuality(clean, history);
  if (!inputQuality.isRelevant) {
    return { reply: irrelevantInputReply(inputQuality), profile };
  }
  const next = structuredClone(profile);

  if (!next.headline) {
    next.headline = clean;
  }

  if (impactPattern.test(clean) && !next.achievements.includes(clean)) {
    next.achievements = [...next.achievements, clean].slice(-4);
  }

  const organization = clean.match(experiencePattern)?.[1]?.replace(/[,.].*$/, "").trim();
  const hasRoleContext = /\b(?:engineer|designer|manager|director|lead|specialist|consultant|analyst|researcher|founder|officer|developer)\b/i.test(clean);
  if (organization && hasRoleContext && !next.experiences.some((item) => item.impact.includes(clean))) {
    next.experiences = [
      ...next.experiences,
      {
        id: uid("exp"),
        role: next.headline || "Professional role",
        organization,
        period: "Period shared in conversation",
        impact: [clean],
      },
    ].slice(-4);
  }

  const list = splitList(clean);
  const looksLikeSkills = list.length >= 3 && list.every((item) => item.split(/\s+/).length <= 5);
  if (looksLikeSkills) {
    const evidence = next.achievements[0] ?? clean;
    for (const name of list) {
      const normalized = name.replace(/^(tools?|skills?):\s*/i, "");
      if (!next.skills.some((skill) => skill.name.toLowerCase() === normalized.toLowerCase())) {
        next.skills.push({ name: normalized, evidence });
      }
    }
  }

  const lower = clean.toLowerCase();
  if (/\b(?:remote|hybrid|on-site|onsite|flexible)\b/.test(lower)) {
    next.preferences.workStyle = lower.includes("remote")
      ? "Remote"
      : lower.includes("hybrid")
        ? "Hybrid"
        : lower.includes("on-site") || lower.includes("onsite")
          ? "On-site"
          : "Flexible";
    if (!next.preferences.targetRoles.length && hasRoleContext) {
      next.preferences.targetRoles = splitList(clean.replace(/remote|hybrid|on-site|onsite|flexible/gi, ""));
    }
  }

  if (/\b(?:target|looking for|next role|open to|want to become)\b/i.test(clean)) {
    const targets = splitList(clean.replace(/.*?(?:target|looking for|next role|open to|want to become)\s*:*/i, ""));
    next.preferences.targetRoles = [...new Set([...next.preferences.targetRoles, ...targets])].slice(0, 6);
  }

  if (next.headline && next.achievements.length) {
    next.summary = `${next.name} is a ${next.headline.toLowerCase()}. Evidence shared in the interview includes: ${next.achievements[0]}`.slice(0, 700);
  }

  const updated = refreshProfile(next);
  const assessment = assessInterview(updated, clean);
  const reply = planNextQuestion(assessment, updated, history, clean);

  return { reply, profile: updated };
};

export const demoEmployerTurn = (profile: Profile, question: string) => {
  const lower = question.toLowerCase();
  if (lower.includes("skill") || lower.includes("strength")) {
    const evidence = profile.skills.slice(0, 3).map((item) => `${item.name}: ${item.evidence}`).join(" ");
    return `The strongest evidenced capabilities are ${evidence} I would validate depth by asking which constraints made the highlighted outcome difficult.`;
  }
  if (lower.includes("impact") || lower.includes("achievement") || lower.includes("result")) {
    return `${profile.achievements[0] ?? "The profile does not include a quantified achievement yet."} Supporting context appears in ${profile.experiences[0]?.role ?? "their experience"} at ${profile.experiences[0]?.organization ?? "the listed organization"}. Ask what baseline and measurement method were used.`;
  }
  if (lower.includes("role") || lower.includes("fit") || lower.includes("position")) {
    return `${profile.name} is targeting ${profile.preferences.targetRoles.join(" and ") || "roles not yet specified"}. Evidence supports alignment through ${profile.skills.slice(0, 3).map((item) => item.name).join(", ")}. Role fit still depends on scope, domain, and success criteria that are not present in this profile.`;
  }
  return `${profile.summary} The profile provides direct evidence through: ${profile.experiences[0]?.impact[0] ?? "no detailed impact statement yet"} A useful next question is: “What trade-off did you personally own in that work?”`;
};
