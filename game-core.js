(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DataRun = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const placeKeys = ['cafeteria', 'restroom', 'classroom', 'library', 'environment'];
  function validate(questions) {
    if (!Array.isArray(questions) || !questions.length) throw new Error('문제 데이터가 없습니다.');
    const ids = new Set();
    questions.forEach(q => {
      if (ids.has(q.id) || !q.question || !q.explanation || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 3 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) throw new Error('문제 데이터 형식이 올바르지 않습니다: ' + q.id);
      ids.add(q.id);
    });
    return true;
  }
  function shuffle(list, random = Math.random) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function makeCourse(bank, mode, random = Math.random) {
    validate(bank);
    if (mode === 'datatype') return bank.filter(q => q.type === 'datatype');
    if (mode === 'short') return shuffle([
      ...shuffle(bank.filter(q => q.type === 'life'), random).slice(0, 4),
      ...shuffle(bank.filter(q => q.type === 'concept'), random).slice(0, 3),
      ...shuffle(bank.filter(q => q.type === 'datatype'), random).slice(0, 3)
    ], random);
    return [...placeKeys.flatMap(key => bank.filter(q => q.placeKey === key)), ...bank.filter(q => !q.placeKey)];
  }
  function makeBonusCourse(bank, mode, random = Math.random) {
    validate(bank);
    if (mode === 'datatype') return shuffle(bank.filter(q => q.type === 'datatype'), random);
    if (mode === 'short') return shuffle([
      ...shuffle(bank.filter(q => q.type === 'life'), random).slice(0, 2),
      ...shuffle(bank.filter(q => q.type === 'concept'), random).slice(0, 1),
      ...shuffle(bank.filter(q => q.type === 'datatype'), random).slice(0, 2)
    ], random);
    return makeCourse(bank, 'short', random);
  }
  function makePlaceBonusCourse(bank, random = Math.random) {
    validate(bank);
    const course = Object.fromEntries(placeKeys.map(key => [key, shuffle(bank.filter(q => q.placeKey === key), random).slice(0, 3)]));
    const selected = Object.values(course).flat();
    if (selected.length !== 15 || new Set(selected.map(q => q.id)).size !== 15 || placeKeys.some(key => course[key].length !== 3)) {
      throw new Error('장소별 보너스 문제를 만들 수 없습니다.');
    }
    return course;
  }
  class Session {
    constructor(questions) { validate(questions); this.questions = questions.slice(); this.index = 0; this.coins = 0; this.combo = 0; this.bestCombo = 0; this.history = []; this.answered = false; }
    get current() { return this.questions[this.index] || null; }
    get done() { return this.index >= this.questions.length; }
    get correctCount() { return this.history.filter(x => x.correct).length; }
    get wrongQuestions() { return this.history.filter(x => !x.correct).map(x => x.question); }
    answer(choice) {
      if (this.done || this.answered || !Number.isInteger(choice) || choice < 0 || choice >= this.current.choices.length) return null;
      const correct = choice === this.current.answer;
      this.combo = correct ? this.combo + 1 : 0;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const earned = correct ? 10 + (this.combo % 3 === 0 ? 5 : 0) : 0;
      this.coins += earned;
      const result = { question: this.current, choice, correct, earned };
      this.history.push(result); this.answered = true; return result;
    }
    next() { if (!this.answered || this.done) return false; this.index++; this.answered = false; return true; }
  }
  class RunnerModel {
    constructor(totalBonuses, maxHearts = 3) {
      if (!Number.isInteger(totalBonuses) || totalBonuses < 1) throw new Error('보너스 문제 수가 올바르지 않습니다.');
      this.totalBonuses = totalBonuses; this.maxHearts = maxHearts; this.hearts = maxHearts;
      this.coins = 0; this.distance = 0; this.bonusAnswered = 0; this.bonusCorrect = 0;
    }
    get score() { return Math.max(0, this.coins) * 10 + Math.floor(this.distance); }
    travel(meters) { if (Number.isFinite(meters) && meters > 0) this.distance += meters; return this.score; }
    collectCoin(amount = 1) { if (Number.isInteger(amount) && amount > 0) this.coins += amount; return this.score; }
    hitObstacle() { if (this.hearts <= 0) return false; this.hearts--; return true; }
    answerBonus(correct, reward = 20) { if (this.done) return 0; this.bonusAnswered++; if (correct) { this.bonusCorrect++; this.coins += reward; return reward; } this.coins = Math.max(0, this.coins - 20); return -20; }
    get done() { return this.bonusAnswered >= this.totalBonuses || this.hearts <= 0; }
  }
  return { validate, makeCourse, makeBonusCourse, makePlaceBonusCourse, Session, RunnerModel, placeKeys };
});
