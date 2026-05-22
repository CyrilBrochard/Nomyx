import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const outputsTable = pgTable("outputs", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  format: text("format").notNull(),
  separator: text("separator").notNull().default("_"),
  order: integer("order").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertOutputSchema = createInsertSchema(outputsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOutput = z.infer<typeof insertOutputSchema>;
export type Output = typeof outputsTable.$inferSelect;
