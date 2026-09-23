import { expect, test } from "@playwright/test";
import {
  accountStorageEntries,
  clearAccountPresetCache,
  countNewCell,
  expectHistoryText,
  expectPresetListed,
  expectSignedIn,
  expectSignedOut,
  readStorage,
  saveCount,
  savePreset,
  signInExistingTestAccount,
  signInTestAccount,
  signOut,
  TEST_EMAIL,
  waitForAccountPresetCache,
} from "./auth";
import { openDifferential, sidebar } from "./differential";

function stamp() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

test.describe("account sign-in", () => {
  test.describe.configure({ mode: "serial", timeout: 90_000 });

  test("signs in from the header and reuses the same account", async ({ page }) => {
    await openDifferential(page);
    await page.locator("header").getByRole("button", { name: "Login / Sign up" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await signInTestAccount(page);
    await expectSignedIn(page);
    await signOut(page);

    await page.locator("header").getByRole("button", { name: "Login / Sign up" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await signInExistingTestAccount(page);
    await expect(page.locator("header").getByRole("button", { name: TEST_EMAIL })).toBeVisible();
  });

  test("signed-in presets stay on the account, and guest presets return after sign-out", async ({
    page,
  }) => {
    const id = stamp();
    const guestPreset = `Guest ${id}`;
    const accountPreset = `Acct ${id}`;

    await openDifferential(page);
    await savePreset(page, guestPreset);
    await expectPresetListed(page, guestPreset, true);
    const guestPresets = await readStorage(page, "presets");
    expect(guestPresets).toContain(guestPreset);
    expect(await accountStorageEntries(page, "presets")).toEqual([]);

    await signInTestAccount(page);
    await expectPresetListed(page, guestPreset, false);
    expect(await readStorage(page, "presets")).toBe(guestPresets);

    await savePreset(page, accountPreset);
    const accountPresets = await accountStorageEntries(page, "presets");
    expect(accountPresets).toHaveLength(1);
    expect(accountPresets[0]?.value).toContain(accountPreset);
    expect(accountPresets[0]?.value).not.toContain(guestPreset);
    expect(await readStorage(page, "presets")).toBe(guestPresets);

    await clearAccountPresetCache(page);
    await page.reload();
    await expectSignedIn(page);
    await waitForAccountPresetCache(page);
    await expectPresetListed(page, accountPreset, true);
    await expectPresetListed(page, guestPreset, false);
    expect(await readStorage(page, "presets")).toBe(guestPresets);

    await signOut(page);
    await page.reload();
    await expectSignedOut(page);
    await expectPresetListed(page, guestPreset, true);
    await expectPresetListed(page, accountPreset, false);
    expect(await readStorage(page, "presets")).toBe(guestPresets);
    expect((await accountStorageEntries(page, "presets"))[0]?.value).toContain(accountPreset);
  });

  test("signed-in history is only that account, and guest history returns after sign-out", async ({
    page,
  }) => {
    const id = stamp();
    const guestCell = `GuestCell${id}`;
    const accountCell = `AcctCell${id}`;

    await openDifferential(page);
    await countNewCell(page, guestCell, "9", 2);
    await saveCount(page);
    await expectHistoryText(page, `${guestCell}: 2`, true);
    const guestHistory = await readStorage(page, "countHistory");
    expect(guestHistory).toContain(guestCell);
    expect(await accountStorageEntries(page, "countHistory")).toEqual([]);

    await signInTestAccount(page);
    await expectHistoryText(page, guestCell, false);
    expect(await readStorage(page, "countHistory")).toBe(guestHistory);
    for (const entry of await accountStorageEntries(page, "countHistory")) {
      expect(entry.value).not.toContain(guestCell);
    }

    await countNewCell(page, accountCell, "8", 2);
    await saveCount(page);
    await expectHistoryText(page, `${accountCell}: 2`, true);
    await expectHistoryText(page, guestCell, false);

    const accountHistory = await accountStorageEntries(page, "countHistory");
    expect(accountHistory).toHaveLength(1);
    expect(accountHistory[0]?.value).toContain(accountCell);
    expect(accountHistory[0]?.value).not.toContain(guestCell);
    expect(await readStorage(page, "countHistory")).toBe(guestHistory);

    await page.reload();
    await expectSignedIn(page);
    await expectHistoryText(page, `${accountCell}: 2`, true);
    await expectHistoryText(page, guestCell, false);
    expect(await readStorage(page, "countHistory")).toBe(guestHistory);

    await signOut(page);
    await page.reload();
    await expectSignedOut(page);
    await expectHistoryText(page, `${guestCell}: 2`, true);
    await expectHistoryText(page, accountCell, false);
    expect(await readStorage(page, "countHistory")).toBe(guestHistory);
    expect((await accountStorageEntries(page, "countHistory"))[0]?.value).toContain(accountCell);

    await signInExistingTestAccount(page);
    await expectHistoryText(page, `${accountCell}: 2`, true);
    await expectHistoryText(page, guestCell, false);
    expect(await readStorage(page, "countHistory")).toBe(guestHistory);
    await expect(sidebar(page).getByText("No saved counts yet")).toHaveCount(0);
  });
});
