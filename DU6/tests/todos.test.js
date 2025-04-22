import test from "ava";
import {
  db,
  runMigrations,
  getTodoById,
  getAllTodos,
  createTodo,
  updateTodo,
  toggleTodoDone,
  deleteTodo,
} from "../src/db.js";
import { todosTable, Priority } from "../src/schema.js";

test.before("run migrations", async () => {
  // Spustí migrácie pred všetkými testami
  await runMigrations();
});

test.beforeEach(async () => {
  // Vyčisti tabuľku pred každým testom
  await db.delete(todosTable);
});

test.serial("getTodoById returns todo", async (t) => {
  const result = await db.insert(todosTable).values({ 
    title: "testovacia úloha",
    done: false,
    priority: Priority.NORMAL,
  });

  const id = Number(result.lastInsertRowid);
  const todo = await getTodoById(id);

  t.is(todo.title, "testovacia úloha");
});

test.serial("getAllTodos returns all todos", async (t) => {
  await db
    .insert(todosTable)
    .values({ title: "úloha 1", done: false, priority: Priority.NORMAL });

  await db
    .insert(todosTable)
    .values({ title: "úloha 2", done: true, priority: Priority.HIGH });

  const todos = await getAllTodos(); // Získame všetky todos (mali by byť 2)

  t.is(todos.length, 2);

  const sortedTodos = [...todos].sort((a, b) => a.id - b.id);
  t.is(sortedTodos[0].title, "úloha 1");
  t.is(sortedTodos[1].title, "úloha 2");
});

test.serial("createTodo creates new todo", async (t) => {
  const newTodo = await createTodo({
    title: "nová úloha",
    priority: Priority.LOW,
  });

  t.is(newTodo.title, "nová úloha");
  t.is(newTodo.priority, Priority.LOW);
  t.is(newTodo.done, false);

  const todoFromDb = await getTodoById(newTodo.id);
  t.truthy(todoFromDb);
  t.is(todoFromDb.title, "nová úloha");
});

test.serial("updateTodo updates a todo", async (t) => {
  const result = await db.insert(todosTable).values({
    title: "pôvodný názov",
    done: false,
    priority: Priority.NORMAL,
  });

  const id = Number(result.lastInsertRowid);

  const updatedTodo = await updateTodo(id, {
    title: "upravený názov",
    priority: Priority.HIGH,
  });

  t.is(updatedTodo.title, "upravený názov");
  t.is(updatedTodo.priority, Priority.HIGH);

  const todoFromDb = await getTodoById(id);
  t.is(todoFromDb.title, "upravený názov");
});

test.serial("toggleTodoDone toggles done status", async (t) => {
  const result = await db
    .insert(todosTable)
    .values({ title: "úloha", done: false, priority: Priority.NORMAL });

  const id = Number(result.lastInsertRowid);

  let updatedTodo = await toggleTodoDone(id);
  t.true(updatedTodo.done);

  updatedTodo = await toggleTodoDone(id);
  t.false(updatedTodo.done);
});

test.serial("deleteTodo removes a todo", async (t) => {
  const result = await db.insert(todosTable).values({
    title: "úloha na vymazanie",
    done: false,
    priority: Priority.NORMAL,
  });

  const id = Number(result.lastInsertRowid);

  const deletedTodo = await deleteTodo(id);
  t.is(deletedTodo.title, "úloha na vymazanie");

  const todos = await getAllTodos();
  t.is(todos.length, 0);

  const todoById = await getTodoById(id); // Skúsime ho získať znova podľa ID
  t.is(todoById, undefined);
});

test.serial("functions handle non-existent todos gracefully", async (t) => {
  const nonExistentId = 999;

  const todoById = await getTodoById(nonExistentId);
  t.is(todoById, undefined);

  const toggled = await toggleTodoDone(nonExistentId);
  t.is(toggled, null);

  const deleted = await deleteTodo(nonExistentId);
  t.is(deleted, null);
});