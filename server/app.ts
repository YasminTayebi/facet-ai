import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import type { Message, Session } from "../shared/types.js";
import { config } from "./config.js";
import { demoEmployeeTurn, demoEmployerTurn } from "./demo-agent.js";
import { hostedEmployeeTurn, hostedEmployerTurn } from "./huggingface.js";
import { createProfile, refreshProfile, uid } from "./profile.js";
import { ProfileStore } from "./store.js";

const createSessionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  consentToHostedAI: z.boolean().default(false),
});

const messageSchema = z.object({ message: z.string().trim().min(1).max(3000) });

const employerChatSchema = z.object({
  profileId: z.string().min(1),
  question: z.string().trim().min(2).max(1200),
  consentToHostedAI: z.boolean().default(false),
});

const newMessage = (role: Message["role"], content: string): Message => ({
  id: uid("message"),
  role,
  content,
  createdAt: new Date().toISOString(),
});

const asyncRoute =
  (handler: (request: Request, response: Response, next: NextFunction) => Promise<void>) =>
  (request: Request, response: Response, next: NextFunction) =>
    void handler(request, response, next).catch(next);

const rateLimit = () => {
  const hits = new Map<string, { count: number; resetsAt: number }>();
  return (request: Request, response: Response, next: NextFunction) => {
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const current = hits.get(key);
    if (!current || current.resetsAt < now) {
      hits.set(key, { count: 1, resetsAt: now + 60_000 });
      next();
      return;
    }
    current.count += 1;
    if (current.count > 80) {
      response.status(429).json({ error: "Too many requests. Please wait a moment." });
      return;
    }
    next();
  };
};

export const createApp = (store = new ProfileStore(config.dataFile)) => {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: true, credentials: false }));
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", rateLimit());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", hostedAI: Boolean(config.hfToken), model: config.hfModel });
  });

  app.get("/api/profiles", (request, response) => {
    const query = typeof request.query.q === "string" ? request.query.q : "";
    const workStyle = typeof request.query.workStyle === "string" ? request.query.workStyle : "";
    response.json({ profiles: store.listPublished(query, workStyle) });
  });

  app.get("/api/profiles/:id", (request, response) => {
    const profile = store.getProfile(request.params.id);
    if (!profile || profile.status !== "published") {
      response.status(404).json({ error: "Profile not found" });
      return;
    }
    response.json({ profile });
  });

  app.post(
    "/api/sessions",
    asyncRoute(async (request, response) => {
      const input = createSessionSchema.parse(request.body);
      const mode: Session["mode"] = config.hfToken && input.consentToHostedAI ? "hosted" : "demo";
      const profile = await store.saveProfile(createProfile(input.name));
      const greeting = `Hi ${profile.name.split(" ")[0]}. I’ll help you turn your experience into a profile with real evidence, not buzzwords. To start, how would you describe the work you do and the value you create?`;
      const session: Session = {
        id: uid("session"),
        profileId: profile.id,
        messages: [newMessage("assistant", greeting)],
        stage: 0,
        mode,
        createdAt: new Date().toISOString(),
      };
      store.saveSession(session);
      response.status(201).json({ session, profile });
    }),
  );

  app.get("/api/sessions/:id", (request, response) => {
    const session = store.getSession(String(request.params.id));
    const profile = session ? store.getProfile(session.profileId) : undefined;
    if (!session || !profile) {
      response.status(404).json({ error: "Session not found" });
      return;
    }
    response.json({ session, profile });
  });

  app.post(
    "/api/sessions/:id/messages",
    asyncRoute(async (request, response) => {
      const input = messageSchema.parse(request.body);
      const session = store.getSession(String(request.params.id));
      const profile = session ? store.getProfile(session.profileId) : undefined;
      if (!session || !profile) {
        response.status(404).json({ error: "Session not found" });
        return;
      }

      const userMessage = newMessage("user", input.message);
      session.messages.push(userMessage);
      let turn;
      if (session.mode === "hosted") {
        try {
          turn = await hostedEmployeeTurn(
            { token: config.hfToken, model: config.hfModel, baseUrl: config.hfBaseUrl },
            profile,
            session.messages,
          );
        } catch (error) {
          if (!config.allowDemoFallback) throw error;
          const demo = demoEmployeeTurn(profile, session.stage, input.message);
          turn = { reply: demo.reply, profile: demo.profile };
          session.mode = "demo";
        }
      } else {
        const demo = demoEmployeeTurn(profile, session.stage, input.message);
        turn = { reply: demo.reply, profile: demo.profile };
      }

      session.stage += 1;
      session.messages.push(newMessage("assistant", turn.reply));
      store.saveSession(session);
      const savedProfile = await store.saveProfile(turn.profile);
      response.json({ reply: turn.reply, profile: savedProfile, session, mode: session.mode });
    }),
  );

  app.post(
    "/api/sessions/:id/publish",
    asyncRoute(async (request, response) => {
      const session = store.getSession(String(request.params.id));
      const profile = session ? store.getProfile(session.profileId) : undefined;
      if (!session || !profile) {
        response.status(404).json({ error: "Session not found" });
        return;
      }
      if (profile.completion < 50) {
        response.status(409).json({ error: "Build at least half of the profile before publishing." });
        return;
      }
      const published = await store.saveProfile(refreshProfile({ ...profile, status: "published" }));
      response.json({ profile: published });
    }),
  );

  app.post(
    "/api/employer/chat",
    asyncRoute(async (request, response) => {
      const input = employerChatSchema.parse(request.body);
      const profile = store.getProfile(input.profileId);
      if (!profile || profile.status !== "published") {
        response.status(404).json({ error: "Profile not found" });
        return;
      }
      let reply: string;
      let mode: "hosted" | "demo" = "demo";
      if (config.hfToken && input.consentToHostedAI) {
        try {
          reply = await hostedEmployerTurn(
            { token: config.hfToken, model: config.hfModel, baseUrl: config.hfBaseUrl },
            profile,
            input.question,
          );
          mode = "hosted";
        } catch (error) {
          if (!config.allowDemoFallback) throw error;
          reply = demoEmployerTurn(profile, input.question);
        }
      } else {
        reply = demoEmployerTurn(profile, input.question);
      }
      response.json({
        reply,
        mode,
        suggestedQuestions: [
          "Which achievements have the strongest evidence?",
          "What should I validate in an interview?",
          `How does ${profile.name.split(" ")[0]}'s experience align with a senior role?`,
        ],
      });
    }),
  );

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    void _next;
    if (error instanceof z.ZodError) {
      response.status(400).json({ error: "Invalid request", details: error.issues });
      return;
    }
    const message = error instanceof Error ? error.message : "Unexpected server error";
    console.error(error);
    response.status(500).json({ error: message });
  });

  return { app, store };
};
