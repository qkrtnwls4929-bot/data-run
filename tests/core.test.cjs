const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeCourse, Session, validate } = require('../game-core.js');
const bank = require('../questions.json').questions;

test('all 38 supplied questions appear once in the complete school course', () => {
  assert.equal(bank.length, 38); validate(bank);
  const course = makeCourse(bank, 'all');
  assert.deepEqual(course.map(q => q.id).sort((a,b) => a-b), Array.from({length:38}, (_,i) => i+1));
  assert.equal(course[0].id, 1);
});
test('short course has 4 life, 3 concept and 3 datatype questions, without duplicates', () => {
  for (let n = 0; n < 40; n++) {
    const course = makeCourse(bank, 'short'); assert.equal(course.length, 10); assert.equal(new Set(course.map(q => q.id)).size, 10);
    assert.equal(course.filter(q => q.type === 'life').length, 4);
    assert.equal(course.filter(q => q.type === 'concept').length, 3);
    assert.equal(course.filter(q => q.type === 'datatype').length, 3);
  }
});
test('datatype course includes exactly the 10 supplied classification questions', () => {
  const course = makeCourse(bank, 'datatype'); assert.equal(course.length, 10); assert.ok(course.every(q => q.type === 'datatype' && q.choices.length === 2));
});
test('full correct run ends at 38, earns 440 coins and cannot double-submit', () => {
  const s = new Session(makeCourse(bank, 'all'));
  assert.equal(s.next(), false);
  while (!s.done) { const q = s.current; assert.ok(s.answer(q.answer).correct); assert.equal(s.answer(q.answer), null); assert.ok(s.next()); }
  assert.equal(s.correctCount, 38); assert.equal(s.coins, 440); assert.equal(s.bestCombo, 38); assert.equal(s.answer(0), null); assert.equal(s.next(), false);
});
test('wrong answers reset combo, preserve chosen answer and build an independent retry', () => {
  const s = new Session(bank.slice(0,4)); s.answer(s.current.answer); s.next(); s.answer((s.current.answer+1)%3); s.next();
  assert.equal(s.combo, 0); assert.equal(s.coins, 10); assert.equal(s.wrongQuestions[0].id, 2);
  const retry = new Session(s.wrongQuestions); retry.answer(retry.current.answer); retry.next(); assert.equal(retry.correctCount, 1); assert.equal(s.history.length, 2);
});
test('invalid keyboard choice does not consume a two-choice question', () => {
  const s = new Session(makeCourse(bank, 'datatype')); assert.equal(s.answer(2), null); assert.equal(s.answer(-1), null); assert.equal(s.answer(NaN), null); assert.equal(s.answered, false); assert.equal(s.history.length, 0);
});
test('embedded question script and JSON are identical, and app uses only relative local assets', () => {
  const vm = require('node:vm'); const sandbox = {window:{}}; vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../questions.js'),'utf8'), sandbox);
  assert.equal(JSON.stringify(sandbox.window.DATA_RUN_QUESTIONS.questions), JSON.stringify(bank));
  const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) { assert.ok(!match[1].startsWith('/')); assert.ok(fs.existsSync(path.join(__dirname,'..',match[1]))); }
});
