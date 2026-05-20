// @ts-nocheck
import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireManager, requireAuth, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, DeleteUserParams } from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { BCRYPT_ROUNDS } from "../lib/constants";
import { accountLockoutService } from "../services/accountLockout";

const router = Router();

router.get("/users", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

router.post("/users", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, name, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [user] = await db.insert(usersTable).values({
    email,
    name,
    passwordHash,
    role: role as "STAFF" | "MANAGER",
  }).returning({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    createdAt: usersTable.createdAt,
  });

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "CREATE_USER",
    resourceType: "user",
    resourceId: user.id,
    description: `Created user ${email} with role ${role}`,
  });

  res.status(201).json(user);
});

router.patch("/users/:id", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.role) updates.role = parsed.data.role;
  if (parsed.data.password) {
    updates.passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
  }

  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, params.data.id))
    .returning({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "UPDATE_USER",
    resourceType: "user",
    resourceId: user.id,
    description: `Updated user ${user.email}`,
  });

  res.json(user);
});

router.delete("/users/:id", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const actingUser = (req as AuthRequest).user!;
  if (params.data.id === parseInt(actingUser.sub)) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));

  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "DELETE_USER",
    resourceType: "user",
    resourceId: params.data.id,
    description: `Deleted user id ${params.data.id}`,
  });

  res.sendStatus(204);
});

router.post("/users/:id/unlock", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await accountLockoutService.resetAttempts(user.id);

  const actingUser = (req as AuthRequest).user!;
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "UNLOCK_USER",
    resourceType: "user",
    resourceId: user.id,
    description: `Unlocked user ${user.email}`,
  });

  res.json({ success: true, message: "Account unlocked successfully" });
});

export default router;
