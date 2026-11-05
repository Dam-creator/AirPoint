(() => {
  'use strict';
  const $ = (q) => document.querySelector(q);
  const desktop = $('#desktop'), cursor = $('#virtual-cursor'), mini = $('#mini-cursor');
  const windows = [...document.querySelectorAll('[data-window]')];
  const storageKey = 'airpointer-web:v1';
  let preferences = { stability: 'auto', sensitivity: 1, calibrated: false };
  try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (['auto', 'wear'].includes(saved.stability)) preferences.stability = saved.stability; if (Number.isFinite(saved.sensitivity)) preferences.sensitivity = Math.max(.6, Math.min(1.8, saved.sensitivity)); preferences.calibrated = saved.calibrated === true; } catch (_) {}
  let running = false, dragging = null, scrolling = false, spaceHeld = false, point = {x: .44, y: .45}, zIndex = 2, calibrationStep = 0;
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch (_) {} };
  const status = (message) => { $('#action-status').textContent = message; };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const size = () => ({w: desktop.clientWidth, h: desktop.clientHeight});
  function draw() {
    const {w,h} = size(); cursor.style.transform = `translate(${point.x*w}px,${point.y*h}px)`;
    mini.style.left = `${clamp(point.x*100, 5, 89)}%`; mini.style.top = `${clamp(point.y*100, 7, 77)}%`;
  }
  function modeUI() {
    $('#gesture-drag').setAttribute('aria-pressed', String(!!dragging)); $('#gesture-scroll').setAttribute('aria-pressed', String(scrolling));
    $('#gesture-drag strong').textContent = dragging ? '放下' : '拖拽';
    $('#desktop-mode').textContent = dragging ? '拖拽中 · 单按放下' : scrolling ? '滚动中 · 三按退出' : '体验桌面';
  }
  function activate() {
    if (running) return; running = true; document.body.classList.add('running');
    $('#toggle-control span').textContent = '暂停控制'; $('#toggle-control svg use').setAttribute('href', '#i-pointer');
    $('#control-state').innerHTML = '<i></i>网页演示 · 控制中'; $('#device-state').textContent = '演示设备 · ' + (preferences.calibrated ? '已校准' : '已就绪');
    status(preferences.stability === 'wear' ? '按住空格或桌面移动，松开锁定' : '移动指向，试试下方的三个手势');
    draw(); desktop.focus({preventScroll:true});
  }
  function pause() {
    running = false; dragging = null; scrolling = false; spaceHeld = false; document.body.classList.remove('running');
    $('#toggle-control span').textContent = '使用鼠标'; $('#toggle-control svg use').setAttribute('href', '#i-play');
    $('#control-state').innerHTML = '<i></i>已暂停'; $('#device-state').textContent = '演示设备 · 已暂停'; modeUI(); status('点击「使用鼠标」继续');
  }
  function hitWindow() {
    const d = desktop.getBoundingClientRect(), x = d.left + point.x*d.width, y = d.top + point.y*d.height;
    return [...windows].sort((a,b) => (+b.style.zIndex||1) - (+a.style.zIndex||1)).find(el => { const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom; }) || null;
  }
  function focusWindow(win) { windows.forEach(w => w.classList.toggle('active', w===win)); win.style.zIndex = String(++zIndex); }
  function ripple() { const {w,h}=size(), el=$('#click-ripple');el.style.left=`${point.x*w-17}px`;el.style.top=`${point.y*h-17}px`;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash'); }
  function click() {
    if (!running) activate();
    if (dragging) { dragging=null;modeUI();status('已放下窗口');ripple();return; }
    const win=hitWindow(); ripple();
    if (!win) { status('已点击桌面'); return; }
    focusWindow(win); const d=desktop.getBoundingClientRect();
    const x=d.left+point.x*d.width,y=d.top+point.y*d.height;
    const card=[...win.querySelectorAll('[data-card]')].find(c=>{const r=c.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;});
    if (card) { win.querySelectorAll('[data-card]').forEach(c=>c.classList.toggle('chosen',c===card));$('#collection-label').textContent=`SELECTED / ${card.dataset.card}`;status('已选择作品 '+card.dataset.card); }
    else status('已选择 '+(win.id==='notes-window'?'Notes':'Collection')+' 窗口');
  }
  function toggleDrag() {
    if (!running) activate();
    if (dragging) { dragging=null;modeUI();status('已放下窗口');return; }
    scrolling=false; const win=hitWindow()||$('#notes-window');focusWindow(win);
    const d=desktop.getBoundingClientRect(),r=win.getBoundingClientRect();dragging={win,dx:point.x*d.width-(r.left-d.left),dy:point.y*d.height-(r.top-d.top)};
    status('窗口已提起，移动后单按放下');modeUI();desktop.focus({preventScroll:true});
  }
  function toggleScroll() {
    if (!running) activate();dragging=null;scrolling=!scrolling;modeUI();
    if (scrolling) { focusWindow($('#notes-window'));status('上下移动或使用 ↑ ↓ 滚动 Notes'); }
    else status('已回到指针控制');desktop.focus({preventScroll:true});
  }
  function move(x,y,force=false) {
    if (!running) return;const {w,h}=size();
    if (!force && preferences.stability==='wear' && !spaceHeld) return;
    const next={x:clamp(x,6/w,(w-25)/w),y:clamp(y,32/h,(h-30)/h)};
    if (!force && preferences.stability==='auto' && !dragging && Math.hypot((next.x-point.x)*w,(next.y-point.y)*h)<4) return;
    if (scrolling) $('#note-content').scrollTop += (next.y-point.y)*h*2.2;
    point=next;
    if (dragging) { const el=dragging.win;el.style.left=`${clamp(point.x*w-dragging.dx,0,w-el.offsetWidth)}px`;el.style.top=`${clamp(point.y*h-dragging.dy,29,h-el.offsetHeight)}px`; }
    draw();
  }
  $('#toggle-control').addEventListener('click',()=>running?pause():activate());
  $('#gesture-click').addEventListener('click',click);$('#gesture-drag').addEventListener('click',toggleDrag);$('#gesture-scroll').addEventListener('click',toggleScroll);
  desktop.addEventListener('pointermove',e=>{const r=desktop.getBoundingClientRect();const force=e.buttons!==0;const gain=preferences.sensitivity;move(.5+((e.clientX-r.left)/r.width-.5)*gain,.5+((e.clientY-r.top)/r.height-.5)*gain,force);});
  desktop.addEventListener('click',e=>{if(!running)return;e.preventDefault();click();});
  desktop.addEventListener('wheel',e=>{if(!running||!scrolling)return;e.preventDefault();$('#note-content').scrollTop+=e.deltaY;},{passive:false});
  document.addEventListener('keydown',e=>{
    if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if(e.key==='Escape'){if(running)pause();$('#pose-menu').hidden=true;$('#pose-menu-button').setAttribute('aria-expanded','false');return;}
    if(!running)return;
    if(e.code==='Space'){e.preventDefault();spaceHeld=true;return;}
    if(['1','2','3'].includes(e.key)){e.preventDefault();({1:click,2:toggleDrag,3:toggleScroll})[e.key]();return;}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();const dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0,dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
    if(preferences.stability==='wear'&&!spaceHeld)return;
    if(scrolling){$('#note-content').scrollTop+=dy*32;return;}move(point.x+dx*.025,point.y+dy*.035,true);
  });
  document.addEventListener('keyup',e=>{if(e.code==='Space')spaceHeld=false;});window.addEventListener('blur',()=>{spaceHeld=false;});
  $('#pose-menu-button').addEventListener('click',e=>{e.stopPropagation();const menu=$('#pose-menu');menu.hidden=!menu.hidden;$('#pose-menu-button').setAttribute('aria-expanded',String(!menu.hidden));});
  document.addEventListener('click',e=>{if(!e.target.closest('.pose-wrap')){$('#pose-menu').hidden=true;$('#pose-menu-button').setAttribute('aria-expanded','false');}});
  $('#recenter').addEventListener('click',()=>{point={x:.5,y:.5};dragging=null;modeUI();draw();status('指针已归中');$('#pose-menu').hidden=true;$('#pose-menu-button').setAttribute('aria-expanded','false');});
  function updateCalibration() { const dialog=$('#calibration-dialog');dialog.classList.remove('step-1','step-2');if(calibrationStep)dialog.classList.add(`step-${calibrationStep}`);$('#calibration-title').textContent=['点击中心靶点','点击右侧靶点','点击上方靶点'][calibrationStep];$('#calibration-progress').textContent=`${calibrationStep+1} / 3`; }
  $('#calibrate').addEventListener('click',()=>{calibrationStep=0;updateCalibration();$('#pose-menu').hidden=true;$('#pose-menu-button').setAttribute('aria-expanded','false');$('#calibration-dialog').showModal();});
  $('#calibration-target').addEventListener('click',()=>{calibrationStep++;if(calibrationStep===3){preferences.calibrated=true;save();$('#calibration-dialog').close();$('#device-state').textContent='演示设备 · 已校准';point={x:.5,y:.5};draw();status('网页校准已保存');}else updateCalibration();});
  function syncPreferences(){document.querySelector(`input[name=stability][value=${preferences.stability}]`).checked=true;$('#sensitivity').value=preferences.sensitivity;$('#sensitivity-value').textContent=preferences.sensitivity.toFixed(1)+'×';$('#movement-hint').textContent=preferences.stability==='wear'?'按住空格 / 桌面移动，松开锁定':'移动鼠标 / 方向键指向';}
  document.querySelectorAll('[name=stability]').forEach(input=>input.addEventListener('change',()=>{preferences.stability=input.value;save();syncPreferences();}));
  $('#sensitivity').addEventListener('input',e=>{preferences.sensitivity=Number(e.target.value);save();syncPreferences();});
  document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{const dialog=document.getElementById(button.dataset.open);dialog.showModal();if(dialog.id==='film-dialog')$('#product-film').play().catch(()=>{});}));
  document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.close-button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{if(dialog.id==='film-dialog')$('#product-film').pause();});});
  fetch('downloads/release.json').then(r=>r.ok?r.json():Promise.reject()).then(release=>{if(Number.isFinite(release.bytes))$('#download-size').textContent=(release.bytes/1048576).toFixed(1)+' MB';}).catch(()=>{});
  new ResizeObserver(()=>{windows.forEach(el=>{if(el.style.left){const {w,h}=size();el.style.left=clamp(parseFloat(el.style.left),0,w-el.offsetWidth)+'px';el.style.top=clamp(parseFloat(el.style.top),29,h-el.offsetHeight)+'px';}});draw();}).observe(desktop);
  syncPreferences();draw();if(preferences.calibrated)$('#device-state').textContent='演示设备 · 已校准';
})();
