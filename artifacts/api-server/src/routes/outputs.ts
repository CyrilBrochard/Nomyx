import { Router, type IRouter } from "express";
import { db, outputsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateOutputBody,
  UpdateOutputBody,
  UpdateOutputParams,
  DeleteOutputParams,
  ReorderOutputsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.patch("/outputs/reorder", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const parsed = ReorderOutputsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { orderedIds } = parsed.data;

  const existing = await db
    .select({ id: outputsTable.id })
    .from(outputsTable)
    .where(eq(outputsTable.teamId, teamId));

  const existingIdSet = new Set(existing.map((o) => o.id));
  const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
  const mismatch =
    hasDuplicates ||
    orderedIds.length !== existingIdSet.size ||
    orderedIds.some((id) => !existingIdSet.has(id));

  if (mismatch) {
    res.status(400).json({ error: "orderedIds must be an exact set of the team's output IDs" });
    return;
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(outputsTable)
          .set({ order: index })
          .where(and(eq(outputsTable.id, id), eq(outputsTable.teamId, teamId)))
      )
    );
  });

  res.sendStatus(204);
});

router.get("/outputs", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const outputs = await db
    .select()
    .from(outputsTable)
    .where(eq(outputsTable.teamId, teamId))
    .orderBy(asc(outputsTable.order), asc(outputsTable.id));

  res.json(outputs);
});

router.post("/outputs", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const parsed = CreateOutputBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(outputsTable).where(eq(outputsTable.teamId, teamId));
  const maxOrder = existing.reduce((max, o) => Math.max(max, o.order), -1);

  const [output] = await db
    .insert(outputsTable)
    .values({
      teamId,
      name: parsed.data.name,
      code: parsed.data.code,
      format: parsed.data.format,
      separator: parsed.data.separator,
      order: maxOrder + 1,
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
