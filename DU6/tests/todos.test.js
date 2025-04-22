import test from "ava";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, getTodoById } from "../src/app.js";
import { todosTable } from "../src/schema.js";

test.before("run migrations", async () => {
  await migrate(db, { migrationsFolder: "drizzle" });
});

test("getTodoById returns todo", async (t) => {
  await db
    .insert(todosTable)
    .values({ id: 1, title: "testovacia úloha", done: false });

  const todo = await getTodoById(1);

  t.is(todo.title, "testovacia úloha");
});