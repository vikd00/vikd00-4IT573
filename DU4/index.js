import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { renderFile } from "ejs";

const todos = [
  {
    id: 1,
    title: "Nakúpiť potraviny",
    done: false,
  },
  {
    id: 2,
    title: "Zavolať kamarátovi",
    done: true,
  },
  {
    id: 3,
    title: "Dokončiť prezentáciu",
    done: false,
  },
  {
    id: 4,
    title: "Zacvičiť si",
    done: true,
  },
  {
    id: 5,
    title: "Prečítať knihu",
    done: false,
  },
];

const app = new Hono();

app.use(logger());
app.use(serveStatic({ root: "public" }));

app.get("/", async (c) => {
  const rendered = await renderFile("views/index.html", {
    title: "Moja TODO Aplikácia",
    todos,
  });

  return c.html(rendered);
});

// Endpoint pre zobrazenie detailu todo úlohy
app.get("/todo/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const todo = todos.find((todo) => todo.id === id);

  if (!todo) return c.notFound();

  const rendered = await renderFile("views/detail.html", {
    todo,
  });

  return c.html(rendered);
});

app.post("/todos", async (c) => {
  const form = await c.req.formData();

  todos.push({
    id: todos.length + 1,
    title: form.get("title"),
    done: false,
  });

  return c.redirect("/");
});

// Endpoint pre aktualizáciu názvu todo úlohy
app.post("/todos/:id/update", async (c) => {
  const id = Number(c.req.param("id"));
  const form = await c.req.formData();
  const todo = todos.find((todo) => todo.id === id);

  if (!todo) return c.notFound();

  todo.title = form.get("title");

  return c.redirect(`/todo/${id}`);
});

app.get("/todos/:id/toggle", async (c) => {
  const id = Number(c.req.param("id"));

  const todo = todos.find((todo) => todo.id === id);

  if (!todo) return c.notFound();

  todo.done = !todo.done;

  // Presmerovanie späť na detailovú stránku, ak z nej bolo presmerované
  const referer = c.req.header("Referer") || "/";
  if (referer.includes(`/todo/${id}`)) {
    return c.redirect(`/todo/${id}`);
  }

  return c.redirect("/");
});

app.get("/todos/:id/remove", async (c) => {
  const id = Number(c.req.param("id"));

  const index = todos.findIndex((todo) => todo.id === id);

  if (index === -1) return c.notFound();

  todos.splice(index, 1);

  // Ak bolo odstránenie vykonané z detailovej stránky, presmerujeme na hlavnú stránku
  return c.redirect("/");
});

serve(app, (info) => {
  console.log(
    "App started on http://localhost:" + info.port
  )
})