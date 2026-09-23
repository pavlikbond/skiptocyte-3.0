import { expect, type Page } from "@playwright/test";
import { expectCount, sidebar } from "./differential";

/** Shared bench account. Email is not verified, so the same login is reused across runs. */
export const TEST_EMAIL = "skiptocyte.e2e@example.com";
export const TEST_PASSWORD = "SkipE2e-count-1";

const AUTH_TIMEOUT = 25_000;

export function accountButton(page: Page) {
  return page.locator("header").getByRole("button", { name: TEST_EMAIL, exact: true });
}

export async function expectSignedIn(page: Page) {
  await expect(accountButton(page)).toBeVisible({ timeout: AUTH_TIMEOUT });
  await expect(page.getByText("This device · your account", { exact: true })).toBeVisible({
    timeout: AUTH_TIMEOUT,
  });
  await expect(page).toHaveURL(/\/differential$/);
}

export async function expectSignedOut(page: Page) {
  await expect(page.getByText("This device · guest", { exact: true })).toBeVisible({
    timeout: AUTH_TIMEOUT,
  });
  await expect(accountButton(page)).toHaveCount(0);
  await expect(page.locator("header").getByRole("button", { name: "Login / Sign up" })).toBeVisible();
}

async function submitCredentials(page: Page, buttonName: "Sign in" | "Create account") {
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: buttonName, exact: true }).click();
}

/** Signs in. Creates the shared account the first time the password is rejected as unknown. */
export async function signInTestAccount(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await submitCredentials(page, "Sign in");

  const missing = page.getByText("Incorrect email or password.");
  await expect(accountButton(page).or(missing)).toBeVisible({ timeout: AUTH_TIMEOUT });
  if (await missing.isVisible()) {
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
    await submitCredentials(page, "Create account");
    const exists = page.getByText("An account with this email already exists.");
    await expect(accountButton(page).or(exists)).toBeVisible({ timeout: AUTH_TIMEOUT });
    if (await exists.isVisible()) {
      throw new Error(`Account ${TEST_EMAIL} already exists, but sign-in rejected the password.`);
    }
  }

  await expectSignedIn(page);
  await waitForAccountPresetCache(page);
}

/** Second sign-in must use the existing account, not the sign-up form. */
export async function signInExistingTestAccount(page: Page) {
  await page.goto("/login");
  await submitCredentials(page, "Sign in");
  await expectSignedIn(page);
  await expect(page.getByText("Incorrect email or password.")).toHaveCount(0);
  await waitForAccountPresetCache(page);
}

export async function signOut(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) {
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
  await accountButton(page).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expectSignedOut(page);
}

export async function waitForAccountPresetCache(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("presets:"))),
      { timeout: AUTH_TIMEOUT },
    )
    .toBe(true);
}

export async function readStorage(page: Page, key: string) {
  return page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
}

export async function accountStorageEntries(page: Page, base: "presets" | "countHistory") {
  return page.evaluate((prefix) => {
    return Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .map((key) => ({ key, value: localStorage.getItem(key) ?? "" }));
  }, `${base}:`);
}

export async function clearAccountPresetCache(page: Page) {
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("presets:")) localStorage.removeItem(key);
    }
  });
}

export async function savePreset(page: Page, name: string) {
  await page.getByRole("button", { name: /Choose setup/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Save as/ }).click();
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const row = dialog.locator(".divide-y > div").filter({
    has: page.getByText(name, { exact: true }),
  });
  await expect(row).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Save as/ })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

export async function expectPresetListed(page: Page, name: string, listed: boolean) {
  await page.getByRole("button", { name: /Choose setup/ }).click();
  const dialog = page.getByRole("dialog");
  const row = dialog.locator(".divide-y > div").filter({
    has: page.getByText(name, { exact: true }),
  });
  await expect(row).toHaveCount(listed ? 1 : 0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

export async function countNewCell(page: Page, name: string, key: string, presses: number) {
  await page.getByRole("button", { name: "Add Cell" }).click();
  await page.getByRole("textbox", { name: "Name for new cell" }).fill(name);
  await page.getByRole("button", { name: `Set key for ${name}` }).click();
  await page.keyboard.press(key);
  for (let i = 0; i < presses; i += 1) await page.keyboard.press(key);
  await expectCount(page, name, presses);
}

export async function saveCount(page: Page) {
  await sidebar(page).getByRole("button", { name: "Save count" }).click();
}

export async function expectHistoryText(page: Page, text: string, present: boolean) {
  const read = () => sidebar(page).evaluate((el) => el.textContent ?? "");
  if (present) await expect.poll(read, { timeout: AUTH_TIMEOUT }).toContain(text);
  else await expect.poll(read, { timeout: AUTH_TIMEOUT }).not.toContain(text);
}
