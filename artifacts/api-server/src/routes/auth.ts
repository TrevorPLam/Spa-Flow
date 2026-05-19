import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, setAuthCookie, clearAuthCookie, requireAuth, type AuthRequest } from "../lib/auth";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = await signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role as "STAFF" | "MANAGER",
    name: user.name,
  });

  setAuthCookie(res, token);
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

router.post("/auth/logout", (req, res): void => {
  clearAuthCookie(res);
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as AuthRequest).user!;
  res.json({ id: parseInt(user.sub), email: user.email, name: user.name, role: user.role });
});

export default router;
