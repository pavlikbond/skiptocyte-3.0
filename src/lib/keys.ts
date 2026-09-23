export const NUMPAD_ENTER = "NumpadEnter";
export const NUM_LOCK = "NumLock";

const NUMPAD_CODE_MAP: Record<string, string> = {
  Numpad0: "0",
  Numpad1: "1",
  Numpad2: "2",
  Numpad3: "3",
  Numpad4: "4",
  Numpad5: "5",
  Numpad6: "6",
  Numpad7: "7",
  Numpad8: "8",
  Numpad9: "9",
  NumpadDecimal: ".",
  NumpadAdd: "+",
  NumpadSubtract: "-",
  NumpadMultiply: "*",
  NumpadDivide: "/",
};

type KeyInput = {
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
};

export function normalizeKey(input: KeyInput): string | null {
  if (input.ctrlKey || input.altKey || input.metaKey) return null;
  if (input.code && input.code in NUMPAD_CODE_MAP) return NUMPAD_CODE_MAP[input.code];
  if (input.code === "NumpadEnter") return NUMPAD_ENTER;
  if (input.key === NUM_LOCK) return NUM_LOCK;
  if (input.key.length === 1 && input.key !== " ") return input.key;
  return null;
}

export function normalizeStoredKey(raw: unknown): string {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (value === "Enter") return NUMPAD_ENTER;
  if (value === NUMPAD_ENTER || value === NUM_LOCK) return value;
  if (value.length === 1 && value !== " ") return value;
  return "";
}

export function keyLabel(key: string): string {
  if (key === NUMPAD_ENTER) return "Enter";
  if (key === NUM_LOCK) return "Num";
  return key;
}
