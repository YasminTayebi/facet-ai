import type { Profile } from "../shared/types.js";

const now = "2026-09-24T10:00:00.000Z";

export const seedProfiles: Profile[] = [
  {
    id: "profile_amara",
    name: "Amara Okafor",
    initials: "AO",
    headline: "Product designer turning complex systems into calm, inclusive experiences",
    summary:
      "Product designer with seven years across fintech and public services. Amara pairs rigorous discovery with pragmatic delivery and is strongest when a complex workflow needs to become clear, accessible, and measurable.",
    location: "Berlin, Germany",
    availability: "Available in 4 weeks",
    experiences: [
      {
        id: "exp_amara_1",
        role: "Senior Product Designer",
        organization: "Northstar Finance",
        period: "2022–Present",
        impact: [
          "Led a cross-functional redesign of account recovery, reducing support contacts by 31%.",
          "Built an accessibility review practice adopted by four product squads.",
        ],
      },
      {
        id: "exp_amara_2",
        role: "Product Designer",
        organization: "Civic Thread",
        period: "2019–2022",
        impact: ["Improved application completion by 22% through research-led service redesign."],
      },
    ],
    skills: [
      { name: "Product strategy", evidence: "Owned discovery-to-delivery direction across four squads." },
      { name: "User research", evidence: "Planned and synthesized more than 80 moderated sessions." },
      { name: "Accessibility", evidence: "Established WCAG-focused design reviews and team rituals." },
      { name: "Figma", evidence: "Built and governed a multi-brand component library." },
    ],
    achievements: ["Reduced support contacts by 31% while increasing successful self-service recovery."],
    preferences: { targetRoles: ["Staff Product Designer", "Design Lead"], workStyle: "Hybrid", location: "Berlin" },
    status: "published",
    completion: 100,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "profile_leon",
    name: "Leon Weber",
    initials: "LW",
    headline: "ML engineer shipping reliable language systems from prototype to production",
    summary:
      "Machine learning engineer focused on evaluation, retrieval, and reliable production systems. Leon translates experimental work into observable services and enjoys partnering closely with product and domain experts.",
    location: "Munich, Germany",
    availability: "Open to conversations",
    experiences: [
      {
        id: "exp_leon_1",
        role: "Machine Learning Engineer",
        organization: "Relay AI",
        period: "2021–Present",
        impact: [
          "Designed an evaluation harness that caught 68% more regressions before release.",
          "Cut retrieval latency from 640 ms to 180 ms at p95.",
        ],
      },
    ],
    skills: [
      { name: "Python", evidence: "Primary language for six years across ML and platform services." },
      { name: "LLM evaluation", evidence: "Built offline and online quality gates for a multilingual assistant." },
      { name: "RAG", evidence: "Optimized retrieval quality and p95 latency for production search." },
      { name: "MLOps", evidence: "Operated model services with tracing, drift checks, and staged releases." },
    ],
    achievements: ["Introduced release quality gates that reduced customer-reported answer regressions by 43%."],
    preferences: { targetRoles: ["Senior ML Engineer", "Applied AI Engineer"], workStyle: "Remote", location: "Europe" },
    status: "published",
    completion: 100,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "profile_sofia",
    name: "Sofia Marin",
    initials: "SM",
    headline: "Operations leader scaling climate-tech teams without losing the human signal",
    summary:
      "Operations leader with a decade of experience building systems for fast-growing, mission-led companies. Sofia combines financial discipline, thoughtful team design, and a bias toward simple operating rhythms.",
    location: "Madrid, Spain",
    availability: "Available now",
    experiences: [
      {
        id: "exp_sofia_1",
        role: "Head of Operations",
        organization: "Canopy Grid",
        period: "2020–2026",
        impact: [
          "Scaled operations from 28 to 140 people across five countries.",
          "Shortened quarterly planning from three weeks to six working days.",
        ],
      },
    ],
    skills: [
      { name: "Operating models", evidence: "Designed decision rights and planning cadences across five countries." },
      { name: "Team scaling", evidence: "Supported headcount growth from 28 to 140." },
      { name: "Financial planning", evidence: "Owned annual planning and scenario modeling with the finance lead." },
    ],
    achievements: ["Built the operating system that supported a five-country expansion without adding management layers."],
    preferences: { targetRoles: ["VP Operations", "Chief of Staff"], workStyle: "Flexible", location: "Europe" },
    status: "published",
    completion: 100,
    createdAt: now,
    updatedAt: now,
  },
];

