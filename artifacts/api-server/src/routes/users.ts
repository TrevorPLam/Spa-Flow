import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireManager, type AuthRequest } from "../lib/auth";
import { writeAuditLog } from "../lib/audit";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, DeleteUserParams } from "@workspace/api-zod";
import { apiLimiter } from "../middleware/rateLimit";
import { BCRYPT_ROUNDS } from "../lib/constants";
import { accountLockoutService } from "../services/accountLockout";
import { sendValidationError, sendNotFoundError, sendConflictError } from "../lib/response-formatters";

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
    sendValidationError(res, parsed.error.message);
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
    sendValidationError(res, params.error.message);
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error.message);
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
    sendNotFoundError(res, "User not found");
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
    sendValidationError(res, params.error.message);
    return;
  }

  const actingUser = (req as AuthRequest).user!;
  if (params.data.id === parseInt(actingUser.sub)) {
    sendValidationError(res, "Cannot delete your own account");
    return;
  }

  // Check if user exists
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    sendNotFoundError(res, "User not found");
    return;
  }

  // Write audit log before deletion
  await writeAuditLog({
    userId: parseInt(actingUser.sub),
    action: "DELETE_USER",
    resourceType: "user",
    resourceId: params.data.id,
    description: `Deleted user ${user.email}`,
  });

  try {
    await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  } catch (error: any) {
    // Check for foreign key constraint violation
    if (error.code === '23503') {
      sendConflictError(res, "Cannot delete user with associated audit logs");
      return;
    }
    throw error;
  }

  res.sendStatus(204);
});

router.post("/users/:id/unlock", requireManager, apiLimiter, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    sendValidationError(res, params.error.message);
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    sendNotFoundError(res, "User not found");
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
