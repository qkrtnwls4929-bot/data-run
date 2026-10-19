(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const bank = window.DATA_RUN_QUESTIONS?.questions;
  const places = { cafeteria: ['🍽️', '급식실'], restroom: ['🫧', '화장실'], classroom: ['✏️', '교실'], library: ['📚', '도서관'], environment: ['🌳', '학교 정원'], concept: ['💡', '데이터 연구소'] };
  const typeNames = { life: '생활 속 데이터', concept: '데이터 개념', datatype: '수치형 · 범주형' };
  let session, state = 'home', mode = 'all', animationId, lastTime = 0, worldOffset = 0, elapsed = 0, notesAt = 0, fxAt = 0;
  let audio, sound = false, returnFocus, assetsReady = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  try { DataRun.validate(bank); } catch (error) { $('home').innerHTML = '<div class="error-screen"><h1>문제를 불러오지 못했어요</h1><p>게임 폴더의 파일을 모두 함께 열거나, 웹페이지를 새로고침해 주세요.</p></div>'; console.error(error); return; }
  // Load local assets without fetch so the download also runs directly from a file.
  Promise.all(['assets/robot-run.png', 'assets/school-world.png'].map(src => new Promise(resolve => { const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(false); img.src = src; }))).then(results => { assetsReady = results.every(Boolean); if (!assetsReady) console.warn('Some game artwork could not be loaded.'); });
  const soundButtons = [...document.querySelectorAll('.sound-toggle')];
  function initAudio() { try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume().catch(() => {}); } catch {} }
  function tone(frequency, duration, type = 'sine', delay = 0, volume = .035) {
    if (!sound || !audio || audio.state !== 'running') return;
    const osc = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(frequency, at); gain.gain.setValueAtTime(.001, at); gain.gain.linearRampToValueAtTime(volume, at + .012); gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(at); osc.stop(at + duration + .02);
  }
  function melody(ok) { (ok ? [523.25, 659.25, 783.99] : [293.66, 246.94]).forEach((n, i) => tone(n, .18, 'sine', i * .1, .055)); }
  function toggleSound() { sound = !sound; if (sound) initAudio(); soundButtons.forEach(b => { b.setAttribute('aria-pressed', String(sound)); b.setAttribute('aria-label', sound ? '소리 끄기' : '소리 켜기'); if (b.classList.contains('text-btn')) b.textContent = sound ? '♫ 소리 끄기' : '♫ 소리 켜기'; else b.textContent = sound ? '♫' : '♪'; }); }
  function showScreen(id) { ['home', 'game', 'results'].forEach(x => $(x).hidden = x !== id); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function getRoute() { return [...new Set(session.questions.map(q => q.placeKey || 'concept'))]; }
  function renderRoute() {
    const keys = getRoute(), current = session.current?.placeKey || 'concept', reached = new Set(session.history.map(x => x.question.placeKey || 'concept'));
    $('route').replaceChildren();
    keys.forEach((key, i) => {
      if (i) { const line = document.createElement('span'); line.className = 'route-line'; line.setAttribute('aria-hidden', 'true'); $('route').append(line); }
      const step = document.createElement('span'); step.className = 'route-step' + (current === key ? ' active' : reached.has(key) ? ' done' : ''); step.textContent = places[key][0] + ' ' + places[key][1]; if (current === key) step.setAttribute('aria-current', 'step'); $('route').append(step);
    });
    const active = $('route').querySelector('.active'); if (active) $('route').scrollLeft = Math.max(0, active.offsetLeft - $('route').offsetLeft - 35);
  }
  function updateHud() { $('coins').textContent = session.coins; $('combo').textContent = session.combo; const count = session.history.length; $('progress-fill').style.width = (count / session.questions.length * 100) + '%'; $('progress').setAttribute('aria-valuenow', count); $('progress').setAttribute('aria-valuemax', session.questions.length); }
  function renderQuestion(focus = true) {
    const q = session.current, key = q.placeKey || 'concept';
    $('question').textContent = q.question; $('prompt').textContent = q.prompt || '데이터에 대해 배운 내용을 떠올려 보세요.';
    $('question-kind').textContent = typeNames[q.type]; $('question-number').textContent = `문제 ${session.index + 1} / ${session.questions.length}`;
    $('place-icon').textContent = places[key][0]; $('place-name').textContent = places[key][1]; $('stage-label').textContent = key === 'concept' ? '마지막 데이터 미션' : '학교 속 데이터 탐험';
    $('mission-sign').textContent = q.type === 'datatype' ? '수치형일까? 범주형일까?' : q.type === 'concept' ? '배운 내용을 떠올려요!' : '어떤 데이터가 필요할까요?';
    $('scene-caption').textContent = '로봇은 자동으로 달려요. 아래에서 답을 골라 주세요!';
    $('choices').replaceChildren(); $('choices').classList.toggle('two', q.choices.length === 2);
    q.choices.forEach((text, i) => { const b = document.createElement('button'); b.className = 'choice'; b.dataset.index = i; const n = document.createElement('span'); n.className = 'choice-number'; n.textContent = i + 1; const label = document.createElement('span'); label.textContent = text; b.append(n, label); b.addEventListener('click', () => answer(i)); $('choices').append(b); });
    $('explanation').hidden = true; $('answer-hint').hidden = false; $('answer-hint').innerHTML = q.choices.length === 2 ? '답을 클릭하거나 키보드의 <kbd>1</kbd> <kbd>2</kbd>를 눌러요.' : '답을 클릭하거나 키보드의 <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>을 눌러요.';
    $('robot-jump').className = 'robot-jump'; $('coin-trail').className = 'coin-trail'; $('reward').className = 'reward';
    updateHud(); renderRoute(); if (focus) $('question').focus({ preventScroll: true });
  }
  function start(customQuestions) {
    if ($('help-dialog').open) $('help-dialog').close(); if ($('pause-dialog').open) $('pause-dialog').close();
    mode = document.querySelector('input[name="course"]:checked').value;
    session = new DataRun.Session(customQuestions || DataRun.makeCourse(bank, mode));
    state = 'question'; elapsed = worldOffset = notesAt = fxAt = 0; lastTime = 0; $('game').classList.remove('paused');
    showScreen('game'); renderQuestion(false); cancelAnimationFrame(animationId); animationId = requestAnimationFrame(frame); if (sound) initAudio(); $('question').focus({ preventScroll: true });
  }
  function frame(time) {
    if (state !== 'question' && state !== 'feedback') return;
    const dt = lastTime ? Math.min(50, time - lastTime) : 0; lastTime = time; elapsed += dt;
    if (!reducedMotion.matches) { worldOffset += dt * (state === 'feedback' && session.history.at(-1)?.correct ? .12 : .028); $('world').style.backgroundPositionX = -worldOffset + 'px'; }
    if (sound && elapsed > notesAt) { const scale = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23]; tone(scale[Math.floor(elapsed / 420) % scale.length], .12, 'sine', 0, .013); notesAt = elapsed + 420; }
    if (fxAt && elapsed - fxAt > 1300) { $('robot-jump').className = 'robot-jump'; $('reward').className = 'reward'; fxAt = 0; }
    animationId = requestAnimationFrame(frame);
  }
  function answer(index) {
    if (state !== 'question') return;
    const result = session.answer(index); if (!result) return;
    state = 'feedback'; const q = result.question;
    [...$('choices').children].forEach((b, i) => { b.disabled = true; if (i === q.answer) { b.classList.add('correct'); b.querySelector('.choice-number').textContent = '✓'; b.setAttribute('aria-label', '정답: ' + q.choices[i]); } else if (i === index) { b.classList.add('wrong'); b.querySelector('.choice-number').textContent = '×'; b.setAttribute('aria-label', '내가 고른 오답: ' + q.choices[i]); } });
    $('explanation').hidden = false; $('explanation').classList.toggle('try-again', !result.correct); $('answer-hint').hidden = true;
    $('feedback-title').textContent = result.correct ? `정답이에요! 코인 +${result.earned}${result.earned > 10 ? ' · 3연속 보너스!' : ''}` : '괜찮아요! 함께 알아봐요.';
    $('feedback-text').textContent = (result.correct ? '' : `정답은 ‘${q.choices[q.answer]}’이에요. `) + q.explanation;
    $('next').textContent = session.index === session.questions.length - 1 ? '모험 결과 보기 →' : '다음 문제 →';
    $('scene-caption').textContent = result.correct ? '멋져요! 데이터 코인을 모았어요.' : '틀려도 모험은 계속돼요. 해설을 읽어 보세요.';
    $('robot-jump').classList.add(result.correct ? 'jumping' : 'stumble');
    if (result.correct) { $('coin-trail').classList.add('collect'); $('reward').textContent = '+' + result.earned; $('reward').classList.add('show'); }
    fxAt = elapsed || .001; melody(result.correct); updateHud(); $('next').focus({ preventScroll: true });
  }
  function next() { if (state !== 'feedback') return; session.next(); if (session.done) finish(); else { state = 'question'; renderQuestion(); } }
  function finish() {
    state = 'results'; cancelAnimationFrame(animationId); showScreen('results');
    const allCorrect = session.correctCount === session.questions.length;
    $('results-title').textContent = allCorrect ? '최고의 데이터 탐험가!' : '데이터 모험 완료!'; $('result-message').textContent = allCorrect ? '모든 문제를 맞혔어요. 우리 학교의 데이터를 완벽하게 탐험했네요!' : '끝까지 달린 여러분이 멋져요! 헷갈린 문제를 다시 살펴볼까요?';
    $('result-correct').textContent = `${session.correctCount} / ${session.questions.length}`; $('result-coins').textContent = session.coins; $('result-best').textContent = session.bestCombo;
    $('retry-wrong').hidden = allCorrect; $('review').replaceChildren();
    if (allCorrect) { const p = document.createElement('p'); p.className = 'review-perfect'; p.textContent = '✦ 모든 미션 성공! 다른 코스로도 모험을 떠나 보세요.'; $('review').append(p); }
    else { const title = document.createElement('h2'); title.textContent = '다시 보면 더 잘할 수 있어요'; const sub = document.createElement('p'); sub.className = 'review-intro'; sub.textContent = '틀린 문제의 정답과 해설을 모았어요.'; $('review').append(title, sub); session.history.filter(x => !x.correct).forEach(r => { const card = document.createElement('article'); card.className = 'review-card'; const cat = document.createElement('small'); cat.textContent = typeNames[r.question.type] + ' · 원문 ' + r.question.id + '번'; const h = document.createElement('h3'); h.textContent = r.question.question; const chosen = document.createElement('p'); chosen.textContent = '내가 고른 답: ' + r.question.choices[r.choice]; const right = document.createElement('p'); right.className = 'right-answer'; right.textContent = '✓ 정답: ' + r.question.choices[r.question.answer]; const detail = document.createElement('p'); detail.textContent = r.question.explanation; card.append(cat, h, chosen, right, detail); $('review').append(card); }); }
    $('replay').focus({ preventScroll: true }); [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => tone(n, .3, 'sine', i * .15));
  }
  function pause() { if (!['question', 'feedback'].includes(state)) return; returnFocus = document.activeElement; $('pause-dialog').dataset.previous = state; state = 'paused'; cancelAnimationFrame(animationId); $('game').classList.add('paused'); if (audio?.state === 'running') audio.suspend().catch(() => {}); $('pause-dialog').showModal(); }
  function resume() { if (state !== 'paused') return; state = $('pause-dialog').dataset.previous; $('pause-dialog').close(); $('game').classList.remove('paused'); lastTime = 0; animationId = requestAnimationFrame(frame); if (sound) initAudio(); returnFocus?.focus({ preventScroll: true }); }
  function home() { state = 'home'; cancelAnimationFrame(animationId); if ($('pause-dialog').open) $('pause-dialog').close(); $('game').classList.remove('paused'); showScreen('home'); $('start').focus({ preventScroll: true }); }
  $('start').addEventListener('click', () => start()); $('help-start').addEventListener('click', () => start()); $('help').addEventListener('click', () => $('help-dialog').showModal()); $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('next').addEventListener('click', next); $('pause').addEventListener('click', pause); $('resume').addEventListener('click', resume); $('pause-home').addEventListener('click', home); $('home-button').addEventListener('click', pause); $('result-home').addEventListener('click', home); $('replay').addEventListener('click', () => start()); $('retry-wrong').addEventListener('click', () => start(session.wrongQuestions)); soundButtons.forEach(b => b.addEventListener('click', toggleSound));
  $('pause-dialog').addEventListener('cancel', e => { e.preventDefault(); resume(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  document.addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || $('help-dialog').open) return;
    if (e.key === 'Escape' && ['question', 'feedback'].includes(state)) { e.preventDefault(); pause(); return; }
    if (state === 'question' && /^[123]$/.test(e.key)) { e.preventDefault(); answer(Number(e.key) - 1); }
    // Enter and Space keep their native button behavior for accessible keyboard play.
  });
})();
