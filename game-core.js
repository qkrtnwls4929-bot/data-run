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
  return { validate, makeCourse, Session, placeKeys };
});
