# Facet design notes

## Product principle

A useful professional profile is not a list of claims. It is a set of claims connected to decisions, constraints, actions, and outcomes. Facet's conversation therefore optimizes for **evidence coverage**, not message count.

## Agent design

The employee agent receives three inputs on each turn:

1. A stable interviewer policy.
2. The current structured profile.
3. The recent conversation window.

The policy tells the model to ask one question, adapt to the previous answer, avoid protected attributes, and never invent facts. When the user supplies new professional evidence, the model can call `update_profile`. Tool arguments are validated with Zod before they reach the profile store. Invalid calls return a tool error rather than mutating data.

The second model turn sees the tool result and produces the next natural question. This makes the update observable and keeps conversational text separate from state mutation.

The employer agent receives only the selected **published** profile and one question. Its policy requires answers to stay within that evidence, label inference, avoid protected-attribute inference, and refrain from hiring decisions.

## Why no agent framework?

The workflow has one model, one state mutation tool, and a bounded tool loop. A framework would add abstraction without adding useful coordination. The explicit loop is small enough to audit, test, and explain. `ProfileStore` and the hosted-inference module are already boundaries that can be replaced independently as the product grows.

## Conversation strategy

The agent aims to establish six facets while remaining adaptive:

- Professional identity and value
- A proud outcome with measurable or observable impact
- Ownership, scope, and collaborators
- Skills tied to evidence
- Desired next role
- Working preferences

These are not asked as a visible questionnaire. The system chooses the highest-value missing detail after each turn. Vague statements trigger a request for an example; quantified claims trigger a question about baseline or measurement.

## State and resilience

- Draft sessions are held in server memory.
- Profiles use a file-backed repository with serialized, atomic writes.
- Seeded synthetic profiles make the employer journey demonstrable immediately.
- If hosted inference is unavailable and `ALLOW_DEMO_FALLBACK=true`, the session clearly changes to guided demo mode.
- The model name, provider route, persistence path, and fallback policy are environment-configurable.

For a multi-instance deployment, replace `ProfileStore` with Postgres and move sessions to Redis or a signed durable store. The domain and API contracts do not need to change.

## Privacy boundaries

- Hosted inference is selected only when both a server token and per-session user consent exist.
- Draft profiles are never returned by public profile routes.
- API tokens are read on the server and are never embedded in the client bundle.
- Request bodies are capped at 32 KB and message fields have explicit length limits.
- Employer Q&A accepts a profile ID and loads the canonical published profile server-side; clients cannot inject hidden candidate context.

## Deliberate limitations

This prototype does not include authentication, multi-tenant authorization, deletion workflows, or production database migrations. Those controls are required before storing real profiles in a public deployment. The demo fallback uses simple stage-based extraction and is intentionally labeled rather than presented as model intelligence.

