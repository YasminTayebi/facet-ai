# Facet design notes

## Product principle

A useful professional profile is not a list of claims. It is a set of claims connected to decisions, constraints, actions, and outcomes. Facet's conversation therefore optimizes for **evidence coverage**, not message count.

## Agent design

Each employee turn runs through an explicit LangGraph state machine:

1. `assess_evidence` scores identity, impact, ownership, experience, skills, goals, and preferences.
2. A conditional edge selects hosted reasoning or the local adaptive planner.
3. The hosted path can make several tool calls and recover from invalid tool arguments.
4. `quality_gate` removes exposed reasoning, limits the reply to one question, prevents repetition, and caps length.
5. A `MemorySaver` checkpointer maintains thread-specific graph state.

The employee agent receives three inputs on each turn:

1. A stable interviewer policy.
2. The current structured profile.
3. The recent conversation window.

The policy tells the model to ask one question, adapt to the previous answer, avoid protected attributes, and never invent facts. It includes few-shot examples for vague claims, quantified outcomes, leadership, and skill evidence. When the user supplies new professional evidence, the model can call `update_profile`. When several directions are possible, it can call the read-only `assess_profile_gaps` tool. Tool arguments are validated with Zod before they reach the profile store. Invalid calls return a tool error rather than mutating data.

The tool loop allows up to four model decisions in one turn. The model sees each tool result and can update state, inspect gaps, correct an invalid call, or produce the final question. This makes each update observable and keeps conversational text separate from state mutation.

The employer agent receives only the selected **published** profile and one question. Its policy requires answers to stay within that evidence, label inference, avoid protected-attribute inference, and refrain from hiring decisions.

## Why LangGraph?

The upgraded workflow has meaningful state transitions, conditional routing, provider fallback, retry behavior, a response-quality stage, and per-session memory. LangGraph makes those decisions visible as a graph instead of hiding them in route handlers. Model calls and domain tools remain explicit functions, so the graph is still easy to test and explain.

## Conversation strategy

The agent aims to establish seven evidence dimensions while remaining adaptive:

- Professional identity and value
- A proud outcome with measurable or observable impact
- Ownership, scope, and collaborators
- Skills tied to evidence
- Desired next role
- Working preferences

The local planner is not a fixed questionnaire. It detects quantified results, leadership language, vague adjectives, skill lists, and ownership gaps. It prioritizes a contextual follow-up, checks the transcript for similar earlier questions, and otherwise chooses a fresh question for the weakest evidence dimension.

These are not asked as a visible questionnaire. The system chooses the highest-value missing detail after each turn. Vague statements trigger a request for an example; quantified claims trigger a question about baseline or measurement.

## State and resilience

- Draft sessions are held in server memory.
- Profiles use a file-backed repository with serialized, atomic writes.
- Seeded synthetic profiles make the employer journey demonstrable immediately.
- If hosted inference is unavailable and `ALLOW_DEMO_FALLBACK=true`, the session clearly changes to local adaptive mode.
- LangGraph retries transient hosted-agent failures before applying the configured local fallback.
- The model name, provider route, persistence path, and fallback policy are environment-configurable.

For a multi-instance deployment, replace `ProfileStore` with Postgres and move sessions to Redis or a signed durable store. The domain and API contracts do not need to change.

## Privacy boundaries

- Hosted inference is selected only when both a server token and per-session user consent exist.
- Draft profiles are never returned by public profile routes.
- API tokens are read on the server and are never embedded in the client bundle.
- Request bodies are capped at 32 KB and message fields have explicit length limits.
- Employer Q&A accepts a profile ID and loads the canonical published profile server-side; clients cannot inject hidden candidate context.

## MCP integration

The stdio MCP server gives compatible clients a standard way to search and inspect published evidence. It exposes three read-only tools and one methodology resource. Draft profiles are rejected even when a caller knows the profile ID.

MCP was added because it demonstrates a useful external boundary rather than duplicating the chat UI. A separate assistant can discover published profiles and prepare evidence-based interview questions without receiving write access. Production deployments should add authentication and per-client authorization before exposing the server beyond a trusted local environment.

## Deliberate limitations

This prototype does not include authentication, multi-tenant authorization, deletion workflows, or production database migrations. Those controls are required before storing real profiles in a public deployment. The local fallback uses transparent heuristics and an evidence-gap planner; it is intentionally labeled separately from hosted model intelligence.
