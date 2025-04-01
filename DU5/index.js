import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderFile } from "ejs";
import { drizzle } from "drizzle-orm/libsql";
import { todosTable, Priority } from "./src/schema.js";
import { eq } from "drizzle-orm";

const db = drizzle({
  connection: "file:db.sqlite",
  logger: true,
});

const app = new Hono();

app.use(logger());
app.use(serveStatic({ root: "public" }));

// Endpoint pre zobrazenie hlavnej stránky
app.get("/", async (c) => {
  const todos = await db.select().from(todosTable).all();

  const index = await renderFile("views/index.html", {
    title: "My todo app",
    todos,
    priorities: Priority,
  });

  return c.html(index);
});

// Endpoint pre vytvorenie novej todo úlohy
app.post("/todos", async (c) => {
  const form = await c.req.formData();

  await db.insert(todosTable).values({
    title: form.get("title"),
    done: false,
    priority: form.get("priority") || Priority.NORMAL,
  });

  return c.redirect("/");
});

// Endpoint pre zobrazenie detailu todo úlohy
app.get("/todos/:id", async (c) => {
  const id = Number(c.req.param("id"));

  const todo = await getTodoById(id);

  if (!todo) return c.notFound();

  const detail = await renderFile("views/detail.html", {
    todo,
    priorities: Priority,
  });

  return c.html(detail);
});

// Endpoint pre aktualizáciu názvu a priority todo úlohy
app.post("/todos/:id/update", async (c) => {
  const id = Number(c.req.param("id"));

  const todo = await getTodoById(id);

  if (!todo) return c.notFound();

  const form = await c.req.formData();

  await db
    .update(todosTable)
    .set({
      title: form.get("title"),
      priority: form.get("priority") || todo.priority,
    })
    .where(eq(todosTable.id, id));

  return c.redirect(c.req.header("Referer"));
});

// Endpoint pre zmenu stavu todo úlohy
app.get("/todos/:id/toggle", async (c) => {
  const id = Number(c.req.param("id"));

  const todo = await getTodoById(id);

  if (!todo) return c.notFound();

  await db
    .update(todosTable)
    .set({ done: !todo.done })
    .where(eq(todosTable.id, id));

  // Presmerovanie späť na detailovú stránku, ak z nej bolo presmerované
  const referer = c.req.header("Referer") || "/";
  if (referer.includes(`/todos/${id}`)) {
    return c.redirect(`/todos/${id}`);
  }

  return c.redirect("/");
});

// Endpoint pre odstránenie todo úlohy
app.get("/todos/:id/remove", async (c) => {
  const id = Number(c.req.param("id"));

  const todo = await getTodoById(id);

  if (!todo) return c.notFound();

  await db.delete(todosTable).where(eq(todosTable.id, id));

  // Ak bolo odstránenie vykonané z detailovej stránky, presmerujeme na hlavnú stránku
  return c.redirect("/");
});

serve(app, (info) => {
  console.log("App started on http://localhost:" + info.port);
});

const getTodoById = async (id) => {
  const todo = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .get();

  return todo;
};
