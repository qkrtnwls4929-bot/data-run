(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const bank = window.DATA_RUN_QUESTIONS?.questions;
  const typeNames = { life: '생활 속 데이터', concept: '데이터 개념', datatype: '수치형 · 범주형' };
  const themes = [
    { key: 'cafeteria', icon: '🍽️', name: '급식실' },
    { key: 'restroom', icon: '🫧', name: '화장실' },
    { key: 'classroom', icon: '✏️', name: '교실' },
    { key: 'library', icon: '📚', name: '도서관' },
    { key: 'environment', icon: '🌳', name: '생활환경' }
  ];
  let state = 'home', mode = 'short', model, questions = [], questionIndex = 0, activeQuestion = null;
  let history = [], objects = [], animationId = 0, lastTime = 0, elapsed = 0, nextQuizAt = 20;
  let spawnIn = 1.2, worldOffset = 0, stageIndex = -1, stageQuizCount = 0, audio = null, invincible = 0, fallReason = '';
  const player = { y: 0, vy: 0, grounded: true, jumps: 0, coyote: .09, falling: false };

  try { DataRun.validate(bank); } catch (error) {
    $('home').innerHTML = '<div class="error-screen"><h1>문제를 불러오지 못했어요</h1><p>게임 파일을 모두 함께 열어 주세요.</p></div>';
    console.error(error); return;
  }

  function showScreen(id) { ['home', 'game', 'results'].forEach(x => $(x).hidden = x !== id); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function initAudio() { try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume().catch(() => {}); } catch {} }
  function tone(freq, duration = .08, type = 'sine', volume = .035, delay = 0) {
    if (!audio || audio.state !== 'running') return;
    const osc = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(freq, at); gain.gain.setValueAtTime(.001, at); gain.gain.linearRampToValueAtTime(volume, at + .01); gain.gain.exponentialRampToValueAtTime(.001, at + duration);
    osc.connect(gain); gain.connect(audio.destination); osc.start(at); osc.stop(at + duration + .02);
  }
  function coinSound() { const notes = [523, 587, 659, 784, 698, 880]; tone(notes[model.coins % notes.length], .075, 'sine', .028); }
  function jumpSound(second) { tone(second ? 620 : 450, .11, 'triangle', .03); }
  function hitSound() { tone(115, .18, 'sawtooth', .06); tone(82, .22, 'square', .025, .05); }
  function quizSound(correct) { (correct ? [523, 659, 784] : [220, 175]).forEach((n, i) => tone(n, .15, 'sine', .04, i * .09)); }

  function start() {
    initAudio();
    if ($('help-dialog').open) $('help-dialog').close();
    if ($('pause-dialog').open) $('pause-dialog').close();
    if ($('bonus-dialog').open) $('bonus-dialog').close();
    mode = document.querySelector('input[name="course"]:checked')?.value || mode;
    questions = DataRun.makeBonusCourse(bank, mode);
    questionIndex = 0; history = []; objects = []; $('objects').replaceChildren();
    model = new DataRun.RunnerModel(9999, 1);
    Object.assign(player, { y: 0, vy: 0, grounded: true, jumps: 0, coyote: .09, falling: false });
    elapsed = worldOffset = 0; nextQuizAt = 15; spawnIn = 1.05; stageIndex = -1; stageQuizCount = 0; invincible = 0; fallReason = '';
    $('game').className = 'game-screen'; $('runner').style.transform = 'translateY(0)';
    updateHud(); updateTheme(0); showScreen('game'); state = 'countdown';
    countdown(['3', '2', '1', 'GO!'], 0);
  }
  function countdown(words, index) {
    if (state !== 'countdown') return;
    if (index >= words.length) { $('countdown').textContent = ''; state = 'running'; lastTime = performance.now(); cancelAnimationFrame(animationId); animationId = requestAnimationFrame(frame); return; }
    $('countdown').textContent = words[index]; tone(330 + index * 90, .08, 'sine', .03);
    setTimeout(() => countdown(words, index + 1), index === words.length - 1 ? 450 : 650);
  }

  function getSpeed() {
    const level = Math.min(4, Math.floor(elapsed / 60));
    const responsiveBase = Math.max(200, Math.min(320, $('scene').clientWidth * .25));
    const stageBoosts = [105, 165, 240, 330, 440];
    return Math.min(700, responsiveBase + stageBoosts[level]);
  }
  function frame(now) {
    if (state !== 'running') return;
    const dt = Math.min(.033, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
    elapsed += dt; invincible = Math.max(0, invincible - dt);
    const speed = getSpeed(), level = Math.min(4, Math.floor(elapsed / 60));
    updateTheme(level); updatePhysics(dt); moveWorld(dt, speed); moveObjects(dt, speed); maybeSpawn(dt, level);
    model.travel(speed * dt / 25); updateHud();
    if (stageQuizCount < 3 && elapsed >= nextQuizAt && player.grounded && !nearGap()) openBonus();
    if (state === 'running') animationId = requestAnimationFrame(frame);
  }
  function updatePhysics(dt) {
    const over = overGap();
    if (player.grounded && !over) player.coyote = .09;
    else player.coyote = Math.max(0, player.coyote - dt);
    if (over && player.y <= 1 && !player.falling) {
      player.grounded = false; player.falling = true; player.vy = Math.min(player.vy, 0);
    }
    if (!player.grounded) {
      const gravity = player.vy > 0 ? 1750 : 2550;
      player.vy -= gravity * dt; player.y += player.vy * dt;
      if (player.y <= 0 && !over && !player.falling) { player.y = 0; player.vy = 0; player.grounded = true; player.jumps = 0; }
      if (player.y < -220) { triggerFall('낭떠러지에 빠졌어요. 다음에는 점프 타이밍을 조금 앞당겨 보세요!'); return; }
    }
    $('runner').style.transform = `translateY(${-player.y}px)`;
    $('runner').classList.toggle('airborne', !player.grounded);
  }
  function jump() {
    if (state !== 'running' || player.falling) return;
    const canFirst = player.grounded || player.coyote > 0;
    if (canFirst) { player.grounded = false; player.coyote = 0; player.jumps = 1; player.vy = 710; jumpSound(false); }
    else if (player.jumps < 2) { player.jumps = 2; player.vy = 655; jumpSound(true); showFloat('2단 점프!', '#d9c2ff'); }
  }
  function moveWorld(dt, speed) {
    worldOffset += speed * dt;
    $('world').style.backgroundPositionX = `${-worldOffset}px`;
  }

  function maybeSpawn(dt, level) {
    spawnIn -= dt; if (spawnIn > 0) return;
    const roll = Math.random(), startX = $('scene').clientWidth + 80;
    if (elapsed < 3 || roll < .35) spawnCoinLine(startX, level);
    else if (roll < .65) { spawnObject('obstacle', startX, 0, 55, false); spawnObject('coin', startX + 5, 92, 48); }
    else if (roll < .87) { spawnObject('obstacle high', startX, 0, 62, false); spawnObject('coin', startX + 8, 150, 48); }
    else { const width = 112 + level * 9; spawnObject('gap', startX, 0, width, false); [0,1,2].forEach(i => spawnObject('coin', startX + 20 + i * (width - 40) / 2, 72 + (i === 1 ? 55 : 10), 45)); }
    spawnIn = Math.max(.74, 1.22 - level * .08) + Math.random() * .28;
  }
  function spawnCoinLine(startX, level) {
    const pattern = level > 1 && Math.random() > .5 ? [0, 48, 100, 48, 0] : [0, 0, 0, 0];
    pattern.forEach((height, i) => spawnObject('coin', startX + i * 58, height, 48));
  }
  function spawnObject(kind, x, height, width, collectible = true) {
    const el = document.createElement('div'); el.className = `game-object ${kind}`;
    el.style.width = width + 'px'; if (height) el.style.bottom = `calc(18% + ${height}px)`;
    $('objects').append(el); objects.push({ el, type: kind.split(' ')[0], high: kind.includes('high'), x, height, width, collected: false, hit: false, collectible });
  }
  function moveObjects(dt, speed) {
    const runnerX = $('scene').clientWidth * (innerWidth <= 760 ? .08 : .18), sensor = 25;
    for (const obj of objects) {
      obj.x -= speed * dt; obj.el.style.transform = `translateX(${obj.x}px)`;
      const overlap = obj.x < runnerX + 100 + sensor && obj.x + obj.width > runnerX + 25 - sensor;
      if (obj.type === 'coin' && !obj.collected && overlap && Math.abs(player.y - obj.height) < 88 + sensor) collectCoin(obj);
      if (obj.type === 'obstacle' && !obj.hit && overlap) {
        const safeHeight = obj.high ? 116 : 58;
        if (player.y < safeHeight) hitObstacle(obj);
        else obj.hit = true;
      }
    }
    objects.filter(o => o.x + o.width < -100 || o.collected).forEach(o => o.el.remove());
    objects = objects.filter(o => o.x + o.width >= -100 && !o.collected);
  }
  function collectCoin(obj) { obj.collected = true; model.collectCoin(); coinSound(); showFloat('+10', '#fff19a'); }
  function hitObstacle(obj) {
    obj.hit = true; if (invincible > 0) return; invincible = 1.25; model.hitObstacle(); hitSound();
    $('game').classList.add('shake'); $('runner').classList.add('hit'); setTimeout(() => { $('game').classList.remove('shake'); $('runner').classList.remove('hit'); }, 560);
    $('scene-message').textContent = model.hearts > 0 ? '괜찮아요! 다음 장애물은 점프로 피해요.' : '체력이 모두 닳아 균형을 잃었어요!';
    if (model.hearts <= 0) triggerFall('장애물에 한 번 부딪혀 달리기가 끝났어요.');
  }
  function overGap() {
    const runnerX = $('scene').clientWidth * (innerWidth <= 760 ? .08 : .18) + 45;
    return objects.some(o => o.type === 'gap' && o.x < runnerX + 52 && o.x + o.width > runnerX);
  }
  function nearGap() {
    const runnerX = $('scene').clientWidth * (innerWidth <= 760 ? .08 : .18);
    return objects.some(o => o.type === 'gap' && o.x < runnerX + 260 && o.x + o.width > runnerX - 60);
  }
  function showFloat(text, color) { const el = $('floating-score'); el.textContent = text; el.style.color = color; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function updateHud() {
    if (!model) return;
    $('score').textContent = model.score.toLocaleString(); $('coins').textContent = model.coins; $('hearts').textContent = '♥'.repeat(model.hearts) + '♡'.repeat(model.maxHearts - model.hearts);
    const mins = Math.floor(elapsed / 60), secs = Math.floor(elapsed % 60); $('bonus-count').textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    $('run-progress-fill').style.width = `${Math.min(100, elapsed % 60 / 60 * 100)}%`;
  }
  function updateTheme(level) {
    const current = Math.floor(elapsed / 60) % themes.length;
    if (current !== stageIndex) {
      stageIndex = current; const theme = themes[current];
      stageQuizCount = 0; nextQuizAt = Math.floor(elapsed / 60) * 60 + 15;
      $('scene').className = `scene theme-${theme.key} speed-${level + 1}`;
      $('theme-banner').innerHTML = `<small>${current + 1}번째 장소 · 1분 구간</small><b>${theme.icon} ${theme.name}</b>`;
      $('scene-message').textContent = `${theme.name}에서 필요한 데이터를 찾아 달려요!`;
    } else $('scene').className = `scene theme-${themes[current].key} speed-${level + 1}`;
    $('stage-text').textContent = `${themes[current].name} · 속도 ${level + 1}단계${level === 4 ? ' (최고 속도)' : ''}`;
  }

  function openBonus() {
    state = 'quiz'; cancelAnimationFrame(animationId); activeQuestion = questions[questionIndex % questions.length]; questionIndex++; stageQuizCount++;
    $('bonus-number').textContent = `보너스 문제 ${history.length + 1}`; $('question-kind').textContent = typeNames[activeQuestion.type];
    $('question').textContent = activeQuestion.question; $('prompt').textContent = activeQuestion.prompt || '생활 속 문제를 해결하려면 어떤 데이터가 필요할까요?';
    $('choices').replaceChildren(); $('feedback').hidden = true; $('feedback').className = 'feedback';
    activeQuestion.choices.forEach((choice, i) => { const button = document.createElement('button'); button.className = 'choice'; button.innerHTML = `<span class="choice-number">${i + 1}</span><span>${choice}</span>`; button.addEventListener('click', () => answerBonus(i)); $('choices').append(button); });
    $('bonus-dialog').showModal(); $('question').focus();
  }
  function answerBonus(choice) {
    if (state !== 'quiz' || $('feedback').hidden === false) return;
    const correct = choice === activeQuestion.answer, reward = correct ? 20 + Math.floor(Math.random() * 31) : 20;
    const delta = model.answerBonus(correct, reward); history.push({ question: activeQuestion, choice, correct, delta });
    [...$('choices').children].forEach((button, i) => { button.disabled = true; if (i === activeQuestion.answer) button.classList.add('correct'); else if (i === choice) button.classList.add('wrong'); });
    $('feedback').hidden = false; $('feedback').classList.toggle('wrong', !correct);
    $('feedback-title').textContent = correct ? `정답! 데이터 코인 +${reward}` : '아쉬워요! 데이터 코인 -20';
    $('feedback-text').textContent = (correct ? '' : `정답은 ‘${activeQuestion.choices[activeQuestion.answer]}’이에요. `) + activeQuestion.explanation;
    quizSound(correct); updateHud(); $('continue').focus();
  }
  function continueRun() {
    if (state !== 'quiz' || $('feedback').hidden) return;
    $('bonus-dialog').close(); nextQuizAt = stageQuizCount < 3 ? Math.floor(elapsed / 60) * 60 + 15 * (stageQuizCount + 1) : Infinity; state = 'running'; lastTime = performance.now(); animationId = requestAnimationFrame(frame);
  }

  function triggerFall(reason) {
    if (!['running','countdown'].includes(state)) return;
    state = 'falling'; fallReason = reason; cancelAnimationFrame(animationId); hitSound(); finish();
  }
  function finish() {
    state = 'results'; showScreen('results');
    $('results-title').textContent = '이번 달리기 종료!'; $('result-message').textContent = fallReason;
    $('result-score').textContent = model.score.toLocaleString(); $('result-coins').textContent = model.coins; $('result-correct').textContent = `${model.bonusCorrect} / ${model.bonusAnswered}`; $('result-distance').textContent = `${Math.floor(model.distance)}m`; renderReview();
  }
  function renderReview() {
    $('review').replaceChildren(); if (!history.length) return;
    const title = document.createElement('h2'); title.textContent = '보너스 문제 학습 기록'; $('review').append(title);
    history.forEach(item => { const card = document.createElement('article'); card.className = 'review-card'; const chosen = item.question.choices[item.choice]; card.innerHTML = `<b>${item.correct ? '✓ 정답' : '다시 보기'} · ${item.question.question}</b><p>선택: ${chosen}</p><p class="right">정답: ${item.question.choices[item.question.answer]}</p><p>${item.question.explanation}</p>`; $('review').append(card); });
  }

  function pause() { if (state !== 'running') return; state = 'paused'; cancelAnimationFrame(animationId); $('game').classList.add('paused'); $('pause-dialog').showModal(); }
  function resume() { if (state !== 'paused') return; $('pause-dialog').close(); $('game').classList.remove('paused'); state = 'running'; lastTime = performance.now(); animationId = requestAnimationFrame(frame); }
  function goHome() { state = 'home'; cancelAnimationFrame(animationId); ['help-dialog','bonus-dialog','pause-dialog'].forEach(id => { if ($(id).open) $(id).close(); }); showScreen('home'); }

  $('start').addEventListener('click', start); $('help').addEventListener('click', () => $('help-dialog').showModal()); $('close-help').addEventListener('click', () => $('help-dialog').close()); $('help-start').addEventListener('click', start);
  $('jump').addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); jump(); }); $('scene').addEventListener('pointerdown', event => { if (!event.target.closest('button')) jump(); });
  $('continue').addEventListener('click', continueRun); $('pause').addEventListener('click', pause); $('resume').addEventListener('click', resume); $('home-button').addEventListener('click', goHome); $('pause-home').addEventListener('click', goHome); $('result-home').addEventListener('click', goHome); $('replay').addEventListener('click', start);
  document.addEventListener('keydown', event => {
    if ((event.code === 'Space' || event.code === 'ArrowUp') && state === 'running') { event.preventDefault(); jump(); }
    if (state === 'quiz' && /^[1-3]$/.test(event.key)) answerBonus(Number(event.key) - 1);
    if (event.key === 'Escape' && state === 'paused') resume();
  });
})();
