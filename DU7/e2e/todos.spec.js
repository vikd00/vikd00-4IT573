import { test, expect } from "@playwright/test";

test("základný test - stránka existuje", async ({ page }) => {
  // Najskôr vyskúšame jednoduchý test
  await page.goto("/");
  
  // Overíme, či sme dostali odpoveď (URL je správna)
  await expect(page).toHaveURL("/");
  
  // Počkáme chvíľu, či sa stránka načíta úplne
  await page.waitForTimeout(3000);
  
  // Skontrolujeme, či sa zobrazujú základné HTML prvky
  const body = await page.locator("body");
  expect(await body.isVisible()).toBeTruthy();
  
  console.log("Základný test úspešný");
});