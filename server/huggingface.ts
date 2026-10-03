import { z } from "zod";
import type { Message, Profile } from "../shared/types.js";
import { refreshProfile, uid } from "./profile.js";
import { EMPLOYEE_SYSTEM_PROMPT, EMPLOYER_SYSTEM_PROMPT, employerPrompt } from "./prompts.js";

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; content: string; tool_call_id: string };

type Completion = {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
  error?: { message?: string };
};

export interface HuggingFaceConfig {
  token: string;
  model: string;
  baseUrl: string;
}

const profilePatchSchema = z.object({
  headline: z.string().max(180).optional(),
  summary: z.string().max(900).optional(),
  location: z.string().max(120).optional(),
  availability: z.string().max(120).optional(),
  experiences_to_add: z
    .array(
      z.object({
        role: z.string().max(140),
        organization: z.string().max(140),
        period: z.string().max(100),
        impact: z.array(z.string().max(320)).max(5),
      }),
    )
    .max(3)
    .optional(),
  skills_to_upsert: z
    .array(z.object({ name: z.string().max(80), evidence: z.string().max(320) }))
    .max(10)
    .optional(),
  achievements_to_add: z.array(z.string().max(320)).max(5).optional(),
  preferences: z
    .object({
      targetRoles: z.array(z.string().max(100)).max(6).optional(),
      workStyle: z.enum(["Remote", "Hybrid", "On-site", "Flexible", ""]).optional(),
      location: z.string().max(120).optional(),
    })
    .optional(),
});

const updateTool = {
  type: "function",
  function: {
    name: "update_profile",
    description:
      "Record only professional facts the user explicitly provided. Use after new evidence, experience, skills, achievements, goals, or preferences are shared.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", description: "Concise professional identity grounded in the user's words." },
        summary: { type: "string", description: "Evidence-based summary. Never invent details." },
        location: { type: "string" },
        availability: { type: "string" },
        experiences_to_add: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              role: { type: "string" },
              organization: { type: "string" },
              period: { type: "string" },
              impact: { type: "array", items: { type: "string" } },
            },
            required: ["role", "organization", "period", "impact"],
          },
        },
        skills_to_upsert: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { name: { type: "string" }, evidence: { type: "string" } },
            required: ["name", "evidence"],
          },
        },
        achievements_to_add: { type: "array", items: { type: "string" } },
        preferences: {
          type: "object",
          additionalProperties: false,
          properties: {
            targetRoles: { type: "array", items: { type: "string" } },
            workStyle: { type: "string", enum: ["Remote", "Hybrid", "On-site", "Flexible", ""] },
            location: { type: "string" },
          },
        },
      },
    },
  },
};

const mergeUnique = (existing: string[], incoming: string[]) => [...new Set([...existing, ...incoming])];

export const applyProfilePatch = (profile: Profile, rawArguments: string): Profile => {
  const patch = profilePatchSchema.parse(JSON.parse(rawArguments));
  const next = structuredClone(profile);
  if (patch.headline !== undefined) next.headline = patch.headline;
  if (patch.summary !== undefined) next.summary = patch.summary;
  if (patch.location !== undefined) next.location = patch.location;
  if (patch.availability !== undefined) next.availability = patch.availability;
  if (patch.experiences_to_add) {
    next.experiences.push(...patch.experiences_to_add.map((experience) => ({ ...experience, id: uid("exp") })));
  }
  if (patch.skills_to_upsert) {
    for (const skill of patch.skills_to_upsert) {
      const index = next.skills.findIndex((candidate) => candidate.name.toLowerCase() === skill.name.toLowerCase());
      if (index >= 0) next.skills[index] = skill;
      else next.skills.push(skill);
    }
  }
  if (patch.achievements_to_add) next.achievements = mergeUnique(next.achievements, patch.achievements_to_add);
  if (patch.preferences?.targetRoles) next.preferences.targetRoles = mergeUnique(next.preferences.targetRoles, patch.preferences.targetRoles);
  if (patch.preferences?.workStyle !== undefined) next.preferences.workStyle = patch.preferences.workStyle;
  if (patch.preferences?.location !== undefined) next.preferences.location = patch.preferences.location;
  return refreshProfile(next);
};

const requestCompletion = async (
  settings: HuggingFaceConfig,
  messages: ChatMessage[],
  tools?: unknown[],
  toolChoice?: "auto" | "none",
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        tools,
        tool_choice: tools ? (toolChoice ?? "auto") : undefined,
        temperature: 0.35,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });
    const body = (await response.json()) as Completion;
    if (!response.ok) throw new Error(body.error?.message ?? `Hugging Face request failed (${response.status})`);
    const message = body.choices?.[0]?.message;
    if (!message) throw new Error("Hugging Face returned no assistant message");
    return message;
  } finally {
    clearTimeout(timeout);
  }
};

const historyToMessages = (history: Message[]): ChatMessage[] =>
  history.slice(-14).map((message) => ({ role: message.role, content: message.content }));

export const hostedEmployeeTurn = async (
  settings: HuggingFaceConfig,
  profile: Profile,
  history: Message[],
) => {
  const messages: ChatMessage[] = [
    { role: "system", content: EMPLOYEE_SYSTEM_PROMPT },
    { role: "system", content: `CURRENT PROFILE JSON:\n${JSON.stringify(profile)}` },
    ...historyToMessages(history),
  ];
  const first = await requestCompletion(settings, messages, [updateTool], "auto");
  let nextProfile = profile;

  if (first.tool_calls?.length) {
    messages.push({ role: "assistant", content: first.content ?? null, tool_calls: first.tool_calls });
    for (const call of first.tool_calls) {
      let result: Record<string, unknown>;
      try {
        nextProfile = applyProfilePatch(nextProfile, call.function.arguments);
        result = { success: true, completion: nextProfile.completion };
      } catch (error) {
        result = { success: false, error: error instanceof Error ? error.message : "Invalid profile update" };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
    }
    const final = await requestCompletion(settings, messages, [updateTool], "none");
    return { reply: final.content?.trim() || "What would you like to add next?", profile: nextProfile };
  }

  return { reply: first.content?.trim() || "Tell me a little more about that.", profile: nextProfile };
};

export const hostedEmployerTurn = async (
  settings: HuggingFaceConfig,
  profile: Profile,
  question: string,
) => {
  const response = await requestCompletion(settings, [
    { role: "system", content: EMPLOYER_SYSTEM_PROMPT },
    { role: "user", content: employerPrompt(JSON.stringify(profile), question) },
  ]);
  return response.content?.trim() || "The profile does not contain enough evidence to answer that yet.";
};

