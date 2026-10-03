export type ProfileStatus = "draft" | "published";

export interface Experience {
  id: string;
  role: string;
  organization: string;
  period: string;
  impact: string[];
}

export interface Skill {
  name: string;
  evidence: string;
}

export interface WorkPreferences {
  targetRoles: string[];
  workStyle: "Remote" | "Hybrid" | "On-site" | "Flexible" | "";
  location: string;
}

export interface Profile {
  id: string;
  name: string;
  initials: string;
  headline: string;
  summary: string;
  location: string;
  availability: string;
  experiences: Experience[];
  skills: Skill[];
  achievements: string[];
  preferences: WorkPreferences;
  status: ProfileStatus;
  completion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
}

export interface Session {
  id: string;
  profileId: string;
  messages: Message[];
  stage: number;
  mode: "hosted" | "demo";
  createdAt: string;
}

export interface SessionView {
  session: Session;
  profile: Profile;
}

export interface CandidateSearch {
  query?: string;
  workStyle?: string;
}

export interface AgentReply {
  reply: string;
  profile: Profile;
  mode: "hosted" | "demo";
}

export interface EmployerReply {
  reply: string;
  suggestedQuestions: string[];
  mode: "hosted" | "demo";
}

