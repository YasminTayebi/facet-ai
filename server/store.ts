import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Profile, Session } from "../shared/types.js";
import { seedProfiles } from "./seed.js";

type DataShape = { profiles: Profile[] };

const clone = <T>(value: T): T => structuredClone(value);

export class ProfileStore {
  private profiles = new Map<string, Profile>();
  private sessions = new Map<string, Session>();
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath?: string) {
    seedProfiles.forEach((profile) => this.profiles.set(profile.id, clone(profile)));
  }

  async initialize() {
    if (!this.filePath) return;
    try {
      const data = JSON.parse(await readFile(this.filePath, "utf8")) as DataShape;
      data.profiles.forEach((profile) => this.profiles.set(profile.id, profile));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  listPublished(query = "", workStyle = "") {
    const needle = query.trim().toLowerCase();
    return [...this.profiles.values()]
      .filter((profile) => profile.status === "published")
      .filter((profile) => !workStyle || profile.preferences.workStyle === workStyle)
      .filter((profile) => {
        if (!needle) return true;
        const searchable = [
          profile.name,
          profile.headline,
          profile.summary,
          profile.location,
          ...profile.skills.flatMap((skill) => [skill.name, skill.evidence]),
          ...profile.preferences.targetRoles,
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(needle);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(clone);
  }

  getProfile(id: string) {
    const profile = this.profiles.get(id);
    return profile ? clone(profile) : undefined;
  }

  async saveProfile(profile: Profile) {
    this.profiles.set(profile.id, clone(profile));
    await this.persist();
    return clone(profile);
  }

  getSession(id: string) {
    const session = this.sessions.get(id);
    return session ? clone(session) : undefined;
  }

  saveSession(session: Session) {
    this.sessions.set(session.id, clone(session));
    return clone(session);
  }

  private async persist() {
    if (!this.filePath) return;
    this.writeQueue = this.writeQueue.then(async () => {
      const directory = dirname(this.filePath!);
      const tempFile = `${this.filePath}.${process.pid}.tmp`;
      await mkdir(directory, { recursive: true });
      const payload: DataShape = { profiles: [...this.profiles.values()] };
      await writeFile(tempFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
      await rename(tempFile, this.filePath!);
    });
    await this.writeQueue;
  }
}

