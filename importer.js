// Reads spreadsheets (.xlsx, CSV or pasted rows) on the device and turns cells into dates, times and hours.
// Nothing here touches the network or app storage; app.js drives the import screens.
(() => {
  'use strict';

  class ImportError extends Error {}

  // ---------- Zip (an .xlsx file is a zip of XML files) ----------
  async function unzip(buf) {
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new ImportError('This file isn’t a readable Excel workbook. Save it as .xlsx or CSV and try again.');
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = new Map();
    const dec = new TextDecoder();
    for (let n = 0; n < count && p + 46 <= buf.byteLength; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const nameLen = dv.getUint16(p + 28, true);
      const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
      files.set(name.replace(/^\//, '').toLowerCase(), {
        method: dv.getUint16(p + 10, true),
        size: dv.getUint32(p + 20, true),
        local: dv.getUint32(p + 42, true),
      });
      p += 46 + nameLen + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
    }
    return async (name) => {
      const f = files.get(name.replace(/^\//, '').toLowerCase());
      if (!f) return null;
      const start = f.local + 30 + dv.getUint16(f.local + 26, true) + dv.getUint16(f.local + 28, true);
      const data = new Uint8Array(buf, start, f.size);
      if (f.method === 0) return dec.decode(data);
      if (f.method !== 8) throw new ImportError('This workbook uses a format the app can’t open. Save it as .xlsx or CSV and try again.');
      if (typeof DecompressionStream === 'undefined') {
        throw new ImportError('This phone’s browser can’t open Excel files. Update iOS, or save the sheet as CSV and import that.');
      }
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return dec.decode(await new Response(stream).arrayBuffer());
    };
  }

  const parseXml = (text) => new DOMParser().parseFromString(text, 'application/xml');
  const tags = (root, name) => Array.from(root.getElementsByTagNameNS('*', name));
  const attr = (el, name) => el.getAttribute(name) ?? el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', name.replace(/^r:/, ''));

  // Which number formats show dates or times (Excel stores both as numbers)
  function formatKind(code) {
    const c = code.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/\[(?!h\]|m\]|s\])[^\]]*\]/gi, '');
    if (/\[h\]|\[m\]|\[s\]/i.test(c)) return 'time';
    const hasDate = /[dy]/i.test(c) || /^[^hs]*m{3,}/i.test(c);
    const hasTime = /[hs]/i.test(c) || /am\/pm|a\/p/i.test(c);
    if (hasDate && hasTime) return 'datetime';
    if (hasDate) return 'date';
    if (hasTime) return 'time';
    if (/^m{1,2}([\/-]|$)/i.test(c)) return 'date';
    return null;
  }
  function builtinKind(id) {
    if ((id >= 14 && id <= 17) || (id >= 27 && id <= 36) || (id >= 50 && id <= 58)) return 'date';
    if (id === 22) return 'datetime';
    if ((id >= 18 && id <= 21) || (id >= 45 && id <= 47)) return 'time';
    return null;
  }

  const colIndex = (ref) => {
    const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() || '';
    let n = 0;
    for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64;
    return n - 1;
  };

  async function readXlsx(buf) {
    const read = await unzip(buf);
    const wbText = await read('xl/workbook.xml');
    if (!wbText) throw new ImportError('This file isn’t an Excel workbook. Save it as .xlsx or CSV and try again.');
    const wb = parseXml(wbText);
    const date1904 = tags(wb, 'workbookPr').some((el) => /^(1|true)$/.test(el.getAttribute('date1904') || ''));

    const rels = new Map();
    const relText = await read('xl/_rels/workbook.xml.rels');
    if (relText) for (const r of tags(parseXml(relText), 'Relationship')) rels.set(r.getAttribute('Id'), r.getAttribute('Target'));

    const strings = [];
    const ssText = await read('xl/sharedStrings.xml');
    if (ssText) {
      for (const si of tags(parseXml(ssText), 'si')) {
        strings.push(tags(si, 't').filter((t) => t.parentNode.localName !== 'rPh').map((t) => t.textContent).join(''));
      }
    }

    const styleKinds = [];
    const stText = await read('xl/styles.xml');
    if (stText) {
      const st = parseXml(stText);
      const custom = new Map(tags(st, 'numFmt').map((f) => [Number(f.getAttribute('numFmtId')), f.getAttribute('formatCode') || '']));
      const xfs = tags(st, 'cellXfs')[0];
      if (xfs) {
        for (const xf of Array.from(xfs.children).filter((el) => el.localName === 'xf')) {
          const id = Number(xf.getAttribute('numFmtId') || 0);
          styleKinds.push(custom.has(id) ? formatKind(custom.get(id)) : builtinKind(id));
        }
      }
    }

    const tables = [];
    for (const sh of tags(wb, 'sheet')) {
      const target = rels.get(attr(sh, 'r:id') || sh.getAttribute('r:id'));
      if (!target || !/worksheets\//i.test(target)) continue; // chart sheets have no cells
      const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
      const text = await read(path);
      if (!text) continue;
      const rows = [];
      let nextRow = 0;
      for (const rowEl of tags(parseXml(text), 'row')) {
        const r = rowEl.getAttribute('r') ? Number(rowEl.getAttribute('r')) - 1 : nextRow;
        nextRow = r + 1;
        const row = [];
        let nextCol = 0;
        for (const c of Array.from(rowEl.children).filter((el) => el.localName === 'c')) {
          const ref = c.getAttribute('r');
          const ci = ref ? colIndex(ref) : nextCol;
          nextCol = ci + 1;
          const t = c.getAttribute('t');
          const v = tags(c, 'v')[0]?.textContent;
          let cell = null;
          if (t === 's') cell = { v: strings[Number(v)] ?? '' };
          else if (t === 'inlineStr') cell = { v: tags(c, 't').map((x) => x.textContent).join('') };
          else if (t === 'str' || t === 'd') cell = { v: v ?? '' };
          else if (t === 'b') cell = { v: v === '1' ? 'TRUE' : 'FALSE' };
          else if (t === 'e') cell = null;
          else if (v != null && v !== '') cell = { v: Number(v), fmt: styleKinds[Number(c.getAttribute('s') || 0)] || null };
          if (cell && typeof cell.v === 'string') cell.v = cell.v.trim();
          if (cell && cell.v !== '') row[ci] = cell;
        }
        rows[r] = row;
      }
      tables.push({ name: sh.getAttribute('name') || `Sheet ${tables.length + 1}`, rows: Array.from(rows, (r) => r || []), hidden: /hidden/i.test(sh.getAttribute('state') || ''), date1904 });
    }
    if (!tables.length) throw new ImportError('No sheets with cells were found in this workbook.');
    return tables;
  }

  // ---------- CSV, TSV and pasted rows ----------
  function parseDelimited(text) {
    text = text.replace(/^\uFEFF/, '');
    const firstLine = text.split(/\r?\n/, 1)[0] || '';
    const counts = ['\t', ',', ';'].map((d) => [d, firstLine.split(d).length - 1]);
    const delim = counts.sort((a, b) => b[1] - a[1])[0][1] > 0 ? counts[0][0] : ',';
    const rows = [];
    let row = [], cur = '', quoted = false, i = 0;
    const endCell = () => {
      const v = cur.trim();
      row.push(v === '' ? undefined : { v });
      cur = '';
    };
    while (i < text.length) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cur += '"'; i += 2; continue; }
        if (ch === '"') { quoted = false; i++; continue; }
        cur += ch;
        i++;
        continue;
      }
      if (ch === '"' && cur.trim() === '') { quoted = true; cur = ''; i++; continue; }
      if (ch === delim) { endCell(); i++; continue; }
      if (ch === '\r' || ch === '\n') {
        endCell();
        rows.push(row);
        row = [];
        if (ch === '\r' && text[i + 1] === '\n') i++;
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
    if (cur !== '' || row.length) {
      endCell();
      rows.push(row);
    }
    return rows;
  }

  async function readFile(file) {
    const name = file.name || 'Spreadsheet';
    const ext = (/\.([a-z0-9]+)$/i.exec(name)?.[1] || '').toLowerCase();
    if (ext === 'xls') throw new ImportError('Older .xls files can’t be read. Open it in Excel or Numbers and save it as .xlsx or CSV.');
    if (ext === 'numbers') throw new ImportError('Numbers files can’t be read directly. In Numbers, choose File › Export To › Excel, then import that file.');
    if (ext === 'json') throw new ImportError('That looks like a backup file. Use Restore in the Backup section instead.');
    const buf = await file.arrayBuffer();
    const head = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
    if (ext === 'xlsx' || (head[0] === 0x50 && head[1] === 0x4b)) return readXlsx(buf);
    const text = new TextDecoder().decode(buf);
    if (/\u0000/.test(text.slice(0, 2000))) throw new ImportError('This file can’t be read. Save it as .xlsx or CSV and try again.');
    return [{ name: name.replace(/\.[^.]+$/, ''), rows: parseDelimited(text) }];
  }

  // ---------- Reading values ----------
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthNum = (s) => {
    const i = MONTHS.indexOf(s.slice(0, 3).toLowerCase());
    return i < 0 ? 0 : i + 1;
  };
  const fullYear = (y) => {
    if (y >= 100) return y;
    const cur = new Date().getFullYear() % 100;
    return y <= cur + 1 ? 2000 + y : 1900 + y;
  };
  const validDate = (y, m, d) => {
    if (!(y > 1900 && y < 2200 && m >= 1 && m <= 12 && d >= 1)) return null;
    const dt = new Date(y, m - 1, d);
    return dt.getMonth() === m - 1 ? { y, m, d } : null;
  };

  function serialToParts(n, date1904) {
    const ms = Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + Math.floor(n) * 86400000;
    const d = new Date(ms);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
  }

  // Returns {y, m, d} or null
  function parseDate(cell, date1904) {
    if (!cell) return null;
    if (typeof cell.v === 'number') {
      if (cell.fmt === 'date' || cell.fmt === 'datetime' || (cell.v > 20000 && cell.v < 80000)) {
        return cell.v >= 1 ? serialToParts(cell.v, date1904) : null;
      }
      return null;
    }
    const s = cell.v.replace(/^[a-z]{3,9}\.?,?\s+(?=[a-z]{3}|\d)/i, (w) => (monthNum(w) ? w : '')).trim();
    let m;
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s))) return validDate(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/.exec(s))) {
      let a = +m[1], b = +m[2];
      if (a > 12 && b <= 12) [a, b] = [b, a]; // day first, like 16/08/2025
      return validDate(fullYear(+m[3]), a, b);
    }
    if ((m = /^([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})\b/i.exec(s)) && monthNum(m[1])) return validDate(fullYear(+m[3]), monthNum(m[1]), +m[2]);
    if ((m = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3,9})\.?,?[\s-]+(\d{2,4})\b/i.exec(s)) && monthNum(m[2])) return validDate(fullYear(+m[3]), monthNum(m[2]), +m[1]);
    return null;
  }

  // Returns minutes after midnight, or null
  function parseTime(cell) {
    if (!cell) return null;
    if (typeof cell.v === 'number') {
      const n = cell.v;
      if (cell.fmt === 'time' || cell.fmt === 'datetime' || (n >= 0 && n < 1)) {
        return Math.round((n - Math.floor(n)) * 1440) % 1440;
      }
      if (Number.isInteger(n) && n >= 0 && n <= 2359 && n % 100 < 60 && n >= 100) return Math.floor(n / 100) * 60 + (n % 100);
      return null;
    }
    const s = cell.v.toLowerCase().trim();
    if (/^noon$/.test(s)) return 720;
    if (/^midnight$/.test(s)) return 0;
    let m = /(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap])\.?\s*m?\.?(?![a-z])/.exec(s);
    if (m) {
      const h = +m[1], min = +(m[2] || 0);
      if (h < 1 || h > 12 || min > 59) return null;
      return ((h % 12) + (m[3] === 'p' ? 12 : 0)) * 60 + min;
    }
    m = /(?:^|\s|t)(\d{1,2}):(\d{2})(?::\d{2})?(?!\d)/.exec(s);
    if (m) return +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null;
    m = /^(\d{3,4})$/.exec(s);
    if (m) {
      const n = +m[1];
      return n % 100 < 60 && n <= 2359 ? Math.floor(n / 100) * 60 + (n % 100) : null;
    }
    return null;
  }

  // Returns hours as a number, or null
  function parseHours(cell) {
    if (!cell) return null;
    if (typeof cell.v === 'number') return cell.fmt === 'time' || cell.fmt === 'datetime' ? cell.v * 24 : cell.v;
    const s = cell.v.toLowerCase().replace(/,/g, '').trim();
    let m;
    if ((m = /^(\d{1,3}):(\d{2})(?::\d{2})?$/.exec(s))) return +m[1] + +m[2] / 60;
    const h = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(s);
    const min = /(\d+(?:\.\d+)?)\s*(?:m|min|mins|minute|minutes)\b/.exec(s);
    if (h || min) return (h ? +h[1] : 0) + (min ? +min[1] / 60 : 0);
    if ((m = /^(\d+(?:\.\d+)?)$/.exec(s)) || (m = /^(\d*\.\d+)$/.exec(s))) return +m[1];
    return null;
  }

  const cellText = (cell) => {
    if (!cell) return '';
    if (typeof cell.v === 'string') return cell.v;
    return String(Math.round(cell.v * 10000) / 10000);
  };

  // ---------- Guessing the layout ----------
  const FIELD_WORDS = [
    ['start', /\b(start|begin|beginning|began|time in|in time|clock ?in|from|arrive|arrival|arrived)\b|^in$/],
    ['end', /\b(end|ended|finish|finished|time out|out time|clock ?out|to|until|leave|left|depart|departure)\b|^out$/],
    ['hours', /\b(hours?|hrs?|duration|total|length|time spent|amount)\b/],
    ['date', /\b(date|day)\b/],
    ['location', /\b(location|site|place|organi[sz]ation|org|facility|hospital|clinic|employer|company|where|agency|lab|institution|office|practice)\b/],
    ['notes', /\b(notes?|comments?|description|details?|activit(y|ies)|summary|duties|reflections?|memo|tasks?)\b/],
    ['category', /\b(category|type|kind)\b/],
  ];
  const FIELDS = ['date', 'location', 'start', 'end', 'hours', 'notes', 'category'];

  const looksLikeData = (cell) => cell && (typeof cell.v === 'number' || parseDate(cell) || parseTime(cell) != null);

  // Index of the header row, or -1 when the first row is already data
  function findHeader(rows) {
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const cells = (rows[i] || []).filter(Boolean);
      if (!cells.length) continue;
      if (cells.some(looksLikeData)) return -1;
      if (cells.length >= 2 && cells.some((c) => FIELD_WORDS.some(([, re]) => re.test(c.v.toLowerCase())))) return i;
    }
    return -1;
  }

  const letter = (i) => {
    let s = '';
    for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
  };

  // Guesses which column holds each field. Returns {date: 0, location: 1, ...} with -1 for missing ones.
  function guessMapping(headers, dataRows, date1904) {
    const map = Object.fromEntries(FIELDS.map((f) => [f, -1]));
    const taken = new Set();
    headers.forEach((h, i) => {
      const t = (h || '').toLowerCase().trim();
      if (!t) return;
      let field = null;
      if (/date/.test(t) && !/time|up ?date/.test(t)) field = 'date';
      else field = FIELD_WORDS.find(([, re]) => re.test(t))?.[0] || null;
      if (field && map[field] < 0) {
        map[field] = i;
        taken.add(i);
      }
    });
    const width = Math.max(headers.length, ...dataRows.slice(0, 50).map((r) => r.length));
    const sample = (i) => dataRows.slice(0, 50).map((r) => r[i]).filter(Boolean);
    const share = (i, test) => {
      const vals = sample(i);
      return vals.length ? vals.filter(test).length / vals.length : 0;
    };
    if (map.date < 0) {
      for (let i = 0; i < width; i++) {
        if (!taken.has(i) && share(i, (c) => parseDate(c, date1904)) >= 0.6) { map.date = i; taken.add(i); break; }
      }
    }
    if (map.start < 0 && map.end < 0) {
      const timeCols = [];
      for (let i = 0; i < width; i++) {
        if (!taken.has(i) && share(i, (c) => typeof c.v === 'string' ? parseTime(c) != null : c.fmt === 'time' || c.fmt === 'datetime') >= 0.6) timeCols.push(i);
      }
      if (timeCols.length >= 2) {
        [map.start, map.end] = timeCols;
        taken.add(timeCols[0]).add(timeCols[1]);
      }
    }
    if (map.hours < 0) {
      for (let i = 0; i < width; i++) {
        if (!taken.has(i) && share(i, (c) => { const h = parseHours(c); return h != null && h > 0 && h <= 24; }) >= 0.8) { map.hours = i; taken.add(i); break; }
      }
    }
    if (map.location < 0) {
      for (let i = 0; i < width; i++) {
        if (!taken.has(i) && share(i, (c) => typeof c.v === 'string' && !looksLikeData(c) && c.v.length <= 80) >= 0.8) { map.location = i; taken.add(i); break; }
      }
    }
    return map;
  }

  // ---------- Location names ----------
  const normLoc = (s) => s.toLowerCase().replace(/^the\s+/, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '');
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }
  // 'same' when only spacing, punctuation or case differ; 'similar' for a likely typo; otherwise null
  function locMatch(a, b) {
    const x = normLoc(a), y = normLoc(b);
    if (!x || !y) return null;
    if (x === y) return 'same';
    const d = editDistance(x, y);
    const len = Math.min(x.length, y.length);
    if ((len >= 6 && d <= 1) || (len >= 12 && d <= 2)) return 'similar';
    return null;
  }

  function template() {
    return '\uFEFF' + ['Date,Category,Location,Time Begin,Time End,Duration (hrs),Notes', ''].join('\r\n');
  }

  window.HoursImport = { ImportError, readFile, parseDelimited, findHeader, guessMapping, letter, parseDate, parseTime, parseHours, cellText, locMatch, normLoc, FIELDS, template };
})();
