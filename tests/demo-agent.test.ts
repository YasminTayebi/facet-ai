import { describe, expect, it } from "vitest";
import type { Message } from "../shared/types.js";
import { demoEmployeeTurn, demoEmployerTurn } from "../server/demo-agent.js";
import { createProfile } from "../server/profile.js";
import { seedProfiles } from "../server/seed.js";

describe("demo agent", () => {
  it("builds profile facets across a guided conversation", () => {
    let profile = createProfile("Mina Shah");
    const history: Message[] = [];
    const runTurn = (input: string) => {
      history.push({ id: `user-${history.length}`, role: "user", content: input, createdAt: new Date().toISOString() });
      const result = demoEmployeeTurn(profile, history, input);
      profile = result.profile;
      history.push({ id: `assistant-${history.length}`, role: "assistant", content: result.reply, createdAt: new Date().toISOString() });
      return result.reply;
    };

    runTurn("Product manager for complex healthcare platforms");
    runTurn("I reduced patient onboarding time by 40%.");
    runTurn("Senior Product Manager at HealthCo, 2022 to now; I led the workflow redesign.");
    runTurn("Discovery, analytics, stakeholder facilitation, Figma");
    runTurn("Lead Product Manager, hybrid");

    expect(profile.headline).toContain("Product manager");
    expect(profile.achievements).toHaveLength(1);
    expect(profile.experiences).toHaveLength(1);
    expect(profile.skills.length).toBeGreaterThanOrEqual(3);
    expect(profile.preferences.workStyle).toBe("Hybrid");
    expect(profile.completion).toBeGreaterThanOrEqual(50);
  });

  it("follows up on vague claims with a request for concrete evidence", () => {
    const profile = createProfile("Mina Shah");
    const reply = demoEmployeeTurn(profile, [], "I am a strategic leader and strong communicator").reply;
    expect(reply).toContain("specific situation");
    expect(reply).toContain("personally did");
  });

  it("adapts a leadership follow-up to decisions and alignment", () => {
    const profile = createProfile("Mina Shah");
    profile.headline = "Engineering manager";
    const reply = demoEmployeeTurn(profile, [], "I led a cross-functional platform migration").reply;
    expect(reply).toContain("difficult decision");
    expect(reply).toContain("align");
  });

  it("uses metrics to investigate ownership and measurement", () => {
    const profile = createProfile("Mina Shah");
    profile.headline = "Product manager";
    const reply = demoEmployeeTurn(profile, [], "The new workflow reduced onboarding time by 40%").reply;
    expect(reply).toContain("specifically your responsibility");
    expect(reply).toContain("measured");
  });

  it("rejects meaningless input without changing the profile or praising it", () => {
    const profile = createProfile("Mina Shah");
    const result = demoEmployeeTurn(profile, [], "asdf qwerty banana");

    expect(result.profile).toEqual(profile);
    expect(result.reply).toContain("could not connect");
    expect(result.reply).toContain("real work example");
    expect(result.reply).not.toMatch(/wow|awesome|amazing|great|impressive/i);
  });

  it("does not advance after an off-topic conversational answer", () => {
    const profile = createProfile("Mina Shah");
    const result = demoEmployeeTurn(profile, [], "My cat likes sleeping in the sunny garden");

    expect(result.profile.headline).toBe("");
    expect(result.reply).toContain("could not connect");
  });

  it("accepts concise professional answers and contextual metrics", () => {
    const profile = createProfile("Mina Shah");
    const role = demoEmployeeTurn(profile, [], "Product manager");
    expect(role.profile.headline).toBe("Product manager");

    const history: Message[] = [
      {
        id: "assistant-1",
        role: "assistant",
        content: "How much time did the change save?",
        createdAt: new Date().toISOString(),
      },
    ];
    const metric = demoEmployeeTurn(role.profile, history, "About 6 months");
    expect(metric.reply).not.toContain("could not connect");
  });

  it("grounds employer answers in profile evidence", () => {
    const reply = demoEmployerTurn(seedProfiles[1], "What are the strongest skills?");
    expect(reply).toContain("Python");
    expect(reply).toContain("evidence");
  });
});
