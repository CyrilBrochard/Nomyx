import { Router, type IRouter } from "express";
import { db, dimensionsTable, dimensionValuesTable, outputsTable, teamsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { ImportConfigBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/config/export", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));

  const dims = await db
    .select()
    .from(dimensionsTable)
    .where(eq(dimensionsTable.teamId, teamId))
    .orderBy(asc(dimensionsTable.order));

  const dimensionsWithValues = await Promise.all(
    dims.map(async (dim) => {
      const values = await db
        .select()
        .from(dimensionValuesTable)
        .where(eq(dimensionValuesTable.dimensionId, dim.id))
        .orderBy(asc(dimensionValuesTable.order));
      return {
        name: dim.name,
        code: dim.code,
        order: dim.order,
        enabled: dim.enabled,
        values: values.map((v) => ({
          label: v.label,
          shortCode: v.shortCode,
          order: v.order,
          enabled: v.enabled,
        })),
      };
    })
  );

  const outputs = await db
    .select()
    .from(outputsTable)
    .where(eq(outputsTable.teamId, teamId))
    .orderBy(asc(outputsTable.id));

  res.json({
    teamName: team?.name ?? "",
    dimensions: dimensionsWithValues,
    outputs: outputs.map((o) => ({
      name: o.name,
      code: o.code,
      format: o.format,
      separator: o.separator,
      enabled: o.enabled,
    })),
  });
});

router.post("/config/import", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;

  const parsed = ImportConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { dimensions, outputs } = parsed.data;

  let importedDimensions = 0;
  let importedOutputs = 0;

  for (const dimData of dimensions) {
    const [dim] = await db
      .insert(dimensionsTable)
      .values({
        teamId,
        name: dimData.name,
        code: dimData.code,
        order: dimData.order ?? 0,
        enabled: dimData.enabled ?? true,
      })
      .returning();

    importedDimensions++;

    for (const valData of dimData.values) {
      await db.insert(dimensionValuesTable).values({
        dimensionId: dim.id,
        label: valData.label,
        shortCode: valData.shortCode,
        order: valData.order ?? 0,
        enabled: valData.enabled ?? true,
      });
    }
  }

  for (const outData of outputs) {
    await db
      .insert(outputsTable)
      .values({
        teamId,
        name: outData.name,
        code: outData.code,
        format: outData.format,
        separator: outData.separator,
        enabled: outData.enabled ?? true,
      });
    importedOutputs++;
  }

  res.json({ importedDimensions, importedOutputs });
});

export default router;
