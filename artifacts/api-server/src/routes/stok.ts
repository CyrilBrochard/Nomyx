import { Router, type IRouter, type Request, type Response } from "express";
import { db, stokSavesTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

interface SavedOutputInput {
  outputId: number;
  outputName: string;
  outputCode: string;
  result: string;
}

function isValidSavedOutput(o: unknown): o is SavedOutputInput {
  if (!o || typeof o !== "object") return false;
  const obj = o as Record<string, unknown>;
  return (
    typeof obj.outputId === "number" &&
    typeof obj.outputName === "string" &&
    typeof obj.outputCode === "string" &&
    typeof obj.result === "string"
  );
}

router.get("/stok", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.user!;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const rows = await db
    .select()
    .from(stokSavesTable)
    .where(
      q
        ? and(
            eq(stokSavesTable.teamId, teamId),
            ilike(stokSavesTable.name, `%${q}%`)
          )
        : eq(stokSavesTable.teamId, teamId)
    )
    .orderBy(stokSavesTable.createdAt);

  res.json(rows.reverse());
});

router.post("/stok", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { teamId, userId } = req.user!;
  const body = req.body as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 200) {
    res.status(400).json({ error: "name is required and must be under 200 characters" });
    return;
  }

  if (!Array.isArray(body.outputs) || body.outputs.length === 0) {
    res.status(400).json({ error: "outputs must be a non-empty array" });
    return;
  }

  if (!body.outputs.every(isValidSavedOutput)) {
    res.status(400).json({ error: "Each output must have outputId, outputName, outputCode, result" });
    return;
  }

  const outputs = body.outputs as SavedOutputInput[];

  const [row] = await db
    .insert(stokSavesTable)
    .values({ teamId, userId, name, outputs })
    .returning();

  res.status(201).json(row);
});

router.delete("/stok/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { teamId } = req.user!;
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const deleted = await db
    .delete(stokSavesTable)
    .where(and(eq(stokSavesTable.id, id), eq(stokSavesTable.teamId, teamId)))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(204).send();
});

export default router;
