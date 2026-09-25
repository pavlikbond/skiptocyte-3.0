import { expect, test } from "@playwright/test";
import {
  absoluteCell,
  blurActive,
  choosePreset,
  clearWithConfirm,
  confirmPresetSwitch,
  deletePreset,
  expectAbsolute,
  expectCount,
  expectRelative,
  expectSetup,
  expectTally,
  labeledSelect,
  modeButton,
  openDifferential,
  openMorphology,
  padKey,
  relativeCell,
  setLimit,
  setLineage,
  sidebar,
  STARTER_CELLS,
  startBinding,
  tally,
} from "./differential";

test.describe("differential counter", () => {
  test.beforeEach(async ({ page }) => {
    await openDifferential(page);
  });

  test("shows the starter 5-part bindings at zero", async ({ page }) => {
    await expectSetup(page, "5 Part");
    await expect(page.getByLabel("Count limit")).toHaveValue("100");
    await expect(sidebar(page).getByText("No saved counts yet")).toBeVisible();

    for (const [cell, key] of STARTER_CELLS) {
      await expect(
        page.getByRole("button", { name: `Key for ${cell}: ${key}` }),
      ).toBeVisible();
      await expect(padKey(page, key)).toHaveAttribute(
        "aria-label",
        `${key}, ${cell}`,
      );
      await expectCount(page, cell, 0);
      await expectRelative(page, cell, "0%");
      await expectAbsolute(page, cell, "0");
    }
  });

  test("each starter key increments only its own cell", async ({ page }) => {
    for (const [cell, key] of STARTER_CELLS) {
      await page.keyboard.press(key);
      await expectCount(page, cell, 1);
    }

    await expectTally(page, STARTER_CELLS.length, 100);
    for (const [cell] of STARTER_CELLS) {
      await expectCount(page, cell, 1);
    }
  });

  test("clicking an on-screen key counts the bound cell", async ({ page }) => {
    await padKey(page, "5").click();
    await padKey(page, "5").click();
    await padKey(page, "6").click();

    await expectCount(page, "Neutrophil", 2);
    await expectCount(page, "Lymphocyte", 1);
    await expectTally(page, 3, 100);
  });

  test("numpad keys follow the same bindings as the digit keys", async ({ page }) => {
    await page.keyboard.press("Numpad5");
    await page.keyboard.press("Numpad1");

    await expectCount(page, "Neutrophil", 1);
    await expectCount(page, "Eosinophil", 1);
    await expectCount(page, "Lymphocyte", 0);
    await expectTally(page, 2, 100);
  });

  test("unbound keys and modifier shortcuts do not count", async ({ page }) => {
    for (const key of ["q", "7", "+", "Space", "NumpadAdd", "Numpad7"]) {
      await page.keyboard.press(key);
    }
    await page.keyboard.press("Control+5");
    await page.keyboard.press("Alt+5");

    for (const [cell] of STARTER_CELLS) {
      await expectCount(page, cell, 0);
    }
    await expectTally(page, 0, 100);
  });

  test("typing in a field does not count, and counting resumes after leaving it", async ({
    page,
  }) => {
    await page.getByRole("textbox", { name: "Name for Neutrophil" }).click();
    await page.keyboard.press("5");
    await expectTally(page, 0, 100);

    await page.getByLabel("Count limit").click();
    await page.keyboard.press("9");
    await expectCount(page, "Basophil", 0);

    const wbc = page.getByLabel("Absolute count");
    await wbc.click();
    await page.keyboard.press("8");
    await expect(wbc).toHaveValue("8");
    await expectCount(page, "Lymphocyte", 0);

    await wbc.blur();
    await page.keyboard.press("6");
    await expectCount(page, "Lymphocyte", 1);
    await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
  });

  test("counting stops at the limit and further keys do not add cells", async ({ page }) => {
    await setLimit(page, "3");
    await expectTally(page, 0, 3);

    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await page.keyboard.press("6");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);

    await page.keyboard.press("5");
    await page.keyboard.press("2");

    await expectCount(page, "Neutrophil", 2);
    await expectCount(page, "Lymphocyte", 1);
    await expectCount(page, "Basophil", 0);
    await expectTally(page, 3, 3);

    await page.keyboard.press("5");
    await padKey(page, "6").click();
    await expectCount(page, "Neutrophil", 2);
    await expectCount(page, "Lymphocyte", 1);
    await expectTally(page, 3, 3);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

  test("the limit cannot drop below 1", async ({ page }) => {
    await setLimit(page, "0");
    await expect(page.getByLabel("Count limit")).toHaveValue("1");
    await expectTally(page, 0, 1);

    await page.keyboard.press("5");
    await page.keyboard.press("5");

    await expectCount(page, "Neutrophil", 1);
    await expectTally(page, 1, 1);
  });

  test("lowering the limit under the current tally blocks more counts", async ({ page }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await setLimit(page, "2");

    await expectTally(page, 3, 2);

    await page.keyboard.press("5");
    await page.keyboard.press("6");
    await expectCount(page, "Neutrophil", 3);
    await expectCount(page, "Lymphocyte", 0);
    await expectTally(page, 3, 2);
  });

  test("ignored cells stay out of the tally and can still be counted at the limit", async ({
    page,
  }) => {
    await page.getByRole("checkbox", { name: "Ignore Neutrophil" }).click();
    await expect(
      page.getByRole("checkbox", { name: "Ignore Neutrophil" }),
    ).toBeChecked();

    await page.keyboard.press("5");
    await page.keyboard.press("6");
    await expectCount(page, "Neutrophil", 1);
    await expectCount(page, "Lymphocyte", 1);
    await expectTally(page, 1, 100);
    await expectRelative(page, "Neutrophil", "");
    await expectRelative(page, "Lymphocyte", "100%");

    await setLimit(page, "1");
    await page.keyboard.press("6");
    await page.keyboard.press("5");

    await expectCount(page, "Lymphocyte", 1);
    await expectCount(page, "Neutrophil", 2);
    await expectTally(page, 1, 1);
  });

  test("decrease mode counts down and stops at zero", async ({ page }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await page.keyboard.press("5");

    await modeButton(page, "-").click();
    await page.keyboard.press("5");
    await padKey(page, "5").click();
    await expectCount(page, "Neutrophil", 1);

    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await padKey(page, "5").click();
    await expectCount(page, "Neutrophil", 0);
    await expectTally(page, 0, 100);

    await modeButton(page, "+").click();
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);
  });

  test("undo reverses the latest count from the button, Backspace, and Ctrl+Z", async ({
    page,
  }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await page.keyboard.press("6");
    await expectCount(page, "Neutrophil", 2);
    await expectCount(page, "Lymphocyte", 1);

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expectCount(page, "Lymphocyte", 0);
    await expectCount(page, "Neutrophil", 2);

    await page.keyboard.press("Backspace");
    await expectCount(page, "Neutrophil", 1);

    await page.keyboard.press("Control+z");
    await expectCount(page, "Neutrophil", 0);
    await expectTally(page, 0, 100);

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expectCount(page, "Neutrophil", 0);
    await expectTally(page, 0, 100);
  });

  test("a blocked decrease is not undone into a new count", async ({ page }) => {
    await modeButton(page, "-").click();
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 0);

    await modeButton(page, "+").click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expectCount(page, "Neutrophil", 0);

    await page.keyboard.press("5");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expectCount(page, "Neutrophil", 0);
  });

  test("Clear asks before wiping, and holding Clear skips the prompt", async ({ page }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("6");

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    const dialog = page.getByRole("alertdialog", { name: "Clear counts?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expectCount(page, "Neutrophil", 1);
    await expectCount(page, "Lymphocyte", 1);

    await clearWithConfirm(page);
    await expectCount(page, "Neutrophil", 0);
    await expectCount(page, "Lymphocyte", 0);
    await expectTally(page, 0, 100);

    await page.keyboard.press("2");
    const clear = page.getByRole("button", { name: "Clear", exact: true });
    await clear.hover();
    await page.mouse.down();
    await expect(tally(page, 0, 100)).toBeVisible();
    await page.mouse.up();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expectCount(page, "Basophil", 0);
  });

  test("rebinding, swapping, and unbinding change which key counts", async ({ page }) => {
    await startBinding(page, "Neutrophil", "5");
    await page.keyboard.press("q");
    await expect(
      page.getByRole("button", { name: "Key for Neutrophil: q" }),
    ).toBeVisible();
    await expect(padKey(page, "5")).toHaveAttribute("aria-label", "5");

    await page.keyboard.press("q");
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);

    await startBinding(page, "Neutrophil", "q");
    await page.keyboard.press("6");
    await expect(page.getByText("Swapped with Lymphocyte")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Key for Neutrophil: 6" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Key for Lymphocyte: q" }),
    ).toBeVisible();

    await page.keyboard.press("6");
    await page.keyboard.press("q");
    await expectCount(page, "Neutrophil", 2);
    await expectCount(page, "Lymphocyte", 1);

    await startBinding(page, "Basophil", "2");
    await page.getByRole("button", { name: "Unbind" }).click();
    await expect(
      page.getByRole("button", { name: "Set key for Basophil" }),
    ).toBeVisible();
    await page.keyboard.press("2");
    await expectCount(page, "Basophil", 0);
    await expectCount(page, "Neutrophil", 2);
  });

  test("Escape and an unusable key leave the current binding in place", async ({
    page,
  }) => {
    await startBinding(page, "Monocyte", "4");
    await page.keyboard.press("Space");
    await expect(page.getByText("That key can't be used here")).toBeVisible();
    await expect(page.getByText("Press any key for Monocyte")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Press any key for Monocyte")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Key for Monocyte: 4" }),
    ).toBeVisible();

    await startBinding(page, "Monocyte", "4");
    await page.keyboard.press("4");
    await expect(page.getByText("Key Binding Mode")).toBeHidden();
    await expectCount(page, "Monocyte", 0);

    await page.keyboard.press("4");
    await expectCount(page, "Monocyte", 1);
  });

  test("a keypad click can assign a free key", async ({ page }) => {
    await startBinding(page, "Eosinophil", "1");
    await padKey(page, "9").click();
    await expect(
      page.getByRole("button", { name: "Key for Eosinophil: 9" }),
    ).toBeVisible();

    await padKey(page, "9").click();
    await page.keyboard.press("1");
    await expectCount(page, "Eosinophil", 1);
  });

  test("Backspace during binding clears that cell's key", async ({ page }) => {
    await startBinding(page, "Eosinophil", "1");
    await page.keyboard.press("Backspace");
    await expect(
      page.getByRole("button", { name: "Set key for Eosinophil" }),
    ).toBeVisible();

    await page.keyboard.press("1");
    await expectCount(page, "Eosinophil", 0);
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);
  });

  test("deleting a cell removes its key from the count", async ({ page }) => {
    await page
      .getByRole("row")
      .filter({ has: page.getByRole("textbox", { name: "Name for Basophil" }) })
      .getByRole("button", { name: "Row menu" })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    await expect(page.getByRole("textbox", { name: "Name for Basophil" })).toHaveCount(0);
    await page.keyboard.press("2");
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);
    await expectTally(page, 1, 100);
  });

  test("the on-screen keyboard does not change which physical keys count", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Keyboard", exact: true }).click();
    await expect(padKey(page, "a")).toBeVisible();
    await expect(padKey(page, "5")).toHaveCount(0);

    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);

    await page.getByRole("button", { name: "Keypad", exact: true }).click();
    await expect(padKey(page, "5")).toHaveAttribute("aria-label", "5, Neutrophil");
  });

  test("letter keys count after switching to the bone marrow setup", async ({ page }) => {
    await choosePreset(page, "Bone Marrow");
    await expectSetup(page, "Bone Marrow");
    await expectCount(page, "Seg", 0);

    await page.getByRole("button", { name: "Keyboard", exact: true }).click();
    await padKey(page, "a").click();
    await page.keyboard.press("b");

    await expectCount(page, "Baso Normo", 1);
    await expectCount(page, "Poly normo", 1);
    await expectTally(page, 2, 100);
  });

  test("switching setups asks before replacing an in-progress count", async ({ page }) => {
    await page.keyboard.press("5");
    await setLimit(page, "40");
    await choosePreset(page, "Bone Marrow");

    const dialog = page.getByRole("alertdialog", {
      name: "Start a new count with Bone Marrow?",
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expectSetup(page, "5 Part");
    await expectCount(page, "Neutrophil", 1);
    await expect(page.getByLabel("Count limit")).toHaveValue("40");

    await choosePreset(page, "Bone Marrow");
    await page
      .getByRole("alertdialog", { name: "Start a new count with Bone Marrow?" })
      .getByRole("button", { name: "Load setup" })
      .click();

    await expectSetup(page, "Bone Marrow");
    await expectCount(page, "Seg", 0);
    await expectCount(page, "Baso Normo", 0);
    await expect(page.getByLabel("Count limit")).toHaveValue("100");
    await expectTally(page, 0, 100);

    await page.keyboard.press("a");
    await expectCount(page, "Baso Normo", 1);
  });

  test("relative, absolute, ANC, and ALC follow the count and WBC", async ({ page }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("6");
    await page.keyboard.press("6");
    await page.getByLabel("Absolute count").fill("10");

    await expectRelative(page, "Neutrophil", "33.3%");
    await expectRelative(page, "Lymphocyte", "66.7%");
    await expectRelative(page, "Eosinophil", "0%");
    await expectAbsolute(page, "Neutrophil", "3.333");
    await expectAbsolute(page, "Lymphocyte", "6.667");
    await expect(page.getByText("ANC 3.333", { exact: true })).toBeVisible();
    await expect(page.getByText("ALC 6.667", { exact: true })).toBeVisible();
    await expect(page.getByText("Corrected WBC")).toHaveCount(0);
    await expectTally(page, 3, 100);
  });

  test("relative and absolute update as cells are added, removed, and the WBC changes", async ({
    page,
  }) => {
    const wbc = page.getByLabel("Absolute count");
    await wbc.fill("10");
    await blurActive(page);

    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);
    await expectRelative(page, "Neutrophil", "100%");
    await expectAbsolute(page, "Neutrophil", "10");
    await expectRelative(page, "Lymphocyte", "0%");
    await expectAbsolute(page, "Lymphocyte", "0");

    await page.keyboard.press("5");
    await page.keyboard.press("6");
    await page.keyboard.press("6");
    await expectCount(page, "Neutrophil", 2);
    await expectCount(page, "Lymphocyte", 2);
    await expectRelative(page, "Neutrophil", "50%");
    await expectRelative(page, "Lymphocyte", "50%");
    await expectAbsolute(page, "Neutrophil", "5");
    await expectAbsolute(page, "Lymphocyte", "5");
    await expectRelative(page, "Eosinophil", "0%");
    await expectAbsolute(page, "Eosinophil", "0");

    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expectCount(page, "Lymphocyte", 1);
    await expectRelative(page, "Neutrophil", "66.7%");
    await expectRelative(page, "Lymphocyte", "33.3%");
    await expectAbsolute(page, "Neutrophil", "6.667");
    await expectAbsolute(page, "Lymphocyte", "3.333");

    await modeButton(page, "-").click();
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);
    await expectCount(page, "Lymphocyte", 1);
    await expectRelative(page, "Neutrophil", "50%");
    await expectRelative(page, "Lymphocyte", "50%");
    await expectAbsolute(page, "Neutrophil", "5");
    await expectAbsolute(page, "Lymphocyte", "5");

    await wbc.fill("20");
    await blurActive(page);
    await expectRelative(page, "Neutrophil", "50%");
    await expectRelative(page, "Lymphocyte", "50%");
    await expectAbsolute(page, "Neutrophil", "10");
    await expectAbsolute(page, "Lymphocyte", "10");
    await expectAbsolute(page, "Eosinophil", "0");

    await modeButton(page, "+").click();
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 2);
    await expectRelative(page, "Neutrophil", "66.7%");
    await expectRelative(page, "Lymphocyte", "33.3%");
    await expectAbsolute(page, "Neutrophil", "13.333");
    await expectAbsolute(page, "Lymphocyte", "6.667");
    await expectTally(page, 3, 100);
  });

  test("naming a cell nRBC ignores it and corrects the WBC", async ({ page }) => {
    await page.getByRole("button", { name: "Add Cell" }).click();
    const name = page.getByRole("textbox", { name: "Name for new cell" });
    await expect(name).toBeFocused();
    await name.fill("nRBC");

    await expect(page.getByRole("checkbox", { name: "Ignore nRBC" })).toBeChecked();
    await page.getByRole("button", { name: "Set key for nRBC" }).click();
    await page.keyboard.press("9");
    await expect(page.getByRole("button", { name: "Key for nRBC: 9" })).toBeVisible();

    await page.getByLabel("Absolute count").fill("10");
    await blurActive(page);
    await page.keyboard.press("9");
    await page.keyboard.press("9");

    await expectCount(page, "nRBC", 2);
    await expect(relativeCell(page, "nRBC")).toHaveText("");
    await expect(absoluteCell(page, "nRBC")).toHaveText("");
    await expectTally(page, 0, 100);
    await expect(page.getByText("Corrected WBC 9.804", { exact: true })).toBeVisible();

    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 1);
    await expectTally(page, 1, 100);
  });

  test("myeloid and erythroid counts produce an M:E ratio", async ({ page }) => {
    await choosePreset(page, "Bone Marrow");
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await expect(page.getByText(/^M:E /)).toHaveCount(0);

    await page.keyboard.press("a");
    await expectCount(page, "Seg", 3);
    await expectCount(page, "Baso Normo", 1);
    await expect(page.getByText("M:E 3:1", { exact: true })).toBeVisible();
  });

  test("a finished count can be saved and reloaded after the session is cleared", async ({
    page,
  }) => {
    await setLimit(page, "2");
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await sidebar(page).getByRole("button", { name: "Save count" }).click();

    const saved = sidebar(page).getByRole("button", { name: /2\/2/ });
    await expect(saved).toBeVisible();
    await saved.click();
    const replace = page.getByRole("alertdialog", { name: "Load this saved count?" });
    await expect(replace).toBeVisible();
    await replace.getByRole("button", { name: "Cancel" }).click();
    await expectCount(page, "Neutrophil", 2);

    await clearWithConfirm(page);
    await expectTally(page, 0, 2);
    await saved.click();
    await expect(page.getByRole("alertdialog", { name: "Load this saved count?" })).toHaveCount(0);

    await expectCount(page, "Neutrophil", 2);
    await expectTally(page, 2, 2);
    await page.getByRole("button", { name: /Choose setup/ }).click();
    await expect(page.getByText("Loaded from history")).toBeVisible();

    await page.keyboard.press("Escape");
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 2);
  });

  test("Save count stores a mid-count without clearing the session", async ({ page }) => {
    await page.keyboard.press("5");
    await page.keyboard.press("5");
    await page.keyboard.press("6");
    await expectTally(page, 3, 100);

    await sidebar(page).getByRole("button", { name: "Save count" }).click();

    const saved = sidebar(page).getByRole("button", { name: /3\/100/ });
    await expect(saved).toBeVisible();
    await expect(sidebar(page).getByText("No saved counts yet")).toHaveCount(0);
    await sidebar(page).getByText("Details").click();
    await expect(sidebar(page).getByText("Neutrophil: 2 · 66.7%")).toBeVisible();
    await expect(sidebar(page).getByText("Lymphocyte: 1 · 33.3%")).toBeVisible();
    await expect(sidebar(page).getByText("Basophil: 0 · 0%")).toBeVisible();

    await expectCount(page, "Neutrophil", 2);
    await expectCount(page, "Lymphocyte", 1);
    await expectTally(page, 3, 100);

    await page.reload();
    await expect(tally(page, 0, 100)).toBeVisible();
    await expect(sidebar(page).getByRole("button", { name: /3\/100/ })).toBeVisible();
    await sidebar(page).getByText("Details").click();
    await expect(sidebar(page).getByText("Neutrophil: 2 · 66.7%")).toBeVisible();
    await expectCount(page, "Neutrophil", 0);
  });

  test("a saved count restores the session after its preset is deleted", async ({ page }) => {
    await setLimit(page, "80");
    await startBinding(page, "Neutrophil", "5");
    await page.keyboard.press("q");
    await page.getByRole("button", { name: "Add Cell" }).click();
    await page.getByRole("textbox", { name: "Name for new cell" }).fill("Atypical lymph");
    await page.getByRole("button", { name: "Set key for Atypical lymph" }).click();
    await page.keyboard.press("9");
    await page.getByRole("checkbox", { name: "Ignore Basophil" }).click();
    await setLineage(page, "Neutrophil", "myeloid");
    await setLineage(page, "Lymphocyte", "erythroid");
    await openMorphology(page);
    await labeledSelect(page, "Anisocytosis").selectOption("2");
    await labeledSelect(page, "Schistocytes").selectOption("1");
    await labeledSelect(page, "Platelet estimate").selectOption("low");
    await page.getByRole("checkbox", { name: "Giant platelets" }).click();
    await page.getByLabel("Absolute count").fill("12.5");
    await blurActive(page);

    await page.keyboard.press("q");
    await page.keyboard.press("q");
    await page.keyboard.press("q");
    await page.keyboard.press("q");
    await page.keyboard.press("6");
    await page.keyboard.press("6");
    await page.keyboard.press("2");
    await page.keyboard.press("2");
    await page.keyboard.press("2");
    await page.keyboard.press("9");

    await expectTally(page, 7, 80);
    await expect(page.getByText("M:E 2:1", { exact: true })).toBeVisible();
    await expectCount(page, "Neutrophil", 4);
    await expectCount(page, "Lymphocyte", 2);
    await expectCount(page, "Basophil", 3);
    await expectCount(page, "Atypical lymph", 1);

    await sidebar(page).getByRole("button", { name: "Save count" }).click();
    const saved = sidebar(page).getByRole("button", { name: /7\/80/ });
    await expect(saved).toBeVisible();
    await sidebar(page).getByText("Details").click();
    await expect(sidebar(page).getByText("Neutrophil: 4 · 57.1%")).toBeVisible();
    await expect(sidebar(page).getByText("Lymphocyte: 2 · 28.6%")).toBeVisible();
    await expect(sidebar(page).getByText("Basophil: 3 (ignore)")).toBeVisible();
    await expect(sidebar(page).getByText("Atypical lymph: 1 · 14.3%")).toBeVisible();
    await expectCount(page, "Neutrophil", 4);

    await deletePreset(page, "5 Part");
    await expectCount(page, "Neutrophil", 4);
    await choosePreset(page, "Bone Marrow");
    await confirmPresetSwitch(page, "Bone Marrow");
    await expectCount(page, "Seg", 0);
    await expect(page.getByRole("textbox", { name: "Name for Neutrophil" })).toHaveCount(0);
    await expect(page.getByLabel("Count limit")).toHaveValue("100");
    await page.getByLabel("Absolute count").fill("4");
    await blurActive(page);
    await expect(labeledSelect(page, "Anisocytosis")).toHaveValue("0");
    await expect(page.getByRole("checkbox", { name: "Giant platelets" })).not.toBeChecked();
    await expect(saved).toBeVisible();

    await saved.click();
    await expect(page.getByRole("alertdialog", { name: "Load this saved count?" })).toHaveCount(0);
    await expectSetup(page, "5 Part");
    await expectTally(page, 7, 80);
    await expect(page.getByLabel("Count limit")).toHaveValue("80");
    await expect(page.getByLabel("Absolute count")).toHaveValue("12.5");
    await expect(page.getByRole("textbox", { name: "Name for Seg" })).toHaveCount(0);

    await expect(page.getByRole("button", { name: "Key for Neutrophil: q" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Key for Basophil: 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Key for Monocyte: 4" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Key for Eosinophil: 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Key for Lymphocyte: 6" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Key for Atypical lymph: 9" })).toBeVisible();
    await expectCount(page, "Neutrophil", 4);
    await expectCount(page, "Lymphocyte", 2);
    await expectCount(page, "Basophil", 3);
    await expectCount(page, "Atypical lymph", 1);
    await expectCount(page, "Monocyte", 0);
    await expectCount(page, "Eosinophil", 0);
    await expect(page.getByRole("checkbox", { name: "Ignore Basophil" })).toBeChecked();
    await expectRelative(page, "Basophil", "");
    await expectRelative(page, "Neutrophil", "57.1%");
    await expectAbsolute(page, "Neutrophil", "7.143");
    await expectAbsolute(page, "Atypical lymph", "1.786");
    await expect(page.getByText("M:E 2:1", { exact: true })).toBeVisible();

    await openMorphology(page);
    await expect(labeledSelect(page, "Anisocytosis")).toHaveValue("2");
    await expect(labeledSelect(page, "Schistocytes")).toHaveValue("1");
    await expect(labeledSelect(page, "Poikilocytosis")).toHaveValue("0");
    await expect(labeledSelect(page, "Platelet estimate")).toHaveValue("low");
    await expect(page.getByRole("checkbox", { name: "Giant platelets" })).toBeChecked();

    await page.getByRole("button", { name: /Choose setup/ }).click();
    await expect(page.getByText("Loaded from history")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.keyboard.press("q");
    await expectCount(page, "Neutrophil", 5);
    await page.keyboard.press("5");
    await expectCount(page, "Neutrophil", 5);
    await expectCount(page, "Atypical lymph", 1);
  });

  test.describe("handset", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("a keypad tap counts and still stops at the limit", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Keyboard", exact: true })).toBeHidden();
      await setLimit(page, "1");
      await padKey(page, "5").click();
      await padKey(page, "5").click();
      await padKey(page, "6").click();

      await expectCount(page, "Neutrophil", 1);
      await expectCount(page, "Lymphocyte", 0);
      await expectTally(page, 1, 1);
    });
  });
});

test("the Counter link opens the starter differential", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "Counter" }).click();
  await expect(page).toHaveURL(/\/differential$/);
  await expect(tally(page, 0, 100)).toBeVisible();
  await expectSetup(page, "5 Part");
  await expect(page.getByRole("button", { name: "Key for Neutrophil: 5" })).toBeVisible();
});
