import { afterEach, describe, expect, it, vi } from "vitest";
import type { Message } from "../shared/types.js";
import { hostedEmployeeTurn } from "../server/huggingface.js";
import { runEmployeeAgent } from "../server/agent-graph.js";
import { createProfile } from "../server/profile.js";

const completion = (message: Record<string, unknown>) =>
  new Response(JSON.stringify({ choices: [{ message }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

describe("hosted employee tool loop", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("can assess gaps, update the profile, and then ask a grounded follow-up", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        completion({
          content: null,
          tool_calls: [
            {
              id: "call-assess",
              type: "function",
              function: { name: "assess_profile_gaps", arguments: "{}" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        completion({
          content: null,
          tool_calls: [
            {
              id: "call-update",
              type: "function",
              function: {
                name: "update_profile",
                arguments: JSON.stringify({
                  achievements_to_add: ["Reduced onboarding time by 40%"],
                }),
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        completion({
          content: "A 40% reduction is strong evidence. What decision was specifically yours, and how did you measure the change?",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const profile = createProfile("Mina Shah");
    profile.headline = "Product manager";
    const history: Message[] = [
      {
        id: "message-1",
        role: "user",
        content: "I reduced onboarding time by 40%.",
        createdAt: new Date().toISOString(),
      },
    ];

    const result = await hostedEmployeeTurn(
      { token: "test-token", model: "test-model", baseUrl: "https://example.test/v1" },
      profile,
      history,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.profile.achievements).toContain("Reduced onboarding time by 40%");
    expect(result.reply).toContain("specifically yours");

    const secondRequest = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)) as {
      messages: Array<{ role: string; tool_call_id?: string }>;
    };
    expect(secondRequest.messages.some((message) => message.role === "tool" && message.tool_call_id === "call-assess")).toBe(true);
  });

  it("stops irrelevant input before calling the hosted model", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const profile = createProfile("Mina Shah");

    const result = await runEmployeeAgent({
      sessionId: "irrelevant-hosted-session",
      profile,
      history: [
        {
          id: "message-irrelevant",
          role: "user",
          content: "asdf qwerty banana",
          createdAt: new Date().toISOString(),
        },
      ],
      latestInput: "asdf qwerty banana",
      stage: 0,
      mode: "hosted",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.profile).toEqual(profile);
    expect(result.reply).toContain("could not connect");
    expect(result.reply).not.toMatch(/wow|awesome|amazing|great|impressive/i);
  });
});
