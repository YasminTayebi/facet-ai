import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { assessInterview, planNextQuestion } from "./interview-intelligence.js";
import { ProfileStore } from "./store.js";

const textResult = (value: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  structuredContent: value,
});

export const createFacetMcpServer = (store: ProfileStore) => {
  const server = new McpServer({
    name: "facet-profile-intelligence",
    version: "1.0.0",
  });

  server.registerResource(
    "evidence-first-methodology",
    "facet://methodology/evidence-first",
    {
      title: "Facet evidence-first profile methodology",
      description: "The dimensions Facet uses to assess professional-profile evidence.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: [
            "# Facet evidence-first methodology",
            "",
            "Facet evaluates identity, impact, ownership, experience context, evidenced skills, goals, and working preferences.",
            "A strong claim connects a situation, the person's own decision or action, and an observable result.",
            "The system does not infer protected characteristics, rank people, or make hiring decisions.",
          ].join("\n"),
        },
      ],
    }),
  );

  server.registerTool(
    "search_published_profiles",
    {
      title: "Search published Facet profiles",
      description: "Search only profiles that their owners have published. Draft profiles are never returned.",
      inputSchema: z.object({
        query: z.string().max(200).default("").describe("Role, skill, location, name, or evidence text"),
        workStyle: z.enum(["Remote", "Hybrid", "On-site", "Flexible", ""]).default(""),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, workStyle, limit }) => {
      const profiles = store.listPublished(query, workStyle).slice(0, limit).map((profile) => ({
        id: profile.id,
        name: profile.name,
        headline: profile.headline,
        location: profile.location,
        workStyle: profile.preferences.workStyle,
        targetRoles: profile.preferences.targetRoles,
        skills: profile.skills.map((skill) => skill.name),
      }));
      return textResult({ count: profiles.length, profiles });
    },
  );

  server.registerTool(
    "get_profile_evidence",
    {
      title: "Get published profile evidence",
      description: "Retrieve the structured evidence for one published profile by ID.",
      inputSchema: z.object({ profileId: z.string().min(1) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ profileId }) => {
      const profile = store.getProfile(profileId);
      if (!profile || profile.status !== "published") {
        return {
          content: [{ type: "text" as const, text: "Published profile not found." }],
          isError: true,
        };
      }
      return textResult({ profile });
    },
  );

  server.registerTool(
    "analyze_profile_evidence",
    {
      title: "Analyze profile evidence gaps",
      description:
        "Assess evidence coverage for one published profile and suggest job-relevant interview questions. This does not score fit or make a hiring decision.",
      inputSchema: z.object({ profileId: z.string().min(1) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ profileId }) => {
      const profile = store.getProfile(profileId);
      if (!profile || profile.status !== "published") {
        return {
          content: [{ type: "text" as const, text: "Published profile not found." }],
          isError: true,
        };
      }
      const assessment = assessInterview(profile);
      const suggestedQuestion = planNextQuestion(assessment, profile, [], profile.summary);
      return textResult({
        assessment,
        suggestedQuestion,
        disclaimer: "This evidence analysis is not a candidate ranking or hiring recommendation.",
      });
    },
  );

  return server;
};

