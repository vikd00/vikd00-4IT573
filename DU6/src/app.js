import { Hono } from "hono";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderFile } from "ejs";
import { drizzle } from "drizzle-orm/libsql";
import { todosTable, Priority } from "./schema.js";
import { eq } from "drizzle-orm";
import { createNodeWebSocket } from "@hono/node-ws";

export const db = drizzle({
  connection: process.env.NODE_ENV === "test" ? "file::memory:" : "file:db.sqlite",
  logger: process.env.NODE_ENV !== "test",
});

export const app = new Hono();

export const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

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

  sendTodosToAllConnections();

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

  sendTodosToAllConnections();
  sendTodoDetailToAllConnections(id);

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

  sendTodosToAllConnections();
  sendTodoDetailToAllConnections(id);

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

  sendTodosToAllConnections();
  sendTodoDeletedToAllConnections(id);

  return c.redirect("/");
});

/** @type{Set<import("hono/ws").WSContext<WebSocket>>} */
const connections = new Set();

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    return {
      onOpen: (ev, ws) => {
        connections.add(ws);
        console.log("WebSocket spojenie otvorené");
      },
      onClose: (evt, ws) => {
        connections.delete(ws);
        console.log("WebSocket spojenie zatvorené");
      },
      onMessage: (evt, ws) => {
        console.log("WebSocket správa", evt.data);
      },
    };
  })
);

export const getTodoById = async (id) => {
  const todo = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, id))
    .get();

  return todo;
};

const sendTodosToAllConnections = async () => {
  const todos = await db.select().from(todosTable).all();

  const rendered = await renderFile("views/_todos.html", {
    todos,
    priorities: Priority,
  });

  for (const connection of connections.values()) {
    const data = JSON.stringify({
      type: "todos",
      html: rendered,
    });

    connection.send(data);
  }
};

const sendTodoDetailToAllConnections = async (id) => {
  const todo = await getTodoById(id);

  const rendered = await renderFile("views/_todo.html", {
    todo,
    priorities: Priority,
  });

  for (const connection of connections.values()) {
    const data = JSON.stringify({
      type: "todo",
      id,
      html: rendered,
    });

    connection.send(data);
  }
};

const sendTodoDeletedToAllConnections = async (id) => {
  for (const connection of connections.values()) {
    const data = JSON.stringify({
      type: "todoDeleted",
      id,
    });

    connection.send(data);
  }
};