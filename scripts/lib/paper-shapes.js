'use strict';
/**
 * paper-shapes.js — the question forms a modern prelims paper uses, with the
 * rules each one has to satisfy before it is allowed into the bank.
 *
 * The audit found the existing bank is fill-in-the-blank recall: of 12,000
 * sampled questions, zero multi-statement, zero match-the-following, zero
 * chronology. Covering a topic is not being ready for how it is asked, so the
 * generated questions are built to these shapes and validated against them.
 *
 * A shape owns three things: the instruction given to the model, the extra
 * fields it must return, and the checks that reject a bad item.
 */

const SHAPES = [
  {
    id: 'multi-statement',
    name: 'Multi-statement (which of the statements is/are correct)',
    fields: 'statements: array of 2-4 short factual statements',
    asks: 'Give 2-4 statements about the topic. The options must be the standard combinations ("1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3") or "Only one"/"Only two"/"All three"/"None" style. At least one statement must be a common misconception so the answer is not guessable.',
    extra: ['statements'],
    validate(q) {
      const errs = [];
      if (!Array.isArray(q.statements) || q.statements.length < 2 || q.statements.length > 4) {
        errs.push('needs 2-4 statements');
      } else if (q.statements.some((s) => String(s).trim().length < 12)) {
        errs.push('a statement is too short to be a fact');
      }
      return errs;
    }
  },
  {
    id: 'match-the-following',
    name: 'Match the following',
    fields: 'list1: array of 3-4 items, list2: array of 3-4 items',
    asks: 'Give two short lists (3-4 entries each). Options must be four different pairings written like "A-2, B-3, C-1, D-4". Do not make the correct pairing the only one with a recognisable order.',
    extra: ['list1', 'list2'],
    validate(q) {
      const errs = [];
      for (const k of ['list1', 'list2']) {
        if (!Array.isArray(q[k]) || q[k].length < 3 || q[k].length > 4) errs.push(k + ' needs 3-4 entries');
      }
      if (Array.isArray(q.list1) && Array.isArray(q.list2) && q.list1.length !== q.list2.length) {
        errs.push('the two lists must be the same length');
      }
      return errs;
    }
  },
  {
    id: 'chronology',
    name: 'Chronological order',
    fields: 'items: array of 3-4 events, acts, or works in mixed order',
    asks: 'Give 3-4 items and ask for the correct chronological or developmental order. Options are four different orderings written as "2-1-4-3". The items must be close enough in time that the order is a real question.',
    extra: ['items'],
    validate(q) {
      const errs = [];
      if (!Array.isArray(q.items) || q.items.length < 3 || q.items.length > 4) errs.push('needs 3-4 items');
      return errs;
    }
  },
  {
    id: 'data-sufficiency',
    name: 'Data sufficiency (two statements)',
    fields: 'question: the ask, statement1: first statement, statement2: second statement',
    asks: 'Ask a question that needs data, then give two statements. The four options are ALWAYS exactly these, in this order: (a) the question can be answered using one statement alone but not the other; (b) using either statement alone; (c) using both statements together but neither alone; (d) even both together are not sufficient. Do not put all four options on one line — the page prints them as a list.',
    extra: ['statement1', 'statement2'],
    validate(q) {
      const errs = [];
      if (!q.statement1 || String(q.statement1).trim().length < 10) errs.push('statement1 is too short');
      if (!q.statement2 || String(q.statement2).trim().length < 10) errs.push('statement2 is too short');
      // The four options are fixed by the paper. All four meanings have to be
      // present or the item cannot be answered in the paper's format; the
      // builder then reorders them into the paper's order so the keyed option
      // always means the same thing.
      const opts = (q.options || []).map((s) => String(s).toLowerCase());
      if (opts.length !== 4) errs.push('data sufficiency needs exactly four options');
      const has = {
        one: opts.some((o) => /one (?:of these )?statements? alone|one statement alone/.test(o) && !/either/.test(o)),
        either: opts.some((o) => /either statement alone/.test(o)),
        both: opts.some((o) => /both (?:the )?statements together|both together/.test(o)),
        none: opts.some((o) => /not be answered|even (?:using )?(?:any|both)|not sufficient/.test(o))
      };
      if (!has.one || !has.either || !has.both || !has.none) {
        errs.push('options are not the standard data-sufficiency set');
      }
      return errs;
    }
  },
  {
    id: 'passage-inference',
    name: 'Passage-based inference',
    fields: 'passage: 90-160 word passage, question: which conclusions follow',
    asks: 'Write a short factual passage on the topic, then ask which of two or three given conclusions are valid. The answer must follow only from the passage, not from outside knowledge.',
    extra: ['passage'],
    validate(q) {
      const errs = [];
      const p = String(q.passage || '');
      if (p.trim().length < 200) errs.push('passage is too short to reason from');
      return errs;
    }
  },
  {
    id: 'assertion-reason',
    name: 'Assertion and reason',
    fields: 'assertion: one sentence, reason: one sentence',
    asks: 'Give one assertion (A) and one reason (R) and use the standard four options: both true and R explains A; both true but R does not explain A; A true R false; A false R true.',
    extra: ['assertion', 'reason'],
    validate(q) {
      const errs = [];
      if (!q.assertion || String(q.assertion).trim().length < 20) errs.push('assertion is too short');
      if (!q.reason || String(q.reason).trim().length < 20) errs.push('reason is too short');
      return errs;
    }
  },
  {
    id: 'application',
    name: 'Application (with reference to / in the context of)',
    fields: 'none beyond the stem',
    asks: 'Ask a question that cannot be answered by reciting a definition: a scenario, a consequence, or a comparison. The right answer must follow from reasoning about the topic, not from remembering one line.',
    extra: [],
    validate() { return []; }
  },
  {
    id: 'map-place',
    name: 'Place, location and physical setting',
    fields: 'none beyond the stem',
    asks: 'Ask about the location, direction, neighbouring feature, latitudinal position or the reason a place has the climate or soil it has. Never say "in the map above" because no map is shown — describe the place in words.',
    extra: [],
    validate(q) {
      const errs = [];
      if (/in the (given )?map|shown in the map above/i.test(String(q.question || ''))) {
        errs.push('refers to a map that is not shown');
      }
      return errs;
    }
  }
];

const BY_ID = {};
SHAPES.forEach((s) => { BY_ID[s.id] = s; });

function shapeById(id) {
  return BY_ID[id] || null;
}

// The rules every shape shares. Everything here is a reason a question would
// be unusable in a real test.
function validateCommon(q, shape) {
  const errs = [];
  if (!q || typeof q !== 'object') return ['not an object'];
  if (!q.question || String(q.question).trim().length < 25) errs.push('stem is too short');
  if (/_____|\bblank\b|^fill in/i.test(String(q.question))) {
    errs.push('that is a fill-in-the-blank, not an option question');
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    errs.push('needs exactly 4 options');
  } else {
    const norm = q.options.map((o) => String(o).trim().toLowerCase());
    if (new Set(norm).size !== 4) errs.push('options are not distinct');
    if (norm.some((o) => o.length < 1)) errs.push('an option is empty');
    if (norm.some((o) => /^(all of the above|none of the above)$/.test(o))) errs.push('avoid all/none of the above');
  }
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errs.push('answer must be the index 0-3');
  if (!q.explanation || String(q.explanation).trim().length < 40) errs.push('explanation is too short');
  if (!q.topic || String(q.topic).trim().length < 3) errs.push('topic is required');
  if (shape && typeof shape.validate === 'function') {
    try { errs.push.apply(errs, shape.validate(q)); } catch (e) { errs.push('shape check failed: ' + e.message); }
  }
  return errs;
}

function prompt(shape, topic, excerpt) {
  return [
    'You are a UPSC Prelims paper setter. Write ONE question in this exact form: ' + shape.name + '.',
    '',
    'Topic: ' + topic,
    shape.fields === 'none beyond the stem' ? '' : 'This form also needs: ' + shape.fields,
    '',
    'How this form works: ' + shape.asks,
    '',
    'Rules for every question:',
    '- English, exam register, no first person, no "we".',
    '- Four options, exactly one correct. Options must be plausible and similar in length.',
    '- No "all of the above" and no "none of the above".',
    '- Never a fill-in-the-blank. This is an option question.',
    '- Only facts that are true and uncontroversial. Do not invent numbers, dates or names.',
    '- The explanation must say why the key is right and why the closest distractor is wrong, in 2-4 sentences.',
    '',
    'Return ONE JSON object and nothing else:',
    '{"shape":"' + shape.id + '","topic":"' + topic + '","question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."' +
      (shape.extra.length ? ',' + shape.extra.map((f) => '"' + f + '":"..."').join(',') : '') + '}',
    '',
    'Draw only on this lesson material:',
    excerpt.slice(0, 3500)
  ].join('\n');
}

module.exports = { SHAPES, shapeById, validateCommon, prompt };