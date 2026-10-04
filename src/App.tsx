import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  CircleCheck,
  LoaderCircle,
  MapPin,
  MessageCircleMore,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { Message, Profile, SessionView } from "../shared/types";
import { api } from "./api";

type Screen = "home" | "employee" | "employer";
type Health = Awaited<ReturnType<typeof api.health>>;

const cx = (...classes: Array<string | false | undefined>) => classes.filter(Boolean).join(" ");

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Facet home">
      <span className="brand-mark"><span /></span>
      <span>Facet</span>
    </button>
  );
}

function Topbar({ screen, onNavigate }: { screen: Screen; onNavigate: (screen: Screen) => void }) {
  return (
    <header className="topbar">
      <Brand onClick={() => onNavigate("home")} />
      <nav aria-label="Primary navigation">
        <button className={screen === "employee" ? "active" : ""} onClick={() => onNavigate("employee")}>Build my profile</button>
        <button className={screen === "employer" ? "active" : ""} onClick={() => onNavigate("employer")}>Explore talent</button>
      </nav>
      <div className="topbar-note"><span className="status-dot" /> Evidence, not buzzwords</div>
    </header>
  );
}

function Home({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> Conversational career intelligence</div>
          <h1>More than a resume.<br /><em>A profile with proof.</em></h1>
          <p className="hero-lead">
            Facet asks the questions that uncover how people really work. It then turns their answers into clear, evidence-rich profiles.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => onNavigate("employee")}>Build your profile <ArrowRight size={18} /></button>
            <button className="button ghost" onClick={() => onNavigate("employer")}>Explore talent</button>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={17} /> You choose what gets published</span>
            <span><CircleCheck size={17} /> Every claim needs evidence</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="Example Facet profile conversation">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="profile-peek">
            <div className="peek-head">
              <div className="avatar coral">AO</div>
              <div><strong>Amara Okafor</strong><span>Product design · Berlin</span></div>
              <span className="match-pill">92% complete</span>
            </div>
            <p>“Tell me about a decision where you changed the direction of the work.”</p>
            <div className="answer-card">I reframed account recovery around user anxiety, not task completion. Support contacts fell 31%.</div>
            <div className="signal-row"><span>Product strategy</span><span>Research</span><span>+ evidence</span></div>
          </div>
          <div className="floating-note note-one"><Target size={18} /><span><strong>Impact captured</strong>31% fewer support contacts</span></div>
          <div className="floating-note note-two"><Sparkles size={18} /><span><strong>Story strengthened</strong>Decision + action + result</span></div>
        </div>
      </section>

      <section className="journeys">
        <div className="section-heading"><span>Two sides of a better introduction</span><h2>Built for the person and the person looking.</h2></div>
        <div className="journey-grid">
          <button className="journey-card employee-card" onClick={() => onNavigate("employee")}>
            <div className="journey-icon"><UserRound /></div>
            <span className="card-label">For professionals</span>
            <h3>Find the signal in your story.</h3>
            <p>A thoughtful interview uncovers achievements, judgment, and working style, one useful question at a time.</p>
            <span className="card-link">Start a conversation <ArrowRight size={17} /></span>
          </button>
          <button className="journey-card employer-card" onClick={() => onNavigate("employer")}>
            <div className="journey-icon"><UsersRound /></div>
            <span className="card-label">For teams</span>
            <h3>Look past the keyword match.</h3>
            <p>Explore the evidence behind a profile and form sharper, fairer questions before an interview.</p>
            <span className="card-link">Meet the talent <ArrowRight size={17} /></span>
          </button>
        </div>
      </section>
    </main>
  );
}

const demoAnswers = [
  "I design AI products and turn ambiguous research into tools people can trust.",
  "I led an evaluation redesign that caught 40% more failures before release.",
  "Senior AI Engineer at Atlas Labs, 2023 to present; I owned evaluation and deployment.",
  "Python, LLM evaluation, stakeholder facilitation, MLOps, technical writing",
  "Applied AI Lead, remote or hybrid",
  "I also mentor junior engineers and created our model-review playbook.",
];

function StartProfile({ health, onStarted }: { health: Health; onStarted: (view: SessionView) => void }) {
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true); setError("");
    try { onStarted(await api.createSession(name, consent)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the conversation"); }
    finally { setLoading(false); }
  };

  return (
    <div className="onboarding-shell">
      <div className="onboarding-copy">
        <div className="eyebrow"><MessageCircleMore size={15} /> Your story, in your words</div>
        <h1>Let’s build the profile a resume can’t.</h1>
        <p>There are no perfect answers. Facet will listen, find the strongest thread, and ask what matters next.</p>
        <ol className="steps-list">
          <li><span>01</span><div><strong>Talk it through</strong><p>Answer one focused question at a time.</p></div></li>
          <li><span>02</span><div><strong>See the evidence</strong><p>Your profile takes shape beside the conversation.</p></div></li>
          <li><span>03</span><div><strong>Publish on your terms</strong><p>Nothing is visible until you decide it is ready.</p></div></li>
        </ol>
      </div>
      <form className="start-card" onSubmit={submit}>
        <div className="mini-mark"><span /></div>
        <span className="form-kicker">Start with the simple part</span>
        <h2>What should we call you?</h2>
        <label className="field-label" htmlFor="name">Full name</label>
        <input id="name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Amara Okafor" minLength={2} required />
        {health.hostedAI ? (
          <label className="consent-box">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span className="custom-check">{consent && <Check size={13} />}</span>
            <span><strong>Use hosted AI for this conversation</strong><small>My professional profile and messages will be sent to the configured Hugging Face inference provider. I can continue in private adaptive mode without this.</small></span>
          </label>
        ) : (
          <div className="demo-notice"><ShieldCheck size={18} /><span><strong>Private adaptive mode</strong>The evidence-gap planner adapts each follow-up locally, so this conversation stays on this server.</span></div>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="button primary wide" disabled={loading || name.trim().length < 2}>
          {loading ? <LoaderCircle className="spin" size={18} /> : <>Begin conversation <ArrowRight size={18} /></>}
        </button>
        <small className="fine-print">Draft profiles are never shown in talent search.</small>
      </form>
    </div>
  );
}

function CompletionRing({ value }: { value: number }) {
  return <div className="completion-ring" style={{ "--progress": `${value * 3.6}deg` } as React.CSSProperties}><span>{value}<small>%</small></span></div>;
}

function ProfilePanel({ profile, onPublish, publishing }: { profile: Profile; onPublish: () => void; publishing: boolean }) {
  return (
    <aside className="profile-panel">
      <div className="profile-panel-head"><div><span className="panel-kicker">Live profile</span><h2>{profile.name}</h2></div><CompletionRing value={profile.completion} /></div>
      <div className="profile-status"><span className={cx("status-tag", profile.status)}>{profile.status === "draft" ? "Private draft" : "Published"}</span><span>Updated just now</span></div>
      <section className={cx("profile-block", !profile.headline && "empty-block")}>
        <label>Professional headline</label>
        <p>{profile.headline || "Your professional through-line will appear here."}</p>
      </section>
      <section className={cx("profile-block", !profile.summary && "empty-block")}>
        <label>About</label>
        <p>{profile.summary || "As you share examples, Facet will build a grounded summary."}</p>
      </section>
      <section className="profile-block">
        <div className="block-title"><label>Evidence</label><span>{profile.achievements.length + profile.experiences.length}</span></div>
        {profile.achievements.length || profile.experiences.length ? (
          <ul className="evidence-list">
            {profile.achievements.slice(0, 2).map((item) => <li key={item}><CircleCheck size={16} />{item}</li>)}
            {profile.experiences.slice(0, 2).map((item) => <li key={item.id}><BriefcaseBusiness size={16} />{item.impact[0] || item.role}</li>)}
          </ul>
        ) : <p className="placeholder-line">Specific outcomes will collect here.</p>}
      </section>
      <section className="profile-block">
        <div className="block-title"><label>Skills with proof</label><span>{profile.skills.length}</span></div>
        {profile.skills.length ? <div className="skill-cloud">{profile.skills.map((skill) => <span key={skill.name}>{skill.name}</span>)}</div> : <p className="placeholder-line">Skills appear only when the conversation supports them.</p>}
      </section>
      <button className="button publish-button" disabled={publishing || profile.completion < 50 || profile.status === "published"} onClick={onPublish}>
        {profile.status === "published" ? <><Check size={17} /> Profile published</> : publishing ? <LoaderCircle className="spin" size={17} /> : <>Publish profile <ArrowRight size={17} /></>}
      </button>
      {profile.completion < 50 && <small className="publish-hint">Reach 50% to publish. You are in control.</small>}
    </aside>
  );
}

function EmployeeWorkspace({ view, setView }: { view: SessionView; setView: (view: SessionView) => void }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [agentFocus, setAgentFocus] = useState(view.profile.headline ? "impact" : "identity");
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [view.session.messages, sending]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true); setError(""); setDraft("");
    try {
      const result = await api.message(view.session.id, message);
      setView({ session: result.session, profile: result.profile });
      if (result.assessment?.nextFocus) setAgentFocus(result.assessment.nextFocus);
    } catch (reason) {
      setDraft(message);
      setError(reason instanceof Error ? reason.message : "Could not send the message");
    } finally { setSending(false); }
  };

  const publish = async () => {
    setPublishing(true); setError("");
    try { setView({ ...view, profile: (await api.publish(view.session.id)).profile }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not publish the profile"); }
    finally { setPublishing(false); }
  };

  return (
    <div className="workspace">
      <section className="chat-pane">
        <div className="chat-head">
          <div className="agent-identity"><div className="agent-avatar"><Sparkles size={19} /></div><div><strong>Facet guide</strong><span><i /> {view.session.mode === "hosted" ? "LangGraph + hosted model" : "LangGraph adaptive planner"}</span></div></div>
          <div className="chat-context"><span className="agent-focus"><Target size={12} /> Current focus: {agentFocus}</span><span className="conversation-label">Private conversation</span></div>
        </div>
        <div className="messages" aria-live="polite">
          <div className="date-divider">Today</div>
          {view.session.messages.map((message: Message) => (
            <div className={cx("message-row", message.role)} key={message.id}>
              {message.role === "assistant" && <div className="tiny-agent"><Sparkles size={13} /></div>}
              <div className="message-bubble">{message.content}</div>
            </div>
          ))}
          {sending && <div className="message-row assistant"><div className="tiny-agent"><Sparkles size={13} /></div><div className="message-bubble typing"><span /><span /><span /></div></div>}
          <div ref={bottomRef} />
        </div>
        <div className="composer-wrap">
          {error && <p className="inline-error">{error}</p>}
          {!sending && view.session.stage < demoAnswers.length && (
            <button className="sample-answer" onClick={() => setDraft(demoAnswers[Math.min(view.session.stage, demoAnswers.length - 1)])}><Sparkles size={14} /> Try a sample answer</button>
          )}
          <form className="composer" onSubmit={send}>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Answer in your own words…" rows={2} maxLength={3000} />
            <button aria-label="Send message" disabled={!draft.trim() || sending}><Send size={19} /></button>
          </form>
          <small>Enter to send · Shift + Enter for a new line</small>
        </div>
      </section>
      <ProfilePanel profile={view.profile} onPublish={publish} publishing={publishing} />
    </div>
  );
}

function Employee({ health }: { health: Health }) {
  const [view, setView] = useState<SessionView | null>(null);
  return view ? <EmployeeWorkspace view={view} setView={setView} /> : <StartProfile health={health} onStarted={setView} />;
}

function TalentCard({ profile, active, onClick }: { profile: Profile; active: boolean; onClick: () => void }) {
  return (
    <button className={cx("talent-card", active && "active")} onClick={onClick}>
      <div className="avatar">{profile.initials}</div>
      <div className="talent-card-copy"><strong>{profile.name}</strong><span>{profile.headline}</span><small><MapPin size={12} /> {profile.location} · {profile.preferences.workStyle}</small></div>
      <ArrowRight size={16} />
    </button>
  );
}

function Employer({ health }: { health: Health }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [workStyle, setWorkStyle] = useState("");
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      api.profiles(query, workStyle).then(({ profiles: result }) => {
        setProfiles(result);
        setSelectedId((current) => result.some((item) => item.id === current) ? current : (result[0]?.id ?? ""));
      }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load profiles")).finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [query, workStyle]);

  const selected = useMemo(() => profiles.find((profile) => profile.id === selectedId), [profiles, selectedId]);

  const ask = async (nextQuestion?: string) => {
    const prompt = (nextQuestion ?? question).trim();
    if (!selected || !prompt || asking) return;
    setQuestion(prompt); setAsking(true); setAnswer(""); setError("");
    try { setAnswer((await api.employerChat(selected.id, prompt, consent)).reply); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not analyze the profile"); }
    finally { setAsking(false); }
  };

  const suggestions = ["What is the strongest evidence of impact?", "Which skills should I validate?", "What is missing from this profile?"];

  return (
    <div className="talent-shell">
      <aside className="talent-sidebar">
        <div className="talent-title"><span className="panel-kicker">Talent explorer</span><h1>Find people by how they work.</h1></div>
        <div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search skills, roles, evidence…" /></div>
        <div className="filter-row">{["", "Remote", "Hybrid", "Flexible"].map((filter) => <button className={filter === workStyle ? "active" : ""} onClick={() => setWorkStyle(filter)} key={filter || "All"}>{filter || "All"}</button>)}</div>
        <div className="result-count">{profiles.length} evidence-rich profiles</div>
        <div className="talent-list">
          {loading ? <div className="loading-list"><LoaderCircle className="spin" /> Finding signal…</div> : profiles.map((profile) => <TalentCard key={profile.id} profile={profile} active={profile.id === selectedId} onClick={() => { setSelectedId(profile.id); setAnswer(""); }} />)}
          {!loading && profiles.length === 0 && <div className="empty-results">No profiles match that search.</div>}
        </div>
      </aside>

      <main className="candidate-pane">
        {selected ? (
          <>
            <div className="candidate-hero">
              <div className="candidate-avatar">{selected.initials}</div>
              <div className="candidate-intro"><span className="available"><i /> {selected.availability}</span><h2>{selected.name}</h2><p>{selected.headline}</p><small><MapPin size={14} /> {selected.location} · {selected.preferences.workStyle}</small></div>
              <div className="target-roles"><span>Open to</span>{selected.preferences.targetRoles.map((role) => <strong key={role}>{role}</strong>)}</div>
            </div>
            <div className="candidate-grid">
              <div className="candidate-story">
                <section><span className="section-label">The through-line</span><p className="large-summary">{selected.summary}</p></section>
                <section><div className="section-row"><span className="section-label">Experience & evidence</span><span>{selected.experiences.length} roles</span></div>
                  <div className="timeline">{selected.experiences.map((experience) => <article key={experience.id}><div className="timeline-dot" /><div className="experience-head"><div><h3>{experience.role}</h3><p>{experience.organization}</p></div><span>{experience.period}</span></div><ul>{experience.impact.map((impact) => <li key={impact}>{impact}</li>)}</ul></article>)}</div>
                </section>
                <section><span className="section-label">Skills, with context</span><div className="skill-evidence-grid">{selected.skills.map((skill) => <article key={skill.name}><strong>{skill.name}</strong><p>{skill.evidence}</p></article>)}</div></section>
              </div>
              <aside className="scout-card">
                <div className="scout-head"><div className="agent-avatar"><Sparkles size={18} /></div><div><strong>Ask Facet Scout</strong><span>Answers from this profile only</span></div></div>
                <p className="scout-intro">Explore the evidence, spot what is missing, and prepare a better conversation.</p>
                <div className="suggestion-stack">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void ask(suggestion)}>{suggestion}<ArrowRight size={14} /></button>)}</div>
                <div className="scout-answer" aria-live="polite">
                  {asking ? <div className="thinking"><LoaderCircle className="spin" /> Reading the evidence…</div> : answer ? <><span>Facet’s read</span><p>{answer}</p></> : <div className="answer-placeholder"><MessageCircleMore size={24} /><span>Ask a question to see an evidence-grounded answer.</span></div>}
                </div>
                {health.hostedAI && <label className="mini-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>Use hosted AI for this question</span></label>}
                <form className="scout-composer" onSubmit={(event) => { event.preventDefault(); void ask(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this profile…" /><button disabled={!question.trim() || asking}><Send size={16} /></button></form>
                {error && <p className="inline-error">{error}</p>}
                <div className="fairness-note"><ShieldCheck size={15} /> Facet never infers protected characteristics or makes hiring decisions.</div>
              </aside>
            </div>
          </>
        ) : <div className="no-selection"><UsersRound size={38} /><h2>Select a profile to explore</h2><p>Search by evidence, not just keywords.</p></div>}
      </main>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [health, setHealth] = useState<Health>({ status: "loading", hostedAI: false, model: "" });
  useEffect(() => { api.health().then(setHealth).catch(() => setHealth({ status: "demo", hostedAI: false, model: "" })); }, []);
  return (
    <div className="app-shell">
      <Topbar screen={screen} onNavigate={setScreen} />
      {screen === "home" && <Home onNavigate={setScreen} />}
      {screen === "employee" && <Employee health={health} />}
      {screen === "employer" && <Employer health={health} />}
      {screen !== "home" && <button className="back-home" onClick={() => setScreen("home")}><ChevronLeft size={15} /> Home</button>}
    </div>
  );
}
