import test from "ava"
import {
  createTodo,
  db,
  deleteTodo,
  getAllTodos,
  getTodoById,
  runMigrations,
  updateTodo,
} from "../src/db.js"
import { todosTable, Priority } from "../src/schema.js"

test.before("run migrations", async () => {
	// Spustí migrácie pred všetkými testami
	await runMigrations();
});

// Pred každým testom vymaž všetky záznamy v tabuľke todos
test.beforeEach("vymazanie todos pred testom", async () => {
  await db.delete(todosTable)
})

// Test na získanie todo záznamu podľa ID
test.serial("getTodoById vráti todo podľa ID", async (t) => {
  // Vytvorenie testovacieho záznamu
  await db
    .insert(todosTable)
    .values({ id: 1, title: "testovacia úloha", done: false, priority: Priority.NORMAL })

  // Získanie záznamu podľa ID
  const todo = await getTodoById(1)

  // Overenie výsledku
  t.is(todo.title, "testovacia úloha")
  t.is(todo.priority, Priority.NORMAL)
})

// Test na získanie všetkých todo záznamov
test.serial("getAllTodos vráti všetky todo záznamy", async (t) => {
  // Vytvorenie testovacích záznamov
  await db.insert(todosTable).values([
    { title: "úloha 1", done: false, priority: Priority.LOW },
    { title: "úloha 2", done: false, priority: Priority.NORMAL },
    { title: "úloha 3", done: false, priority: Priority.HIGH },
  ])

  // Získanie všetkých záznamov
  const todos = await getAllTodos()

  // Overenie počtu záznamov
  t.is(todos.length, 3)
  
  // Overenie, že záznamy obsahujú očakávané priority
  const priorities = todos.map(todo => todo.priority).sort()
  t.deepEqual(
    priorities, 
    [Priority.HIGH, Priority.LOW, Priority.NORMAL].sort()
  )
})

// Test na vytvorenie nového todo záznamu
test.serial("createTodo vytvorí nový todo záznam", async (t) => {
  // Vytvorenie nového todo záznamu
  const newTodo = await createTodo({ 
    title: "nová úloha", 
    done: false,
    priority: Priority.HIGH 
  })

  // Overenie, že záznam bol vytvorený správne
  t.is(newTodo.title, "nová úloha")
  t.is(newTodo.done, false)
  t.is(newTodo.priority, Priority.HIGH)

  // Overenie, že záznam existuje v databáze
  const todos = await getAllTodos()
  t.is(todos.length, 1)
  t.is(todos[0].title, "nová úloha")
})

// Test na aktualizáciu existujúceho todo záznamu
test.serial("updateTodo aktualizuje todo záznam", async (t) => {
  // Vytvorenie testovacieho záznamu
  await createTodo({ title: "pôvodná úloha", done: false, priority: Priority.NORMAL })
  
  // Získanie všetkých záznamov a ich ID
  const todos = await getAllTodos()
  const id = todos[0].id

  // Aktualizácia záznamu
  await updateTodo(id, { 
    title: "aktualizovaná úloha", 
    priority: Priority.LOW,
    done: true 
  })

  // Overenie, že záznam bol aktualizovaný
  const updatedRecord = await getTodoById(id)
  t.is(updatedRecord.title, "aktualizovaná úloha")
  t.is(updatedRecord.priority, Priority.LOW)
  t.is(updatedRecord.done, true)
})

// Test na vymazanie todo záznamu
test.serial("deleteTodo vymaže todo záznam", async (t) => {
  // Vytvorenie testovacieho záznamu
  await createTodo({ title: "úloha na vymazanie", done: false, priority: Priority.NORMAL })
  
  // Získanie ID vytvoreného záznamu
  const todos = await getAllTodos()
  const id = todos[0].id

  // Vymazanie záznamu
  await deleteTodo(id)

  // Overenie, že záznam bol vymazaný
  const newTodos = await getAllTodos()
  t.is(newTodos.length, 0)
  
  // Overenie, že záznam nie je možné získať podľa ID
  const deletedRecord = await getTodoById(id)
  t.is(deletedRecord, undefined)
})

// Test na správne spracovanie neexistujúcich záznamov
test.serial("funkcie správne spracujú neexistujúce záznamy", async (t) => {
  // Testovanie ID, ktoré neexistuje
  const nonExistentId = 999
  
  // Pokus o získanie neexistujúceho záznamu
  const nonExistentRecord = await getTodoById(nonExistentId)
  t.is(nonExistentRecord, undefined)
  
  // Pokus o aktualizáciu neexistujúceho záznamu
  const updatedNonExistentRecord = await updateTodo(nonExistentId, { title: "nový názov" })
  t.is(updatedNonExistentRecord, undefined)
  
  // Pokus o vymazanie neexistujúceho záznamu
  const deletedNonExistentRecord = await deleteTodo(nonExistentId)
  t.is(deletedNonExistentRecord, null)
})

// Test na správnu validáciu priority
test.serial("priority sú správne validované a uložené", async (t) => {
  // Vytvorenie záznamov s rôznymi prioritami
  const lowTodo = await createTodo({ title: "nízka priorita", priority: Priority.LOW })
  const normalTodo = await createTodo({ title: "normálna priorita", priority: Priority.NORMAL })
  const highTodo = await createTodo({ title: "vysoká priorita", priority: Priority.HIGH })
  
  // Vytvorenie záznamu s predvolenou prioritou (bez explicitného nastavenia)
  const defaultTodo = await createTodo({ title: "predvolená priorita" })
  
  // Overenie, že priority boli správne nastavené
  t.is(lowTodo.priority, Priority.LOW)
  t.is(normalTodo.priority, Priority.NORMAL)
  t.is(highTodo.priority, Priority.HIGH)
  t.is(defaultTodo.priority, Priority.NORMAL) // Predvolená hodnota by mala byť "normal"
  
  // Aktualizácia priority existujúceho záznamu
  await updateTodo(lowTodo.id, { priority: Priority.HIGH })
  const updatedTodo = await getTodoById(lowTodo.id)
  t.is(updatedTodo.priority, Priority.HIGH)
})