import { sqliteTable, int, text } from "drizzle-orm/sqlite-core";

export const Priority = {
  LOW: "Nízka",
  NORMAL: "Normálna",
  HIGH: "Vysoká",
};

export const todosTable = sqliteTable("todos", {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  done: int({ mode: "boolean" }).notNull(),
  priority: text({ enum: [Priority.LOW, Priority.NORMAL, Priority.HIGH] })
    .notNull()
    .default(Priority.NORMAL),
});