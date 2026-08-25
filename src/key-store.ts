const KEY_NAME = "geminiApiKey";
export async function getGeminiKey(): Promise<string> {
  const value = (await chrome.storage.local.get(KEY_NAME))[KEY_NAME];
  return typeof value === "string" ? value : "";
}
export async function setGeminiKey(key: string) {
  await chrome.storage.local.set({ [KEY_NAME]: key.trim() });
}
export async function forgetGeminiKey() {
  await chrome.storage.local.remove(KEY_NAME);
}
