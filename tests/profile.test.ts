import { describe, expect, it } from "vitest";
import { applyProfilePatch } from "../server/huggingface.js";
import { completionFor, createProfile } from "../server/profile.js";

describe("profile construction", () => {
  it("starts private and empty", () => {
    const profile = createProfile("Ada Lovelace");
    expect(profile.status).toBe("draft");
    expect(profile.initials).toBe("AL");
    expect(profile.completion).toBe(0);
  });

  it("applies a validated agent patch without dropping prior facts", () => {
    const profile = createProfile("Ada Lovelace");
    profile.skills.push({ name: "Mathematics", evidence: "Existing evidence" });

    const updated = applyProfilePatch(
      profile,
      JSON.stringify({
        headline: "Computing pioneer",
        skills_to_upsert: [{ name: "Writing", evidence: "Explained the Analytical Engine" }],
        achievements_to_add: ["Published the first algorithm intended for a machine"],
      }),
    );

    expect(updated.skills).toHaveLength(2);
    expect(updated.headline).toBe("Computing pioneer");
    expect(updated.achievements[0]).toContain("first algorithm");
    expect(updated.completion).toBeGreaterThan(0);
  });

  it("rewards evidence coverage rather than message volume", () => {
    const profile = createProfile("Grace Hopper");
    profile.headline = "Computer scientist";
    profile.summary = "A computer scientist who built practical systems and made technical ideas accessible to broad audiences.";
    profile.skills = [
      { name: "Compilers", evidence: "Built compiler systems" },
      { name: "Leadership", evidence: "Led technical teams" },
      { name: "Teaching", evidence: "Explained nanoseconds with wire" },
    ];
    expect(completionFor(profile)).toBe(38);
  });
});

