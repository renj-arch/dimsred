#!/usr/bin/env node
/*
 * Compile the small JSON-Schema subset the film writer uses into GBNF.
 *
 * llama.cpp b11890's `--json-schema` path feeds the chat-template prefill into
 * the grammar and then throws "Failed to initialize samplers: std::exception"
 * on Qwen models. A hand-written `--grammar-file` does not take that path, so
 * the same schema is compiled here and passed as a grammar file instead. The
 * grammar only constrains the shape; the audit still decides whether the
 * answer is true.
 *
 * Supported: object (properties/required/additionalProperties), array
 * (items/minItems/maxItems), string, integer, number, boolean, null, enum,
 * const, anyOf/oneOf and simple type unions. `$ref` and numeric ranges are not
 * supported; the film schemas do not use them.
 */
'use strict';

const PRIMITIVES = String.raw`
string ::= "\"" char* "\"" space
char ::= [^"\\\x7F\x00-\x1F] | [\\] (["\\bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F])
integer ::= ("-"? ("0" | [1-9] [0-9]*)) space
number ::= ("-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [+-]? [0-9]+)?) space
space ::= [ \t\n\r]*
`.trim();

function literal(value) {
  return JSON.stringify(String(value));
}

function inferType(schema) {
  if (schema.properties || schema.additionalProperties !== undefined) return 'object';
  if (schema.items) return 'array';
  return 'string';
}

function compile(schema) {
  let counter = 0;
  const rules = [];

  function add(body) {
    const name = `r${counter++}`;
    rules.push(`${name} ::= ${body}`);
    return name;
  }

  function object(s) {
    const props = s.properties || {};
    const required = Array.isArray(s.required)
      ? s.required.filter((key) => Object.prototype.hasOwnProperty.call(props, key))
      : [];
    const optional = Object.keys(props).filter((key) => !required.includes(key));
    const kv = (key) => `${literal(JSON.stringify(key))} space ":" space ${value(props[key])}`;

    if (!Object.keys(props).length) return add('"{" space "}" space');

    const parts = [];
    if (required.length) {
      parts.push(required.map(kv).join(' "," space '));
      for (const key of optional) parts.push(`("," space ${kv(key)})?`);
    } else {
      // No required list: make every declared property mandatory. The film
      // schemas always list required keys, so this only keeps an unusual
      // schema total instead of silently dropping fields.
      parts.push(Object.keys(props).map(kv).join(' "," space '));
    }
    return add(`"{" space ${parts.join(' ')} "}" space`);
  }

  function array(s) {
    const item = value(s.items || { type: 'string' });
    const min = Number.isInteger(s.minItems) ? Math.max(0, s.minItems) : 0;
    const max = Number.isInteger(s.maxItems) ? Math.max(0, s.maxItems) : null;
    const sep = `"," space ${item}`;
    const repeat = (count) => (count > 0 ? ` (${sep}){${count}}` : '');

    if (max === 0) return add('"[" space "]" space');
    if (min === 0 && max === null) return add(`"[" space (${item} (${sep})*)? "]" space`);
    if (min === 0 && max === 1) return add(`"[" space (${item})? "]" space`);
    if (min === 0) return add(`"[" space (${item}${repeat(max - 1)})? "]" space`);
    if (min === 1 && max === 1) return add(`"[" space ${item} "]" space`);
    if (max === null) return add(`"[" space ${item}${repeat(min - 1)} (${sep})* "]" space`);
    if (min === max) return add(`"[" space ${item}${repeat(min - 1)} "]" space`);
    // min..max: exactly min items, then up to max-min optional ones.
    return add(`"[" space ${item}${repeat(min - 1)} (${sep}){0,${max - min}} "]" space`);
  }

  function value(s) {
    if (!s || typeof s !== 'object') return add('string');
    if (s.const !== undefined) return add(`${literal(JSON.stringify(s.const))} space`);
    if (Array.isArray(s.enum)) {
      return add(`(${s.enum.map((entry) => literal(JSON.stringify(entry))).join(' | ')}) space`);
    }
    for (const key of ['anyOf', 'oneOf']) {
      if (Array.isArray(s[key]) && s[key].length) {
        return add(`(${s[key].map((entry) => value(entry)).join(' | ')})`);
      }
    }

    const types = Array.isArray(s.type) ? s.type : [s.type || inferType(s)];
    if (types.length > 1) {
      const alternatives = types.map((type) => value({ ...s, type }));
      return add(`(${alternatives.join(' | ')})`);
    }

    switch (types[0]) {
      case 'object':
        return object(s);
      case 'array':
        return array(s);
      case 'integer':
        return add('integer');
      case 'number':
        return add('number');
      case 'boolean':
        return add('("true" | "false") space');
      case 'null':
        return add('"null" space');
      case 'string':
        return add('string');
      default:
        return add('string');
    }
  }

  const root = value(schema);
  return [`root ::= space ${root}`, ...rules, PRIMITIVES].join('\n') + '\n';
}

module.exports = { compile };
