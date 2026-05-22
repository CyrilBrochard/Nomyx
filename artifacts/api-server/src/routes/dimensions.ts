import { Router, type IRouter } from "express";
import { db, dimensionsTable, dimensionValuesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  CreateDimensionBody,
  UpdateDimensionBody,
  UpdateDimensionParams,
  DeleteDimensionParams,
  DuplicateDimensionParams,
  CreateDimensionValueParams,
  CreateDimensionValueBody,
  UpdateDimensionValueBody,
  UpdateDimensionValueParams,
  DeleteDimensionValueParams,
  ListDimensionValuesParams,
  ReorderDimensionsBody,
  ReorderDimensionValuesParams,
  ReorderDimensionValuesBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getDimensionsWithValues(teamId: number) {
  const dims = await db
    .select()
    .from(dimensionsTable)
    .where(eq(dimensionsTable.teamId, teamId))
    .orderBy(asc(dimensionsTable.order), asc(dimensionsTable.id));

  const result = await Promise.all(
    dims.map(async (dim) => {
      const values = await db
        .select()
        .from(dimensionValuesTable)
        .where(eq(dimensionValuesTable.dimensionId, dim.id))
        .orderBy(asc(dimensionValuesTable.order));
      return { ...dim, values };
    })
  );

  return result;
}

router.patch("/dimensions/reorder", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const parsed = ReorderDimensionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { orderedIds } = parsed.data;

  const existing = await db
    .select({ id: dimensionsTable.id })
    .from(dimensionsTable)
    .where(eq(dimensionsTable.teamId, teamId));

  const existingIdSet = new Set(existing.map((d) => d.id));
  const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
  const mismatch =
    hasDuplicates ||
    orderedIds.length !== existingIdSet.size ||
    orderedIds.some((id) => !existingIdSet.has(id));

  if (mismatch) {
    res.status(400).json({ error: "orderedIds must be an exact set of the team's dimension IDs" });
    return;
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(dimensionsTable)
          .set({ order: index })
          .where(and(eq(dimensionsTable.id, id), eq(dimensionsTable.teamId, teamId)))
      )
    );
  });

  res.sendStatus(204);
});

router.get("/dimensions", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const result = await getDimensionsWithValues(teamId);
  res.json(result);
});

router.post("/dimensions", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const parsed = CreateDimensionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(dimensionsTable).where(eq(dimensionsTable.teamId, teamId));
  const maxOrder = existing.reduce((max, d) => Math.max(max, d.order), -1);

  const [dim] = await db
    .insert(dimensionsTable)
    .values({
      teamId,
      name: parsed.data.name,
      code: parsed.data.code,
      order: parsed.data.order ?? maxOrder + 1,
      enabled: parsed.data.enabled ?? true,
    })
    .returning();

  res.status(201).json(dim);
});

router.put("/dimensions/:id", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = UpdateDimensionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDimensionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [dim] = await db
    .update(dimensionsTable)
    .set(parsed.data)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)))
    .returning();

  if (!dim) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  res.json(dim);
});

router.delete("/dimensions/:id", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = DeleteDimensionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dim] = await db
    .delete(dimensionsTable)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)))
    .returning();

  if (!dim) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/dimensions/:id/duplicate", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = DuplicateDimensionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [original] = await db
    .select()
    .from(dimensionsTable)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)));

  if (!original) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  const existing = await db.select().from(dimensionsTable).where(eq(dimensionsTable.teamId, teamId));
  const maxOrder = existing.reduce((max, d) => Math.max(max, d.order), -1);

  const [newDim] = await db
    .insert(dimensionsTable)
    .values({
      teamId,
      name: `${original.name} (copy)`,
      code: `${original.code}_COPY`,
      order: maxOrder + 1,
      enabled: original.enabled,
    })
    .returning();

  const originalValues = await db
    .select()
    .from(dimensionValuesTable)
    .where(eq(dimensionValuesTable.dimensionId, original.id))
    .orderBy(asc(dimensionValuesTable.order));

  const newValues = originalValues.length > 0
    ? await db
        .insert(dimensionValuesTable)
        .values(originalValues.map((v) => ({
          dimensionId: newDim.id,
          label: v.label,
          shortCode: v.shortCode,
          order: v.order,
          enabled: v.enabled,
        })))
        .returning()
    : [];

  res.status(201).json({ ...newDim, values: newValues });
});

router.patch("/dimensions/:id/values/reorder", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = ReorderDimensionValuesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dim] = await db
    .select()
    .from(dimensionsTable)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)));

  if (!dim) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  const parsed = ReorderDimensionValuesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { orderedIds } = parsed.data;

  const existing = await db
    .select({ id: dimensionValuesTable.id })
    .from(dimensionValuesTable)
    .where(eq(dimensionValuesTable.dimensionId, params.data.id));

  const existingIdSet = new Set(existing.map((v) => v.id));
  const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
  const mismatch =
    hasDuplicates ||
    orderedIds.length !== existingIdSet.size ||
    orderedIds.some((id) => !existingIdSet.has(id));

  if (mismatch) {
    res.status(400).json({ error: "orderedIds must be an exact set of the dimension's value IDs" });
    return;
  }

  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(dimensionValuesTable)
          .set({ order: index })
          .where(and(eq(dimensionValuesTable.id, id), eq(dimensionValuesTable.dimensionId, params.data.id)))
      )
    );
  });

  res.sendStatus(204);
});

router.get("/dimensions/:id/values", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = ListDimensionValuesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dim] = await db
    .select()
    .from(dimensionsTable)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)));

  if (!dim) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  const values = await db
    .select()
    .from(dimensionValuesTable)
    .where(eq(dimensionValuesTable.dimensionId, params.data.id))
    .orderBy(asc(dimensionValuesTable.order));

  res.json(values);
});

router.post("/dimensions/:id/values", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = CreateDimensionValueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dim] = await db
    .select()
    .from(dimensionsTable)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)));

  if (!dim) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  const parsed = CreateDimensionValueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(dimensionValuesTable)
    .where(eq(dimensionValuesTable.dimensionId, params.data.id));
  const maxOrder = existing.reduce((max, v) => Math.max(max, v.order), -1);

  const [value] = await db
    .insert(dimensionValuesTable)
    .values({
      dimensionId: params.data.id,
      label: parsed.data.label,
      shortCode: parsed.data.shortCode,
      order: parsed.data.order ?? maxOrder + 1,
      enabled: parsed.data.enabled ?? true,
    })
    .returning();

  res.status(201).json(value);
});

router.put("/dimensions/:id/values/:valueId", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = UpdateDimensionValueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dim] = await db
    .select()
    .from(dimensionsTable)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)));

  if (!dim) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  const parsed = UpdateDimensionValueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [value] = await db
    .update(dimensionValuesTable)
    .set(parsed.data)
    .where(
      and(
        eq(dimensionValuesTable.id, params.data.valueId),
        eq(dimensionValuesTable.dimensionId, params.data.id)
      )
    )
    .returning();

  if (!value) {
    res.status(404).json({ error: "Value not found" });
    return;
  }

  res.json(value);
});

router.delete("/dimensions/:id/values/:valueId", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;
  const params = DeleteDimensionValueParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dim] = await db
    .select()
    .from(dimensionsTable)
    .where(and(eq(dimensionsTable.id, params.data.id), eq(dimensionsTable.teamId, teamId)));

  if (!dim) {
    res.status(404).json({ error: "Dimension not found" });
    return;
  }

  const [value] = await db
    .delete(dimensionValuesTable)
    .where(
      and(
        eq(dimensionValuesTable.id, params.data.valueId),
        eq(dimensionValuesTable.dimensionId, params.data.id)
      )
    )
    .returning();

  if (!value) {
    res.status(404).json({ error: "Value not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
