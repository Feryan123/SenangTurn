(function(){
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PL = 152, PR = 322, BARX = {left:164, right:334};
  var PLAY_PACE = 2, PLAY_GAP = 1200;
  var S = {dir:'right', gear:'normal', step:0, pulleyX:PL, angle:0, clip:null, locked:true, busy:false, pace:1};
  var $ = function(id){return document.getElementById(id);};
  function liftSide(){ return S.dir === 'right' ? 'left' : 'right'; }
  function tween(key, to, ms, done){
    var from = S[key];
    if (reduced || from === to){ S[key] = to; render(); if (done) done(); return; }
    ms *= S.pace;
    var t0 = performance.now();
    function f(now){
      var p = Math.min(1, (now - t0) / ms);
      var e = p < .5 ? 2*p*p : 1 - Math.pow(-2*p + 2, 2)/2;
      S[key] = from + (to - from) * e; render();
      if (p < 1) requestAnimationFrame(f); else if (done) done();
    }
    requestAnimationFrame(f);
  }
  function render(){
    var dx = S.pulleyX - PL;
    $('trolley').setAttribute('transform', 'translate(' + dx + ',0)');
    $('pin').setAttribute('class', S.locked ? 'pin-ok' : 'pin-warn');
    var lift = S.angle / 30 * 46;
    var side = S.clip;
    var yL = 256 - (side === 'left' ? lift : 0);
    var yR = 256 - (side === 'right' ? lift : 0);
    $('sheet').setAttribute('d', 'M164 ' + yL + ' Q186 288 249 289 Q312 288 334 ' + yR);
    $('barL').setAttribute('y', yL - 12);
    $('barR').setAttribute('y', yR - 12);
    var rot = 0, pdx = 0;
    if (side === 'left'){ rot = S.angle; pdx = S.angle * 0.55; }
    if (side === 'right'){ rot = -S.angle; pdx = -S.angle * 0.55; }
    $('person').setAttribute('transform', 'translate(' + pdx + ',' + (-S.angle*0.25) + ') rotate(' + rot + ' 249 262)');
    var px = S.pulleyX, top = 'M58 212 L58 62 Q58 62 66 62 L' + px + ' 62';
    var d;
    if (side){ var by = (side === 'left' ? yL : yR) - 12; d = top + ' M' + (px + 12) + ' 74 L' + BARX[side] + ' ' + by; }
    else { d = top + ' M' + (px + 12) + ' 74 L' + (px + 12) + ' 118 m-4 0 a4 4 0 1 0 8 0'; }
    $('rope').setAttribute('d', d);
    var turns = S.gear === 'easy' ? 8 : 4;
    var th = S.angle * (turns * 360 / 30) * Math.PI / 180;
    $('chipTurns').textContent = 'Handle turns: ' + (S.angle / 30 * turns).toFixed(1) + ' of ' + turns;
    var ky = 228 - 22 * Math.cos(th);
    $('crankArm').setAttribute('y2', ky);
    $('crankGrip').setAttribute('y1', ky); $('crankGrip').setAttribute('y2', ky);
    var kn = $('crankKnob'); kn.setAttribute('cy', ky); kn.setAttribute('r', (5 + 2 * Math.sin(th)).toFixed(2));
    $('crank').style.opacity = (0.75 + 0.25 * Math.sin(th) * 0.5 + 0.125).toFixed(2);
    $('stop').setAttribute('visibility', S.angle >= 29.5 ? 'visible' : 'hidden');
    var cp = $('chipPin'); cp.textContent = S.locked ? 'Pin locked' : 'Pin released, sliding'; cp.className = 'chip ' + (S.locked ? 'ok' : 'warn');
    var cr = $('chipRope'); cr.textContent = side ? 'Rope clipped to ' + side + ' edge' : 'Rope not clipped'; cr.className = 'chip' + (side ? ' ok' : '');
    var a = Math.round(S.angle);
    var cl = $('chipLift'); cl.textContent = a === 0 ? 'Flat' : 'Lifted ' + a + '°' + (a >= 30 ? ' (stop)' : ''); cl.className = 'chip' + (a >= 30 ? ' warn' : '');
    $('chipForce').textContent = 'Crank force ≈ ' + (S.gear === 'easy' ? '1.6' : '3.1') + ' kg';
    $('angle').value = a; $('angleOut').textContent = a + '°';
  }
  function setStepUI(){
    var lis = $('steps').children;
    for (var i = 0; i < lis.length; i++){
      lis[i].className = i < S.step ? 'done' : (i === S.step ? 'now' : '');
      if (i === S.step) lis[i].setAttribute('aria-current','step'); else lis[i].removeAttribute('aria-current');
    }
    $('angle').disabled = S.busy || S.step < 3;
    $('hint').textContent = S.step >= 3 ? 'Drag to crank the handle. The ratchet holds any angle.' : 'Reach the Crank step to turn the handle yourself.';
    $('back').disabled = S.busy || S.step === 0;
    $('next').disabled = S.busy || S.step === 4;
    $('play').disabled = S.busy;
    ['dirR','dirL'].forEach(function(id){ $(id).disabled = S.busy; });
  }
  function runStep(i, done){
    S.busy = true; S.step = i; setStepUI();
    var fin = function(){ S.busy = false; setStepUI(); if (done) done(); };
    if (i === 0){ S.clip = null; tween('angle', 0, 500, fin); }
    else if (i === 1){
      var target = liftSide() === 'left' ? PL : PR;
      if (Math.abs(S.pulleyX - target) < 1){ fin(); return; }
      S.locked = false; render();
      setTimeout(function(){ tween('pulleyX', target, 1100, function(){ S.locked = true; render(); fin(); }); }, reduced ? 0 : 300 * S.pace);
    }
    else if (i === 2){ S.clip = liftSide(); render(); setTimeout(fin, reduced ? 0 : 350 * S.pace); }
    else if (i === 3){ tween('angle', 30, S.gear === 'easy' ? 4600 : 2400, fin); }
    else if (i === 4){ tween('angle', 0, 1400, fin); }
  }
  function reset(){ S.step = 0; S.clip = null; S.angle = 0; render(); setStepUI(); }
  $('next').addEventListener('click', function(){ if (S.step < 4) runStep(S.step + 1); });
  $('back').addEventListener('click', function(){
    if (S.step <= 0) return;
    var s = S.step - 1;
    if (s <= 2){ S.angle = 0; }
    if (s <= 1){ S.clip = null; }
    if (s === 3){ S.angle = 30; }
    S.step = s; render(); setStepUI();
  });
  $('play').addEventListener('click', function(){
    reset(); var i = 0; S.pace = PLAY_PACE;
    (function go(){
      if (i > 4){ S.pace = 1; return; }
      runStep(i, function(){ i++; setTimeout(go, reduced || i > 4 ? 0 : PLAY_GAP); });
    })();
  });
  $('angle').addEventListener('input', function(e){ S.angle = +e.target.value; render(); });
  function setDir(d){ S.dir = d; $('dirR').setAttribute('aria-pressed', d === 'right'); $('dirL').setAttribute('aria-pressed', d === 'left'); reset(); }
  $('dirR').addEventListener('click', function(){ setDir('right'); });
  $('dirL').addEventListener('click', function(){ setDir('left'); });
  function setGear(g){
    S.gear = g; $('gearN').setAttribute('aria-pressed', g === 'normal'); $('gearE').setAttribute('aria-pressed', g === 'easy');
    render();
  }
  $('gearN').addEventListener('click', function(){ setGear('normal'); });
  $('gearE').addEventListener('click', function(){ setGear('easy'); });
  render(); setStepUI();
})();
