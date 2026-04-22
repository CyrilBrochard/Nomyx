import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dimensionsTable } from "./dimensions";

export const dimensionValuesTable = pgTable("dimension_values", {
  id: serial("id").primaryKey(),
  dimensionId: integer("dimension_id").notNull().references(() => dimensionsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  shortCode: text("short_code").notNull(),
  order: integer("order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDimensionValueSchema = createInsertSchema(dimensionValuesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDimensionValue = z.infer<typeof insertDimensionValueSchema>;
export type DimensionValue = typeof dimensionValuesTable.$inferSelect;
