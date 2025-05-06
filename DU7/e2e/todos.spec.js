import { test, expect } from "@playwright/test";

// zakladny test na vyskusanie ci playwright funguje
test("základný test - stránka existuje", async ({ page }) => {
  // skusme najprv jednoduchy test
  await page.goto("/");

  // overime ci sme dostali spravnu odpoved (URL je ok)
  await expect(page).toHaveURL("/");

  // pockame chvilu nech sa stranka nacita uplne
  await page.waitForTimeout(3000);

  // skontrolujeme ci sa zakladne HTML prvky zobrazuju
  const body = await page.locator("body");
  expect(await body.isVisible()).toBeTruthy();

  console.log("Základný test úspešný");
});

// test z template TODO appky
test("formulár na hlavnej stránke vytvorí novú úlohu", async ({ page }) => {
  await page.goto("/");

  // vyplnime a odosleme formular
  await page.fill('input[name="title"]', "E2E todo");
  await page.click('button[type="submit"]');

  // overime ci sa uloha zobrazila v zozname
  await expect(page.locator("ul li", { hasText: "E2E todo" })).toBeVisible();
});

/* 
		NOVE TESTY / DU7 vypracovanie:
*/

// NOVY TEST: overenie ci sa hlavna stranka nacita s formularom
test("hlavná stránka obsahuje nadpis a formulár", async ({ page }) => {
  await page.goto("/");

  // overime nadpis stranky
  const heading = page.locator("h1");
  await expect(heading).toHaveText("MY TODO APP");

  // overime ci existuju formularove prvky
  await expect(page.locator('input[name="title"]')).toBeVisible();
  await expect(page.locator('select[name="priority"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

// NOVY TEST: pridanie ulohy s prioritou
test("pridanie novej úlohy s prioritou", async ({ page }) => {
  await page.goto("/");

  // vytvorime random ulohu aby sme nemali konflikty pri opakovani testov
  const taskTitle = `Test úloha ${Date.now()}`;

  // vyplnime a odosleme formular
  await page.fill('input[name="title"]', taskTitle);
  await page.selectOption('select[name="priority"]', "Vysoká");
  await page.click('button[type="submit"]');

  // overime ci sa nova uloha zobrazila v zozname
  const todoItem = page.locator("ul li", { hasText: taskTitle });
  await expect(todoItem).toBeVisible();
  await expect(todoItem).toContainText("[Vysoká]");
});

// NOVY TEST: kontrola ci formular nepusti prazdny vstup
test("formulár nepovolí vytvorenie úlohy s prázdnym názvom", async ({
  page,
}) => {
  // ideme na hlavnu stranku
  await page.goto("/");

  // skusime odoslat formular bez vyplnenia nazvu
  // najprv vymazeme hocijaky existujuci text v poli
  await page.fill('input[name="title"]', "");
  await page.click('button[type="submit"]');

  // kedze pole je required, prehliadac by mal zabranit odoslaniu
  // mozeme overit ze sme stale na hlavnej stranke a ze sa neobjavil prazdny zaznam
  await expect(page).toHaveURL("/");

  // este pre istotu skontrolujeme ci prehliadac ukaze validacnu spravu
  // (toto pouziva nativnu validaciu prehliadaca)
  const isInvalid = await page.evaluate(() => {
    const input = document.querySelector('input[name="title"]');
    return !input.validity.valid;
  });

  expect(isInvalid).toBeTruthy();
});

// NOVY TEST: prepinanie stavu ulohy
test("prepnutie stavu dokončenia úlohy", async ({ page }) => {
  await page.goto("/");

  // najprv vytvorime novu ulohu
  const taskTitle = `Toggle Test ${Date.now()}`;
  await page.fill('input[name="title"]', taskTitle);
  await page.click('button[type="submit"]');

  // najdeme novu ulohu a overime jej pociatocny stav
  const todoItem = page.locator("ul li", { hasText: taskTitle });
  await expect(todoItem).toContainText("nedokončené");

  // prepneme stav ulohy
  await todoItem.locator('a:has-text("nedokončené")').click();

  // overime ze sa stav zmenil
  await expect(todoItem).toContainText("dokončené");

  // prepneme naspat na nedokoncene
  await todoItem.locator('a:has-text("dokončené")').click();

  // overime ze sa stav vratil spat
  await expect(todoItem).toContainText("nedokončené");
});

// NOVY TEST: upravovanie detailov ulohy
test("upravenie detailov existujúcej úlohy", async ({ page }) => {
  await page.goto("/");

  // najprv vytvorime novu ulohu
  const initialTitle = `Edit Test ${Date.now()}`;
  await page.fill('input[name="title"]', initialTitle);
  await page.click('button[type="submit"]');

  // ideme na detailovu stranku kliknutim na nazov ulohy
  await page.click(`a:has-text("${initialTitle}")`);

  // overime ze sme na detailovej stranke
  await expect(page.locator("h2")).toHaveText(initialTitle);

  // upravime ulohu
  const updatedTitle = `Updated ${initialTitle}`;
  await page.fill("input#title", updatedTitle);
  await page.selectOption("select#priority", "Nízka");
  await page.click('button:has-text("Uložiť zmeny")');

  // overime ze zmeny sa prejavili na detailovej stranke
  await expect(page.locator("h2")).toHaveText(updatedTitle);
  await expect(page.locator("p:has-text('Priorita')")).toContainText("Nízka");
});

// NOVY TEST: odstranenie ulohy
test("odstránenie existujúcej úlohy", async ({ page }) => {
  await page.goto("/");

  // vytvorime novu ulohu s unikatnym nazvom
  const taskTitle = `Delete Test ${Date.now()}`;
  await page.fill('input[name="title"]', taskTitle);
  await page.click('button[type="submit"]');

  // overime ze uloha bola vytvorena - pouzijeme presnejsi selektor
  const specificTodoItem = page.locator("ul li", { hasText: taskTitle });
  await expect(specificTodoItem).toBeVisible();

  // oznacime ulohu ako dokoncenu aby bol viditelny odkaz na odstranenie
  await specificTodoItem.locator('a:has-text("nedokončené")').click();

  // klikneme na odkaz na odstranenie
  await specificTodoItem.locator('a:has-text("odstrániť")').click();

  // overime ze uloha bola odstranena
  await expect(page.locator("ul li", { hasText: taskTitle })).toHaveCount(0);
});

// NOVY TEST: handle error stavov a neexistujucich uloh
test("aplikácia správne ošetruje neplatné URL a neexistujúce úlohy", async ({
  page,
}) => {
  // pokus o otvorenie neexistujuceho ID
  const response = await page.goto("/todos/99999");

  // ocakavame error kod 404
  expect(response.status()).toBe(404);
});

// NOVY TEST: real-time updates cez websockets
test("websockets - zmeny v jednom prehliadači sa zobrazia v druhom", async ({
  browser,
}) => {
  // vytvorime dva kontexty prehliadaca
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  // otvorime stranku v oboch kontextoch
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  await page1.goto("/");
  await page2.goto("/");

  // v prvom prehliadaci vytvorime novu ulohu
  const taskTitle = `WebSocket Test ${Date.now()}`;
  await page1.fill('input[name="title"]', taskTitle);
  await page1.click('button[type="submit"]');

  // pockame kratko na websocket synchronizaciu
  await page2.waitForTimeout(1000);

  // overime ze uloha sa objavila v druhom prehliadaci bez refreshu
  await expect(page2.locator("ul li", { hasText: taskTitle })).toBeVisible();

  // v prvom prehliadaci oznacime ulohu ako dokoncenu
  await page1
    .locator("ul li", { hasText: taskTitle })
    .locator('a:has-text("nedokončené")')
    .click();

  // pockame na sync
  await page2.waitForTimeout(1000);

  // overime ze zmena sa prejavila v druhom prehliadaci
  await expect(page2.locator("ul li", { hasText: taskTitle })).toContainText(
    "dokončené"
  );

  // zatvorime kontexty
  await context1.close();
  await context2.close();
});

// NOVY TEST: test reakcie detailu na vymazanie ulohy cez websockets
test("websockets - reakcia detailu na vymazanie úlohy v inom prehliadači", async ({
  browser,
}) => {
  // vytvorime dva kontexty
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // v prvom prehliadaci vytvorime ulohu
  await page1.goto("/");
  const taskTitle = `Delete Redirect Test ${Date.now()}`;
  await page1.fill('input[name="title"]', taskTitle);
  await page1.click('button[type="submit"]');

  // zistime ID ulohy
  const todoLink = page1.locator("ul li a", { hasText: taskTitle }).first();
  const href = await todoLink.getAttribute("href");
  const todoId = href.split("/").pop();

  // v druhom prehliadaci otvorime detail ulohy
  await page2.goto(`/todos/${todoId}`);
  await expect(page2.locator("h2")).toHaveText(taskTitle);

  // v prvom prehliadaci oznacime ulohu ako dokoncenu a vymazeme ju
  await page1
    .locator("ul li", { hasText: taskTitle })
    .locator('a:has-text("nedokončené")')
    .click();
  await page1
    .locator("ul li", { hasText: taskTitle })
    .locator('a:has-text("odstrániť")')
    .click();

  // pockame na websocket notifikaciu
  await page2.waitForTimeout(1000);

  // druhy prehliadac by mal byt presmerovany na hlavnu stranku
  await expect(page2).toHaveURL("/");

  await context1.close();
  await context2.close();
});
