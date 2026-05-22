import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { db, usersTable, invitesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/team/members", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.user!;

  const members = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.teamId, teamId));

  res.json(members);
});

router.post("/team/invite", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId, teamId } = req.user!;

  const [requestingUser] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!requestingUser || requestingUser.role !== "owner") {
    res.status(403).json({ error: "Only team owners can generate invite links" });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(invitesTable).values({
    token,
    teamId,
    createdBy: userId,
    expiresAt,
  });

  const baseUrl = req.headers.origin ?? `${req.protocol}://${req.get("host")}`;
  const inviteUrl = `${baseUrl}/join?token=${token}`;

  res.status(201).json({ inviteUrl, token, expiresAt });
});

router.patch("/team/members/:id/role", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId, teamId } = req.user!;

  const [requestingUser] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!requestingUser || requestingUser.role !== "owner") {
    res.status(403).json({ error: "Only team owners can transfer ownership" });
    return;
  }

  const targetId = parseInt(req.params["id"] as string, 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid member id" });
    return;
  }

  if (targetId === userId) {
    res.status(400).json({ error: "You are already the owner" });
    return;
  }

  const { role } = req.body as { role?: string };
  if (role !== "owner") {
    res.status(400).json({ error: "Invalid role. Only 'owner' is accepted." });
    return;
  }

  const [targetUser] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(and(eq(usersTable.id, targetId), eq(usersTable.teamId, teamId)));

  if (!targetUser) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  await db
    .update(usersTable)
    .set({ role: "owner" })
    .where(and(eq(usersTable.id, targetId), eq(usersTable.teamId, teamId)));

  await db
    .update(usersTable)
    .set({ role: "member" })
    .where(and(eq(usersTable.id, userId), eq(usersTable.teamId, teamId)));

  res.status(204).send();
});

router.delete("/team/members/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId, teamId } = req.user!;

  const [requestingUser] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!requestingUser || requestingUser.role !== "owner") {
    res.status(403).json({ error: "Only team owners can remove members" });
    return;
  }

  const targetId = parseInt(req.params["id"] as string, 10);
  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid member id" });
    return;
  }

  if (targetId === userId) {
    res.status(400).json({ error: "You cannot remove yourself from the team" });
    return;
  }

  const [targetUser] = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(and(eq(usersTable.id, targetId), eq(usersTable.teamId, teamId)));

  if (!targetUser) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  if (targetUser.role === "owner") {
    res.status(400).json({ error: "Cannot remove another owner from the team" });
    return;
  }

  await db
    .delete(usersTable)
    .where(and(eq(usersTable.id, targetId), eq(usersTable.teamId, teamId)));

  res.status(204).send();
});

export default router;
