"use strict";
const scene = new URLSearchParams(location.search).get('scene') || 'hover';
document.body.dataset.scene = scene;
if (scene === 'pinned') {
  document.getElementById('sceneHeading').textContent = 'מצמידים. מגדילים. מסתכלים מקרוב.';
  document.getElementById('sceneSubtitle').textContent = 'זום, גרירה וסיבוב, בלי לאבד את המקום בעמוד.';
}
if (scene === 'settings') document.getElementById('settingsFrame').hidden = false;
async function showScene() {
  document.getElementById('showPreview').style.opacity='0';
  if (scene === 'settings') {document.getElementById('captureStatus').textContent='חלון הגדרות · 1.0.2';return;}
  await chrome.storage.local.set({maxSize:scene==='pinned'?58:45,position:scene==='pinned'?'center':'cursor'});
  const target=document.getElementById('targetImage'),rect=target.getBoundingClientRect();
  target.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,composed:true,pointerType:'mouse',clientX:rect.right-12,clientY:rect.top+rect.height/2}));
  if(scene==='pinned') {
    setTimeout(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true})),250);
  }
  document.getElementById('captureStatus').textContent='תצוגת התוסף · 1.0.2';
}
document.getElementById('showPreview').addEventListener('click',showScene);
document.getElementById('targetImage').addEventListener('click',showScene);
