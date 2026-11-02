"use strict";
importScripts("shared.js");

async function updateBadge() {
  const { enabled } = await chrome.storage.local.get({ enabled: true });
  await chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
  await chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
  await chrome.action.setTitle({ title: enabled ? "HoverView — הגדלת תמונות" : "HoverView — מושהה" });
}
chrome.runtime.onInstalled.addListener(() => { updateBadge().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { updateBadge().catch(console.error); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) updateBadge().catch(console.error);
});
chrome.commands.onCommand.addListener(async command => {
  if (command !== "toggle-enabled") return;
  try {
    const { enabled } = await chrome.storage.local.get({ enabled: true });
    await chrome.storage.local.set({ enabled: !enabled });
  } catch (error) { console.error("HoverView: could not toggle", error); }
});
