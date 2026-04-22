import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
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
  const [user] = await db.insert(usersTable).values({ email, passwordHash, teamId: team.id }).returning();

  const token = signToken({ userId: user.id, teamId: user.teamId, email: user.email });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      teamId: user.teamId,
      teamName: team.name,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
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
    },
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { userId, teamId, email } = req.user!;

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));

  res.json({
    id: userId,
    email,
    teamId,
    teamName: team?.name ?? "",
  });
});

export default router;
