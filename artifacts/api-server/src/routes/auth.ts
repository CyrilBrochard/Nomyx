import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, teamsTable, invitesTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody, AcceptInviteBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function registerHandler(req: Request, res: Response): Promise<void> {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, teamName } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [team] = await db.insert(teamsTable).values({ name: teamName }).returning();
  const [user] = await db.insert(usersTable).values({ email, passwordHash, teamId: team.id, role: "owner" }).returning();

  const token = signToken({ userId: user.id, teamId: user.teamId, email: user.email });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      teamId: user.teamId,
      teamName: team.name,
      role: user.role,
    },
  });
}

async function loginHandler(req: Request, res: Response): Promise<void> {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId));
  const token = signToken({ userId: user.id, teamId: user.teamId, email: user.email });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      teamId: user.teamId,
      teamName: team.name,
      role: user.role,
    },
  });
}

async function acceptInviteHandler(req: Request, res: Response): Promise<void> {
  const parsed = AcceptInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { token, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  let user: typeof usersTable.$inferSelect;
  let teamName: string;

  try {
    const result = await db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(invitesTable)
        .set({ usedAt: now })
        .where(
          and(
            eq(invitesTable.token, token),
            isNull(invitesTable.usedAt),
            gt(invitesTable.expiresAt, now),
          ),
        )
        .returning();

      if (!claimed) {
        throw new Error("INVITE_INVALID");
      }

      const [team] = await tx
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.id, claimed.teamId));

      const [newUser] = await tx
        .insert(usersTable)
        .values({ email, passwordHash, teamId: claimed.teamId, role: "member" })
        .returning();

      return { user: newUser, teamName: team.name };
    });

    user = result.user;
    teamName = result.teamName;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVITE_INVALID") {
      res.status(400).json({ error: "Invite link is invalid or has expired" });
    } else {
      res.status(500).json({ error: "Failed to accept invite" });
    }
    return;
  }

  const authToken = signToken({ userId: user.id, teamId: user.teamId, email: user.email });

  res.status(201).json({
    token: authToken,
    user: {
      id: user.id,
      email: user.email,
      teamId: user.teamId,
      teamName,
      role: user.role,
    },
  });
}

router.get("/auth/invite/preview", async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  const now = new Date();
  const [invite] = await db
    .select()
    .from(invitesTable)
    .where(
      and(
        eq(invitesTable.token, token),
        isNull(invitesTable.usedAt),
        gt(invitesTable.expiresAt, now),
      ),
    );

  if (!invite) {
    res.status(404).json({ error: "Invite link is invalid or has expired" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, invite.teamId));
  const [owner] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(and(eq(usersTable.teamId, invite.teamId), eq(usersTable.role, "owner")));

  res.json({ teamName: team.name, inviterEmail: owner?.email ?? null });
});

router.post("/auth/register", registerHandler);
router.post("/auth/login", loginHandler);
router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/auth/invite/accept", acceptInviteHandler);

router.get("/auth/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId, teamId, email } = req.user!;

  const [userRecord] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));

  res.json({
    id: userId,
    email,
    teamId,
    teamName: team?.name ?? "",
    role: userRecord?.role ?? "member",
  });
});

export default router;
