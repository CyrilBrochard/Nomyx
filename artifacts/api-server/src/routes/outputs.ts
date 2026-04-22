import { Router, type IRouter } from "express";
import { db, outputsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateOutputBody,
  UpdateOutputBody,
  UpdateOutputParams,
  DeleteOutputParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/outputs", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const outputs = await db
    .select()
    .from(outputsTable)
    .where(eq(outputsTable.teamId, teamId))
    .orderBy(asc(outputsTable.id));

  res.json(outputs);
});

router.post("/outputs", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const parsed = CreateOutputBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [output] = await db
    .insert(outputsTable)
    .values({
      teamId,
      name: parsed.data.name,
      code: parsed.data.code,
      format: parsed.data.format,
      separator: parsed.data.separator,
      enabled: parsed.data.enabled ?? true,
    })
    .returning();

  res.status(201).json(output);
});

router.put("/outputs/:id", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = UpdateOutputParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOutputBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [output] = await db
    .update(outputsTable)
    .set(parsed.data)
    .where(and(eq(outputsTable.id, params.data.id), eq(outputsTable.teamId, teamId)))
    .returning();

  if (!output) {
    res.status(404).json({ error: "Output not found" });
    return;
  }

  res.json(output);
});

router.delete("/outputs/:id", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = DeleteOutputParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [output] = await db
    .delete(outputsTable)
    .where(and(eq(outputsTable.id, params.data.id), eq(outputsTable.teamId, teamId)))
    .returning();

  if (!output) {
    res.status(404).json({ error: "Output not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
