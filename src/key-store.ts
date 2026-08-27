const KEY_NAME = "geminiApiKey";
async function restrictKeyStorage() {
  await chrome.storage.local.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
}
export async function getGeminiKey(): Promise<string> {
  await restrictKeyStorage();
  const value = (await chrome.storage.local.get(KEY_NAME))[KEY_NAME];
  return typeof value === "string" ? value : "";
}
export async function setGeminiKey(key: string) {
  const candidate = key.trim();
  if (
    candidate.length < 20 ||
    candidate.length > 500 ||
    /[\s\u0000-\u001f]/.test(candidate)
  )
    throw new Error("The API key format is not valid.");
  await restrictKeyStorage();
  await chrome.storage.local.set({ [KEY_NAME]: candidate });
}
export async function forgetGeminiKey() {
  await restrictKeyStorage();
  await chrome.storage.local.remove(KEY_NAME);
}
