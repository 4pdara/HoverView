"use strict";
const preview = document.getElementById('demoPreview');
const tiles = [...document.querySelectorAll('.demo-tile')];
const previewImage = document.getElementById('previewImage');
const theme = document.getElementById('demoTheme');
let timer, activeTile = null, dismissedTile = null, pinned = false, previousFocus;
function placePreview(tile) {
  const rect = tile.getBoundingClientRect();
  const width = Math.min(540, window.innerWidth - 32);
  preview.style.width = `${width}px`;
  const height = preview.getBoundingClientRect().height;
  let x = rect.left + rect.width / 2 - width / 2;
  let y = rect.top - height - 18;
  if (pinned) { x = (innerWidth - width) / 2; y = (innerHeight - height) / 2; }
  else if (y < 85) y = rect.bottom + 15;
  preview.style.left = `${Math.max(16, Math.min(innerWidth - width - 16, x))}px`;
  preview.style.top = `${Math.max(16, Math.min(innerHeight - height - 16, y))}px`;
}
function showPreview(tile, pin = false) {
  clearTimeout(timer);
  if (pinned && !pin) return;
  if (!pin && dismissedTile === tile) return;
  const image = tile.querySelector('img');
  if (!pinned) previousFocus = document.activeElement;
  activeTile = tile; pinned = pin;
  previewImage.src = image.src; previewImage.alt = image.alt;
  document.getElementById('previewCaption').textContent = tile.querySelector('strong').textContent;
  preview.classList.toggle('light', theme.value === 'light');
  preview.classList.toggle('pinned', pinned);
  document.getElementById('previewMode').textContent = pinned ? 'התמונה מוצמדת' : 'תצוגה מקדימה · רווח להצמדה';
  document.getElementById('pinPreview').textContent = pinned ? 'סגירת הצמדה' : 'הצמדה · רווח';
  preview.hidden = false; placePreview(tile);
  if (pinned) preview.focus({ preventScroll: true });
}
function closePreview(restore = false) {
  if (restore) dismissedTile = activeTile;
  clearTimeout(timer); preview.hidden = true; pinned = false; activeTile = null;
  if (restore && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
}
for (const tile of tiles) {
  tile.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch' || pinned) return;
    clearTimeout(timer); timer = setTimeout(() => showPreview(tile), 220);
  });
  tile.addEventListener('pointerleave', () => { clearTimeout(timer); if (dismissedTile === tile) dismissedTile = null; if (!pinned) closePreview(); });
  tile.addEventListener('focus', () => { if (!pinned) { clearTimeout(timer); timer = setTimeout(() => showPreview(tile), 220); } });
  tile.addEventListener('blur', () => { if (!pinned) { if (dismissedTile === tile) dismissedTile = null; closePreview(); } });
  tile.addEventListener('click', () => showPreview(tile, true));
}
document.getElementById('closePreview').addEventListener('click', () => closePreview(true));
document.getElementById('pinPreview').addEventListener('click', () => pinned ? closePreview(true) : activeTile && showPreview(activeTile, true));
previewImage.addEventListener('load', () => { if (activeTile) placePreview(activeTile); });
theme.addEventListener('change', () => preview.classList.toggle('light', theme.value === 'light'));
document.addEventListener('keydown', event => {
  if (preview.hidden || event.ctrlKey || event.altKey || event.metaKey || event.target.closest('input,textarea,select')) return;
  if (event.key === 'Escape') { event.preventDefault(); closePreview(true); }
  else if (event.code === 'Space' && !event.repeat) { event.preventDefault(); if (pinned) closePreview(true); else if (activeTile) showPreview(activeTile, true); }
});
document.addEventListener('pointerdown', event => {
  if (pinned && !preview.contains(event.target) && !event.target.closest('.demo-tile')) closePreview();
});
window.addEventListener('resize', () => { if (activeTile) placePreview(activeTile); });
window.addEventListener('scroll', () => { if (!pinned) closePreview(); }, { passive: true });
document.getElementById('copyAddress').addEventListener('click', async () => {
  const status = document.getElementById('copyStatus');
  try { await navigator.clipboard.writeText('chrome://extensions'); status.textContent = 'הכתובת הועתקה ✓'; }
  catch { status.textContent = 'סמנו את הכתובת והעתיקו ידנית'; }
});
