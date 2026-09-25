import "server-only";

import { getHealthDb } from "../db";
import type { Person } from "./people";

export interface PostComment {
  id: number;
  content_idea_id: number;
  person_id: number | null;
  author_name: string;
  body: string;
  created_at: string;
  edited_at: string | null;
}

export const MAX_COMMENT_LENGTH = 4000;

export class CommentError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 403 | 404,
  ) {
    super(message);
  }
}

function cleanBody(body: unknown): string {
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) throw new CommentError("Write something before posting.", 400);
  if (text.length > MAX_COMMENT_LENGTH) throw new CommentError(`Comments are limited to ${MAX_COMMENT_LENGTH} characters.`, 400);
  return text;
}

/** Oldest first within a thread, grouped by post. */
export function commentsFor(ideaIds?: number[]): Map<number, PostComment[]> {
  const db = getHealthDb();
  const rows = (
    ideaIds && ideaIds.length > 0
      ? db.prepare(`SELECT * FROM post_comments WHERE content_idea_id IN (${ideaIds.map(() => "?").join(",")}) ORDER BY created_at, id`).all(...ideaIds)
      : db.prepare("SELECT * FROM post_comments ORDER BY created_at, id").all()
  ) as PostComment[];
  const map = new Map<number, PostComment[]>();
  for (const r of rows) (map.get(r.content_idea_id) ?? map.set(r.content_idea_id, []).get(r.content_idea_id)!).push(r);
  return map;
}

export function addComment(ideaId: number, author: Pick<Person, "id" | "name">, body: unknown): PostComment {
  const db = getHealthDb();
  const text = cleanBody(body);
  if (!db.prepare("SELECT 1 FROM content_ideas WHERE id = ?").get(ideaId)) throw new CommentError("That post no longer exists.", 404);
  const result = db.prepare("INSERT INTO post_comments (content_idea_id, person_id, author_name, body) VALUES (?, ?, ?, ?)").run(ideaId, author.id, author.name, text);
  return db.prepare("SELECT * FROM post_comments WHERE id = ?").get(result.lastInsertRowid) as PostComment;
}

function ownedComment(commentId: number, actor: Pick<Person, "id" | "role">): PostComment {
  const comment = getHealthDb().prepare("SELECT * FROM post_comments WHERE id = ?").get(commentId) as PostComment | undefined;
  if (!comment) throw new CommentError("That comment no longer exists.", 404);
  if (comment.person_id !== actor.id && actor.role !== "admin") throw new CommentError("You can only change your own comments.", 403);
  return comment;
}

/** Only the author can edit their words; not even an admin rewrites someone else's comment. */
export function editComment(commentId: number, actor: Pick<Person, "id" | "role">, body: unknown): PostComment {
  const comment = ownedComment(commentId, actor);
  if (comment.person_id !== actor.id) throw new CommentError("Only the person who wrote a comment can edit it.", 403);
  const db = getHealthDb();
  db.prepare("UPDATE post_comments SET body = ?, edited_at = datetime('now') WHERE id = ?").run(cleanBody(body), commentId);
  return db.prepare("SELECT * FROM post_comments WHERE id = ?").get(commentId) as PostComment;
}

/** The author, or an admin (for moderation), can remove a comment. */
export function deleteComment(commentId: number, actor: Pick<Person, "id" | "role">): PostComment {
  const comment = ownedComment(commentId, actor);
  getHealthDb().prepare("DELETE FROM post_comments WHERE id = ?").run(commentId);
  return comment;
}
