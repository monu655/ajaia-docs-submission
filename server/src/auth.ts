import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { User } from "./types";

// This app does not implement real authentication. Instead, the client
// "logs in" by picking one of a few seeded demo users, and every request
// after that carries that user's id in the x-user-id header. This keeps
// the sharing/ownership logic real and testable while staying well within
// scope for a 4-6 hour exercise. A production version would replace this
// with session- or token-based auth (see ARCHITECTURE.md).
export interface AuthedRequest extends Request {
  user?: User;
}

export function requireUser(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.header("x-user-id");
  if (!userId) {
    return res.status(401).json({ error: "Missing x-user-id header" });
  }
  const user = db
    .prepare("SELECT id, name, email FROM users WHERE id = ?")
    .get(userId) as User | undefined;
  if (!user) {
    return res.status(401).json({ error: "Unknown user" });
  }
  req.user = user;
  next();
}
