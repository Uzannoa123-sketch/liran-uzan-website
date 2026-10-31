'use strict';
// Tagged-template HTML with automatic escaping.
//   html`<p>${userText}</p>`  -> userText is escaped
//   raw(trustedMarkup)        -> inserted as-is
// Arrays are flattened, and null/undefined/false render as nothing.

class Raw {
  constructor(s) {
    this.s = s;
  }
  toString() {
    return this.s;
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escape(v) {
  return String(v).replace(/[&<>"']/g, (c) => ESC[c]);
}

function render(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(render).join('');
  return escape(v);
}

function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new Raw(out);
}

const raw = (s) => new Raw(String(s));

// Plain text with line breaks -> paragraphs.
function paragraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => html`<p>${raw(escape(p).replace(/\n/g, '<br>'))}</p>`);
}

const nf = new Intl.NumberFormat('he-IL');
function number(n) {
  return n === '' || n === null || n === undefined || isNaN(Number(n)) ? '' : nf.format(Number(n));
}

function price(v) {
  if (!v && v !== 0) return '';
  return `${number(v)} ₪`;
}

module.exports = { html, raw, escape, paragraphs, number, price, Raw };
