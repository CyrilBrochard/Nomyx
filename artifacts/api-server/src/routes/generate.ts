import { Router, type IRouter } from "express";
import { db, outputsTable, dimensionsTable, dimensionValuesTable, teamsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { GenerateNamesBody } from "@workspace/api-zod";

const router: IRouter = Router();

function generateFromFormat(
  format: string,
  codeToValue: Map<string, string>,
  separator: string
): string {
  type Segment = { type: "token"; value: string } | { type: "literal"; value: string };
  const segments: Segment[] = [];
  const tokenRegex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(format)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "literal", value: format.slice(lastIndex, match.index) });
    }
    const code = match[1];
    segments.push({ type: "token", value: codeToValue.get(code) ?? `[${code}]` });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < format.length) {
    segments.push({ type: "literal", value: format.slice(lastIndex) });
  }

  let result = "";
  let prevWasToken = false;
  for (const seg of segments) {
    if (seg.type === "token") {
      if (prevWasToken && separator) {
        result += separator;
      }
      result += seg.value;
      prevWasToken = true;
    } else {
      result += seg.value;
      prevWasToken = false;
    }
  }
  return result;
}

router.post("/generate", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;

  const parsed = GenerateNamesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { selections } = parsed.data;

  const dims = await db
    .select()
    .from(dimensionsTable)
    .where(and(eq(dimensionsTable.teamId, teamId), eq(dimensionsTable.enabled, true)))
    .orderBy(asc(dimensionsTable.order));

  const codeToValue = new Map<string, string>();

  for (const dim of dims) {
    const selectionKey = String(dim.id);
    const selectedValueId = (selections as Record<string, number>)[selectionKey];
    if (selectedValueId != null) {
      const [val] = await db
        .select()
        .from(dimensionValuesTable)
        .where(
          and(
            eq(dimensionValuesTable.id, selectedValueId),
            eq(dimensionValuesTable.dimensionId, dim.id)
          )
        );
      if (val && val.enabled) {
        codeToValue.set(dim.code, val.shortCode);
      }
    }
  }

  const outputs = await db
    .select()
    .from(outputsTable)
    .where(and(eq(outputsTable.teamId, teamId), eq(outputsTable.enabled, true)))
    .orderBy(asc(outputsTable.id));

  const results = outputs.map((output) => {
    const result = generateFromFormat(output.format, codeToValue, output.separator);
    return {
      outputId: output.id,
      outputName: output.name,
      outputCode: output.code,
      result,
    };
  });

  res.json({ outputs: results });
});

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const teamId = req.user!.teamId;

  const dims = await db
    .select()
    .from(dimensionsTable)
    .where(eq(dimensionsTable.teamId, teamId));

  const outputs = await db
    .select()
    .from(outputsTable)
    .where(eq(outputsTable.teamId, teamId));

  let totalValues = 0;
  for (const dim of dims) {
    const values = await db
      .select()
      .from(dimensionValuesTable)
      .where(eq(dimensionValuesTable.dimensionId, dim.id));
    totalValues += values.length;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));

  res.json({
    totalDimensions: dims.length,
    enabledDimensions: dims.filter((d) => d.enabled).length,
    totalOutputs: outputs.length,
    enabledOutputs: outputs.filter((o) => o.enabled).length,
    totalValues,
    teamName: team?.name ?? "",
  });
});

export default router;
