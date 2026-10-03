import type { AgentReply, EmployerReply, Profile, SessionView } from "../shared/types";

type Health = { status: string; hostedAI: boolean; model: string };

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Something went wrong");
  return body;
};

export const api = {
  health: () => request<Health>("/api/health"),
  profiles: (query = "", workStyle = "") =>
    request<{ profiles: Profile[] }>(
      `/api/profiles?q=${encodeURIComponent(query)}&workStyle=${encodeURIComponent(workStyle)}`,
    ),
  createSession: (name: string, consentToHostedAI: boolean) =>
    request<SessionView>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ name, consentToHostedAI }),
    }),
  session: (id: string) => request<SessionView>(`/api/sessions/${id}`),
  message: (id: string, message: string) =>
    request<AgentReply & { session: SessionView["session"] }>(`/api/sessions/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  publish: (id: string) =>
    request<{ profile: Profile }>(`/api/sessions/${id}/publish`, { method: "POST" }),
  employerChat: (profileId: string, question: string, consentToHostedAI: boolean) =>
    request<EmployerReply>("/api/employer/chat", {
      method: "POST",
      body: JSON.stringify({ profileId, question, consentToHostedAI }),
    }),
};

