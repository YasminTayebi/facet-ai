import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import { ProfileStore } from "../server/store.js";

const setup = () => createApp(new ProfileStore()).app;

describe("Facet API", () => {
  it("creates a private employee session in demo mode without a token", async () => {
    const response = await request(setup()).post("/api/sessions").send({
      name: "Mina Shah",
      consentToHostedAI: false,
    });
    expect(response.status).toBe(201);
    expect(response.body.session.mode).toBe("demo");
    expect(response.body.profile.status).toBe("draft");
    expect(response.body.session.messages[0].content).toContain("evidence");
  });

  it("advances a conversation and updates the profile", async () => {
    const app = setup();
    const created = await request(app).post("/api/sessions").send({ name: "Mina Shah" });
    const sessionId = created.body.session.id as string;
    const response = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .send({ message: "Product manager for complex healthcare platforms" });
    expect(response.status).toBe(200);
    expect(response.body.profile.headline).toContain("Product manager");
    expect(response.body.assessment.nextFocus).toBe("impact");
    expect(response.body.reply).toMatch(/achievement|result|outcome/i);
  });

  it("does not advance or update the profile for irrelevant input", async () => {
    const app = setup();
    const created = await request(app).post("/api/sessions").send({ name: "Mina Shah" });
    const sessionId = created.body.session.id as string;
    const response = await request(app)
      .post(`/api/sessions/${sessionId}/messages`)
      .send({ message: "asdf qwerty banana" });

    expect(response.status).toBe(200);
    expect(response.body.session.stage).toBe(0);
    expect(response.body.profile.headline).toBe("");
    expect(response.body.assessment.inputQuality).toEqual({ isRelevant: false, reason: "off_topic" });
    expect(response.body.reply).toContain("could not connect");
    expect(response.body.reply).not.toMatch(/wow|awesome|amazing|great|impressive/i);
  });

  it.each(["idk", "no"])("does not treat %s as a professional headline", async (message) => {
    const app = setup();
    const created = await request(app).post("/api/sessions").send({ name: "Mina Shah" });
    const response = await request(app)
      .post(`/api/sessions/${created.body.session.id}/messages`)
      .send({ message });

    expect(response.status).toBe(200);
    expect(response.body.session.stage).toBe(0);
    expect(response.body.profile.headline).toBe("");
    expect(response.body.assessment.inputQuality.isRelevant).toBe(false);
    expect(response.body.reply).toContain("do not have enough professional information");
  });

  it("exposes only published profiles in employer search", async () => {
    const response = await request(setup()).get("/api/profiles?q=evaluation");
    expect(response.status).toBe(200);
    expect(response.body.profiles).toHaveLength(1);
    expect(response.body.profiles[0].name).toBe("Leon Weber");
    expect(response.body.profiles.every((profile: { status: string }) => profile.status === "published")).toBe(true);
  });

  it("rejects publishing an incomplete profile", async () => {
    const app = setup();
    const created = await request(app).post("/api/sessions").send({ name: "Mina Shah" });
    const response = await request(app).post(`/api/sessions/${created.body.session.id}/publish`);
    expect(response.status).toBe(409);
  });

  it("answers employer questions without exposing drafts", async () => {
    const app = setup();
    const profiles = await request(app).get("/api/profiles");
    const response = await request(app).post("/api/employer/chat").send({
      profileId: profiles.body.profiles[0].id,
      question: "What is the strongest evidence of impact?",
      consentToHostedAI: false,
    });
    expect(response.status).toBe(200);
    expect(response.body.mode).toBe("demo");
    expect(response.body.reply.length).toBeGreaterThan(40);
  });
});
