import type { Profile } from "../shared/types.js";
import { refreshProfile, uid } from "./profile.js";

type DemoResult = { reply: string; profile: Profile; nextStage: number };

const splitList = (value: string) =>
  value
    .split(/,|;|\band\b/i)
    .map((item) => item.trim().replace(/[.!]$/, ""))
    .filter((item) => item.length > 1)
    .slice(0, 8);

export const demoEmployeeTurn = (profile: Profile, stage: number, input: string): DemoResult => {
  const clean = input.trim();
  const next = structuredClone(profile);
  let reply: string;

  if (stage === 0) {
    next.headline = clean;
    reply = `That gives us a useful direction. What is one piece of work you are especially proud of—and what changed because of your contribution?`;
  } else if (stage === 1) {
    next.achievements = [...next.achievements, clean].slice(-4);
    next.summary = `${next.name} is a ${next.headline.toLowerCase()} with a record of turning responsibility into visible outcomes. ${clean}`;
    reply = `There is a strong result in that story. Walk me through one relevant role: your title, the organization, the period, and the part only you owned.`;
  } else if (stage === 2) {
    next.experiences = [
      ...next.experiences,
      {
        id: uid("exp"),
        role: next.headline || "Professional role",
        organization: "Organization shared in conversation",
        period: "Period shared in conversation",
        impact: [clean],
      },
    ].slice(-4);
    reply = `Good—your ownership is becoming clearer. Which 3–5 skills were decisive in producing that outcome? Separate tools from the human or strategic skills you relied on.`;
  } else if (stage === 3) {
    next.skills = splitList(clean).map((name) => ({
      name: name.replace(/^(tools?|skills?):\s*/i, ""),
      evidence: next.achievements[0] ?? "Evidence captured during the interview.",
    }));
    reply = `Now let’s make the profile useful for the right opportunity. What roles are you targeting, and do you prefer remote, hybrid, on-site, or flexible work?`;
  } else if (stage === 4) {
    const lower = clean.toLowerCase();
    next.preferences.targetRoles = splitList(clean.replace(/remote|hybrid|on-site|onsite|flexible/gi, ""));
    next.preferences.workStyle = lower.includes("remote")
      ? "Remote"
      : lower.includes("hybrid")
        ? "Hybrid"
        : lower.includes("on-site") || lower.includes("onsite")
          ? "On-site"
          : "Flexible";
    reply = `Your profile has a clear through-line now. Review the evidence panel, correct anything that feels imprecise, then publish when it represents you well. What detail would you most like to sharpen?`;
  } else {
    next.summary = next.summary
      ? `${next.summary} ${clean}`.slice(0, 700)
      : clean;
    reply = `I’ve kept that nuance in your narrative. Is there a specific claim, skill, or experience you want to make more concrete before publishing?`;
  }

  return { reply, profile: refreshProfile(next), nextStage: stage + 1 };
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

