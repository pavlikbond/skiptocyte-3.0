import { expect, type Locator, type Page } from "@playwright/test";

export const STARTER_CELLS = [
  ["Neutrophil", "5"],
  ["Basophil", "2"],
  ["Monocyte", "4"],
  ["Eosinophil", "1"],
  ["Lymphocyte", "6"],
] as const;

export async function openDifferential(page: Page) {
  await page.goto("/differential");
  await expect(tally(page, 0, 100)).toBeVisible();
  await expect(cellName(page, "Neutrophil")).toBeVisible();
}

export function tally(page: Page, count: number, max: number) {
  return page.getByText(`${count} / ${max}`, { exact: true });
}

export async function expectTally(page: Page, count: number, max: number) {
  await expect(tally(page, count, max)).toBeVisible();
}

export function cellRow(page: Page, name: string) {
  return page.getByRole("row").filter({
    has: cellName(page, name),
  });
}

export function cellName(page: Page, name: string) {
  return page.getByRole("textbox", { name: `Name for ${name}` });
}

function cellColumn(page: Page, name: string, offset: number) {
  return cellName(page, name).locator(
    `xpath=ancestor::td[1]/following-sibling::td[${offset}]`,
  );
}

export function countCell(page: Page, name: string) {
  return cellColumn(page, name, 1);
}

export function relativeCell(page: Page, name: string) {
  return cellColumn(page, name, 2);
}

export function absoluteCell(page: Page, name: string) {
  return cellColumn(page, name, 3);
}

export async function expectCount(page: Page, name: string, count: number) {
  await expect(countCell(page, name)).toHaveText(String(count));
}

export async function expectRelative(page: Page, name: string, value: string) {
  await expect(relativeCell(page, name)).toHaveText(value);
}

export async function expectAbsolute(page: Page, name: string, value: string) {
  await expect(absoluteCell(page, name)).toHaveText(value);
}

export function padKey(page: Page, key: string) {
  return page.locator("[data-howto='pad']").locator(`[data-key="${key}"]`);
}

export function modeButton(page: Page, symbol: "+" | "-") {
  return page
    .locator("button:not([data-key])")
    .filter({ hasText: new RegExp(`^\\${symbol}$`) });
}

export function setupButton(page: Page, name: string) {
  return page.getByRole("button", {
    name: `Choose setup. Current setup: ${name}`,
    exact: true,
  });
}

export async function expectSetup(page: Page, name: string) {
  await expect(setupButton(page, name)).toBeVisible();
}

export async function choosePreset(page: Page, name: string) {
  await page.getByRole("button", { name: /Choose setup/ }).click();
  const dialog = page.getByRole("dialog", { name: "Presets" });
  await dialog
    .locator(".divide-y > div")
    .filter({ has: page.getByText(name, { exact: true }) })
    .getByRole("button", { name: "Select" })
    .click();
}

export function historyPrompt(page: Page) {
  return page.getByRole("alertdialog", { name: "Save this count to history?" });
}

export async function skipHistoryPrompt(page: Page) {
  const prompt = historyPrompt(page);
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "Skip" }).click();
  await expect(prompt).toBeHidden();
}

export async function setLimit(page: Page, value: string) {
  await page.getByLabel("Count limit").fill(value);
  await blurActive(page);
}

export async function blurActive(page: Page) {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
}

export async function startBinding(page: Page, name: string, key: string) {
  await page.getByRole("button", { name: `Key for ${name}: ${key}` }).click();
  await expect(
    page.getByRole("button", { name: `Listening for a key for ${name}` }),
  ).toBeVisible();
  await expect(page.getByText(`Press any key for ${name}`)).toBeVisible();
}

export async function clearWithConfirm(page: Page) {
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const dialog = page.getByRole("alertdialog", { name: "Clear counts?" });
  await dialog.getByRole("button", { name: "Clear" }).click();
  await expect(dialog).toBeHidden();
}

export function sidebar(page: Page): Locator {
  return page.locator("[data-slot='sidebar']");
}

export function labeledSelect(page: Page, label: string) {
  return page.getByText(label, { exact: true }).locator("xpath=parent::div/select");
}

export async function openMorphology(page: Page) {
  const trigger = page.getByRole("button", { name: "Morphology checklist" });
  if ((await trigger.getAttribute("data-state")) !== "open") {
    await trigger.click();
  }
  await expect(labeledSelect(page, "Anisocytosis")).toBeVisible();
}

export async function setLineage(
  page: Page,
  cell: string,
  lineage: "none" | "myeloid" | "erythroid",
) {
  await cellRow(page, cell).getByRole("button", { name: "Row menu" }).click();
  await page.getByRole("menuitem", { name: `Lineage: ${lineage}` }).click();
}

export async function deletePreset(page: Page, name: string) {
  await page.getByRole("button", { name: /Choose setup/ }).click();
  const dialog = page.getByRole("dialog", { name: "Presets" });
  await dialog
    .locator(".divide-y > div")
    .filter({ has: page.getByText(name, { exact: true }) })
    .getByRole("button", { name: `Manage ${name}` })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: `Delete ${name}?` })).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.locator(".divide-y > div").filter({ has: page.getByText(name, { exact: true }) }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

export async function confirmPresetSwitch(page: Page, name: string) {
  const dialog = page.getByRole("alertdialog", {
    name: `Start a new count with ${name}?`,
  });
  await dialog.getByRole("button", { name: "Load setup" }).click();
  await expect(dialog).toBeHidden();
  await expectSetup(page, name);
}
