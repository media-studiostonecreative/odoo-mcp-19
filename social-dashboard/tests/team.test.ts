import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

beforeEach(() => {
  process.env.DASHBOARD_DATA_DIR = mkdtempSync(path.join(tmpdir(), "team-test-"));
});

async function makeIdea() {
  const { createContentIdea } = await import("@/lib/social/contentIdeas");
  return createContentIdea({ idea_type: "new", platform: "instagram", product: "Test", caption: "c", reasoning: "r", confidence: "promising" });
}

describe("people and sessions", () => {
  it("treats the same name in any case or spacing as one person", async () => {
    const { findOrCreatePerson, listPeople, PersonNameError } = await import("@/lib/team/people");
    const a = findOrCreatePerson("  Nicole ");
    const b = findOrCreatePerson("nicole");
    expect(b.id).toBe(a.id);
    expect(a.name).toBe("Nicole");
    findOrCreatePerson("Jess  Tran");
    expect(listPeople().map((p) => p.name)).toEqual(["Jess Tran", "Nicole"]);
    expect(() => findOrCreatePerson("   ")).toThrow(PersonNameError);
    expect(() => findOrCreatePerson("x".repeat(61))).toThrow(PersonNameError);
  });

  it("remembers a device by session and forgets it on switch", async () => {
    const { findOrCreatePerson, createSession, findPersonBySession, deleteSession } = await import("@/lib/team/people");
    const sam = findOrCreatePerson("Sam");
    const session = createSession(sam.id);
    expect(findPersonBySession(session.token)!.name).toBe("Sam");
    expect(findPersonBySession("not-a-token")).toBeNull();
    deleteSession(session.token);
    expect(findPersonBySession(session.token)).toBeNull();
  });

  it("rebuilds a people table from the access-code era, keeping ids and sessions", async () => {
    const Database = (await import("better-sqlite3")).default;
    const dir = process.env.DASHBOARD_DATA_DIR!;
    const legacy = new Database(path.join(dir, "social.sqlite3"));
    legacy.exec(`
      CREATE TABLE people (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
        code_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT (datetime('now')), revoked_at TEXT);
      INSERT INTO people (id, name, role, code_hash) VALUES (1, 'Nicole', 'admin', 'abc');
    `);
    legacy.close();
    const { closeHealthDb, getHealthDb } = await import("@/lib/db");
    closeHealthDb();
    const { findOrCreatePerson, createSession, findPersonBySession } = await import("@/lib/team/people");
    const cols = (getHealthDb().prepare("PRAGMA table_info(people)").all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(["id", "name", "created_at"]);
    expect(findOrCreatePerson("nicole").id).toBe(1);
    expect(findPersonBySession(createSession(1).token)!.name).toBe("Nicole");
  });
});

describe("post comments", () => {
  it("tags comments with the author and lets only the author change them", async () => {
    const { findOrCreatePerson } = await import("@/lib/team/people");
    const { addComment, editComment, deleteComment, commentsFor, CommentError } = await import("@/lib/team/comments");
    const idea = await makeIdea();
    const jess = findOrCreatePerson("Jess");
    const sam = findOrCreatePerson("Sam");

    const c = addComment(idea.id, sam, "  Can we use the window-light shot?  ");
    expect(c.author_name).toBe("Sam");
    expect(c.body).toBe("Can we use the window-light shot?");

    expect(() => editComment(c.id, jess, "rewritten")).toThrow(CommentError);
    expect(() => deleteComment(c.id, jess)).toThrow(CommentError);
    expect(editComment(c.id, sam, "Window-light shot please").edited_at).not.toBeNull();
    expect(() => addComment(idea.id, sam, "   ")).toThrow("Write something");

    deleteComment(c.id, sam);
    expect(commentsFor([idea.id]).get(idea.id)).toBeUndefined();
  });
});

describe("activity log", () => {
  it("records who did what, newest first", async () => {
    const { findOrCreatePerson } = await import("@/lib/team/people");
    const { logActivity, activityFor } = await import("@/lib/team/activity");
    const idea = await makeIdea();
    const sam = findOrCreatePerson("Sam");
    logActivity(sam, "content_idea", idea.id, "edit", "Edited caption");
    logActivity(sam, "content_idea", idea.id, "status", "Approved");
    const entries = activityFor("content_idea", [idea.id]).get(idea.id)!;
    expect(entries.map((e) => e.summary)).toEqual(["Approved", "Edited caption"]);
    expect(entries[0]!.author_name).toBe("Sam");
  });
});

describe("remembering a device", () => {
  it("renews a session that's getting old, and leaves a fresh one alone", async () => {
    const { findOrCreatePerson, createSession, refreshSession, findPersonBySession, SESSION_DAYS } = await import("@/lib/team/people");
    const { getHealthDb } = await import("@/lib/db");
    const nicole = findOrCreatePerson("Nicole");
    const session = createSession(nicole.id);
    expect(refreshSession(session.token)).toBeNull();

    const ageing = new Date(Date.now() + 30 * 86_400_000).toISOString();
    getHealthDb().prepare("UPDATE sessions SET expires_at = ?").run(ageing);
    const renewed = refreshSession(session.token)!;
    expect(renewed.getTime()).toBeGreaterThan(Date.now() + (SESSION_DAYS - 1) * 86_400_000);
    expect(findPersonBySession(session.token)!.name).toBe("Nicole");

    getHealthDb().prepare("UPDATE sessions SET expires_at = ?").run(new Date(Date.now() - 1000).toISOString());
    expect(refreshSession(session.token)).toBeNull();
  });
});
