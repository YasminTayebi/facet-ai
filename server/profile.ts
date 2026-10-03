import type { Profile } from "../shared/types.js";

export const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const completionFor = (profile: Profile) => {
  const signals = [
    Boolean(profile.headline),
    profile.summary.length >= 60,
    profile.experiences.length > 0,
    profile.experiences.some((item) => item.impact.length > 0),
    profile.skills.length >= 3,
    profile.achievements.length > 0,
    profile.preferences.targetRoles.length > 0,
    Boolean(profile.preferences.workStyle || profile.preferences.location),
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
};

export const createProfile = (name: string): Profile => {
  const now = new Date().toISOString();
  const profile: Profile = {
    id: uid("profile"),
    name: name.trim(),
    initials: initialsFor(name),
    headline: "",
    summary: "",
    location: "",
    availability: "Open to the right opportunity",
    experiences: [],
    skills: [],
    achievements: [],
    preferences: { targetRoles: [], workStyle: "", location: "" },
    status: "draft",
    completion: 0,
    createdAt: now,
    updatedAt: now,
  };
  return profile;
};

export const refreshProfile = (profile: Profile): Profile => ({
  ...profile,
  initials: initialsFor(profile.name),
  completion: completionFor(profile),
  updatedAt: new Date().toISOString(),
});

