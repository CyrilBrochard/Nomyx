import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";
import { usersTable } from "./users";

export interface StokSavedOutput {
  outputId: number;
  outputName: string;
  outputCode: string;
  result: string;
}

export const stokSavesTable = pgTable("stok_saves", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  outputs: jsonb("outputs").notNull().$type<StokSavedOutput[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StokSave = typeof stokSavesTable.$inferSelect;
