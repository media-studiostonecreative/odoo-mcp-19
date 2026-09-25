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
  it("signs in with a code however it is typed, and never stores the code itself", async () => {
    const { createPerson, findPersonByCode } = await import("@/lib/team/people");
    const { getHealthDb } = await import("@/lib/db");
    const { person, code } = createPerson("  Jess  ", "admin");
    expect(person.name).toBe("Jess");
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(findPersonByCode(code.toLowerCase().replace(/-/g, " "))!.id).toBe(person.id);
    expect(findPersonByCode("AAAA-BBBB-CCCC")).toBeNull();
    const stored = getHealthDb().prepare("SELECT code_hash FROM people WHERE id = ?").get(person.id) as { code_hash: string };
    expect(stored.code_hash).not.toContain(code.replace(/-/g, ""));
  });

  it("revoking ends sessions and blocks the code; resetting replaces the code", async () => {
    const { createPerson, createSession, findPersonBySession, findPersonByCode, revokePerson, resetCode } = await import("@/lib/team/people");
    const a = createPerson("Sam");
    const session = createSession(a.person.id);
    expect(findPersonBySession(session.token)!.name).toBe("Sam");

    const newCode = resetCode(a.person.id)!;
    expect(findPersonBySession(session.token)).toBeNull();
    expect(findPersonByCode(a.code)).toBeNull();
    expect(findPersonByCode(newCode)!.id).toBe(a.person.id);

    const again = createSession(a.person.id);
    revokePerson(a.person.id);
    expect(findPersonBySession(again.token)).toBeNull();
    expect(findPersonByCode(newCode)).toBeNull();
  });
});

describe("post comments", () => {
  it("tags comments with the author and lets only the author edit them", async () => {
    const { createPerson } = await import("@/lib/team/people");
    const { addComment, editComment, deleteComment, commentsFor, CommentError } = await import("@/lib/team/comments");
    const idea = await makeIdea();
    const jess = createPerson("Jess", "admin").person;
    const sam = createPerson("Sam").person;

    const c = addComment(idea.id, sam, "  Can we use the window-light shot?  ");
    expect(c.author_name).toBe("Sam");
    expect(c.body).toBe("Can we use the window-light shot?");

    expect(() => editComment(c.id, jess, "rewritten")).toThrow(CommentError);
    expect(editComment(c.id, sam, "Window-light shot please").edited_at).not.toBeNull();
    expect(() => addComment(idea.id, sam, "   ")).toThrow("Write something");

    // Admins can remove someone else's comment for moderation.
    deleteComment(c.id, jess);
    expect(commentsFor([idea.id]).get(idea.id)).toBeUndefined();
  });
});

describe("activity log", () => {
  it("records who did what, newest first", async () => {
    const { createPerson } = await import("@/lib/team/people");
    const { logActivity, activityFor } = await import("@/lib/team/activity");
    const idea = await makeIdea();
    const sam = createPerson("Sam").person;
    logActivity(sam, "content_idea", idea.id, "edit", "Edited caption");
    logActivity(sam, "content_idea", idea.id, "status", "Approved");
    const entries = activityFor("content_idea", [idea.id]).get(idea.id)!;
    expect(entries.map((e) => e.summary)).toEqual(["Approved", "Edited caption"]);
    expect(entries[0]!.author_name).toBe("Sam");
  });
});
