import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes } from "crypto";
import { db, usersTable, invitesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

export default router;
