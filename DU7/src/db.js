import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { todosTable } from "./schema.js";
import { eq } from "drizzle-orm";

// Inicializácia databázového spojenia
export const db = drizzle({
  connection: process.env.NODE_ENV === "test" ? "file::memory:" : "file:db.sqlite",
  logger: process.env.NODE_ENV !== "test",
});

// Funkcia na spustenie migrácií
export async function runMigrations() {
  await migrate(db, { migrationsFolder: "drizzle" });
}

await migrate(db, { migrationsFolder: "drizzle" })

// Získanie todo podľa ID
export async function getTodoById(id) {
  return await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .get();
}

// Získanie všetkých todos
export async function getAllTodos() {
  return await db.select().from(todosTable).all();
}

// Vytvorenie nového todo
export async function createTodo({ title, priority, done = false }) {
  const result = await db.insert(todosTable).values({
    title,
    done,
    priority,
  });
  
  return getTodoById(result.lastInsertRowid);
}

// Aktualizácia todo
export async function updateTodo(id, updates) {
  await db
    .update(todosTable)
    .set(updates)
    .where(eq(todosTable.id, id));
    
  return getTodoById(id);
}

// Prepnutie stavu dokončenia todo
export async function toggleTodoDone(id) {
  const todo = await getTodoById(id);
  if (!todo) return null;
  
  return await updateTodo(id, { done: !todo.done });
}

// Odstránenie todo
export async function deleteTodo(id) {
  const todo = await getTodoById(id);
  if (!todo) return null;
  
  await db.delete(todosTable).where(eq(todosTable.id, id));
  return todo;
}