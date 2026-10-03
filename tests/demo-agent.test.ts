import { describe, expect, it } from "vitest";
import { demoEmployeeTurn, demoEmployerTurn } from "../server/demo-agent.js";
import { createProfile } from "../server/profile.js";
import { seedProfiles } from "../server/seed.js";

describe("demo agent", () => {
  it("builds profile facets across a guided conversation", () => {
    let profile = createProfile("Mina Shah");
    profile = demoEmployeeTurn(profile, 0, "Product manager for complex healthcare platforms").profile;
    profile = demoEmployeeTurn(profile, 1, "I reduced patient onboarding time by 40%.").profile;
    profile = demoEmployeeTurn(profile, 2, "Senior PM at HealthCo, 2022 to now; I led the workflow redesign.").profile;
    profile = demoEmployeeTurn(profile, 3, "Discovery, analytics, stakeholder facilitation, Figma").profile;
    profile = demoEmployeeTurn(profile, 4, "Lead Product Manager, hybrid").profile;

    expect(profile.headline).toContain("Product manager");
    expect(profile.achievements).toHaveLength(1);
    expect(profile.experiences).toHaveLength(1);
    expect(profile.skills.length).toBeGreaterThanOrEqual(3);
    expect(profile.preferences.workStyle).toBe("Hybrid");
    expect(profile.completion).toBeGreaterThanOrEqual(50);
  });

  it("grounds employer answers in profile evidence", () => {
    const reply = demoEmployerTurn(seedProfiles[1], "What are the strongest skills?");
    expect(reply).toContain("Python");
    expect(reply).toContain("evidence");
  });
});

