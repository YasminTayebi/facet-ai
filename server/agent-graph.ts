import { Annotation, END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import type { Message, Profile, Session } from "../shared/types.js";
import { config } from "./config.js";
import { demoEmployeeTurn } from "./demo-agent.js";
import { hostedEmployeeTurn } from "./huggingface.js";
import {
  assessInterview,
  planNextQuestion,
  questionWasAsked,
  type InterviewAssessment,
} from "./interview-intelligence.js";

const InterviewState = Annotation.Root({
  sessionId: Annotation<string>(),
  profile: Annotation<Profile>(),
  history: Annotation<Message[]>(),
  latestInput: Annotation<string>(),
  stage: Annotation<number>(),
  mode: Annotation<Session["mode"]>(),
  assessment: Annotation<InterviewAssessment>(),
  reply: Annotation<string>(),
  fallbackReason: Annotation<string>(),
});

const assessEvidence = (state: typeof InterviewState.State) => ({
  assessment: assessInterview(state.profile, state.latestInput),
});

const runHostedInterview = async (state: typeof InterviewState.State) => {
  try {
    const turn = await hostedEmployeeTurn(
      { token: config.hfToken, model: config.hfModel, baseUrl: config.hfBaseUrl },
      state.profile,
      state.history,
      state.assessment,
    );
    return { reply: turn.reply, profile: turn.profile, mode: "hosted" as const, fallbackReason: "" };
  } catch (error) {
    if (!config.allowDemoFallback) throw error;
    const turn = demoEmployeeTurn(state.profile, state.history, state.latestInput);
    return {
      reply: turn.reply,
      profile: turn.profile,
      mode: "demo" as const,
      fallbackReason: error instanceof Error ? error.message : "Hosted inference failed",
    };
  }
};

const runDemoInterview = (state: typeof InterviewState.State) => {
  const turn = demoEmployeeTurn(state.profile, state.history, state.latestInput);
  return { reply: turn.reply, profile: turn.profile, mode: "demo" as const, fallbackReason: "" };
};

const cleanModelReasoning = (value: string) =>
  value
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:analysis|reasoning)[\s\S]*?```/gi, "")
    .trim();

const enforceSingleQuestion = (reply: string) => {
  const firstQuestionMark = reply.indexOf("?");
  if (firstQuestionMark < 0) return reply;
  return reply.slice(0, firstQuestionMark + 1);
};

const capWords = (reply: string, limit = 90) => {
  const words = reply.split(/\s+/);
  if (words.length <= limit) return reply;
  return `${words.slice(0, limit).join(" ").replace(/[,:;.]$/, "")}?`;
};

const qualityGate = (state: typeof InterviewState.State) => {
  const updatedAssessment = assessInterview(state.profile, state.latestInput);
  const planned = planNextQuestion(updatedAssessment, state.profile, state.history, state.latestInput);
  let reply = capWords(enforceSingleQuestion(cleanModelReasoning(state.reply)));

  if (!reply.includes("?")) reply = `${reply ? `${reply} ` : ""}${planned}`;
  if (questionWasAsked(reply, state.history)) reply = planned;

  return { reply, assessment: updatedAssessment };
};

const checkpointer = new MemorySaver();

const employeeGraph = new StateGraph(InterviewState)
  .addNode("assess_evidence", assessEvidence)
  .addNode("hosted_interview", runHostedInterview, { retryPolicy: { maxAttempts: 2 } })
  .addNode("adaptive_demo", runDemoInterview)
  .addNode("quality_gate", qualityGate)
  .addEdge(START, "assess_evidence")
  .addConditionalEdges("assess_evidence", (state) => state.mode, {
    hosted: "hosted_interview",
    demo: "adaptive_demo",
  })
  .addEdge("hosted_interview", "quality_gate")
  .addEdge("adaptive_demo", "quality_gate")
  .addEdge("quality_gate", END)
  .compile({ checkpointer });

export interface EmployeeAgentInput {
  sessionId: string;
  profile: Profile;
  history: Message[];
  latestInput: string;
  stage: number;
  mode: Session["mode"];
}

export const runEmployeeAgent = async (input: EmployeeAgentInput) => {
  const result = await employeeGraph.invoke(
    {
      ...input,
      assessment: assessInterview(input.profile, input.latestInput),
      reply: "",
      fallbackReason: "",
    },
    { configurable: { thread_id: input.sessionId } },
  );
  return {
    reply: result.reply,
    profile: result.profile,
    mode: result.mode,
    assessment: result.assessment,
    fallbackReason: result.fallbackReason,
  };
};

export const getEmployeeGraph = () => employeeGraph;

