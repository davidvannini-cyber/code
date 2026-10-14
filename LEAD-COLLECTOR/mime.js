'use strict';
// Parser MIME minimale (senza dipendenze): estrae mittente, oggetto, data, message-id e testo.

function decodeQP(s) {
  const bytes = [];
  s = s.replace(/=\r?\n/g, '');
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.substr(i + 1, 2))) {
      bytes.push(parseInt(s.substr(i + 1, 2), 16)); i += 2;
    } else bytes.push(...Buffer.from(s[i], 'utf8'));
  }
  return Buffer.from(bytes);
}

function decodeBody(body, encoding, charset) {
  encoding = (encoding || '').toLowerCase();
  let buf;
  if (encoding === 'base64') buf = Buffer.from(body.replace(/\s+/g, ''), 'base64');
  else if (encoding === 'quoted-printable') buf = decodeQP(body);
  else buf = Buffer.from(body, 'utf8');
  try { return new TextDecoder((charset || 'utf-8').toLowerCase()).decode(buf); }
  catch { return buf.toString('utf8'); }
}

function decodeWords(s) {
  return (s || '').replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_, cs, enc, txt) => {
    const buf = enc.toLowerCase() === 'b' ? Buffer.from(txt, 'base64') : decodeQP(txt.replace(/_/g, ' '));
    try { return new TextDecoder(cs.toLowerCase()).decode(buf); } catch { return buf.toString('utf8'); }
  }).replace(/\?=\s+=\?/g, '');
}

function splitHeaders(raw) {
  const m = raw.match(/\r?\n\r?\n/);
  const idx = m ? m.index : raw.length;
  const head = raw.slice(0, idx).replace(/\r?\n[ \t]+/g, ' ');
  const body = m ? raw.slice(idx + m[0].length) : '';
  const headers = {};
  for (const line of head.split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { headers, body };
}

function param(h, name) {
  const m = (h || '').match(new RegExp(name + '\\s*=\\s*"?([^";]+)"?', 'i'));
  return m ? m[1] : '';
}

function htmlToText(html) {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table)>|<\/t[dh]>/gi, m => /t[dh]/i.test(m) ? ' ' : '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

function collect(part, out) {
  const { headers, body } = splitHeaders(part);
  const ct = headers['content-type'] || 'text/plain';
  if (/^multipart\//i.test(ct)) {
    const b = param(ct, 'boundary');
    if (!b) return;
    for (const p of body.split('--' + b).slice(1)) {
      if (/^--/.test(p)) break;
      collect(p.replace(/^\r?\n/, ''), out);
    }
  } else if (/^message\/rfc822/i.test(ct)) {
    collect(body, out);
  } else if (!/attachment/i.test(headers['content-disposition'] || '')) {
    const txt = decodeBody(body, headers['content-transfer-encoding'], param(ct, 'charset'));
    if (/^text\/html/i.test(ct)) out.html.push(txt);
    else if (/^text\/plain/i.test(ct)) out.text.push(txt);
  }
}

function parseEmail(raw) {
  raw = String(raw);
  // Testo semplice incollato a mano (senza intestazioni email): lo si usa così com'è.
  const head = raw.replace(/^\s+/, '').split(/\r?\n\r?\n/)[0];
  if (!/^(from|to|subject|date|message-id|received|return-path|mime-version|content-type|reply-to|delivered-to):/im.test(head)) {
    return { from: '', replyTo: '', subject: '', date: '', messageId: '', text: raw.trim() };
  }
  const { headers } = splitHeaders(raw);
  const out = { text: [], html: [] };
  collect(raw, out);
  const text = out.text.join('\n').trim() || htmlToText(out.html.join('\n')).trim();
  return {
    from: decodeWords(headers['from'] || ''),
    replyTo: decodeWords(headers['reply-to'] || ''),
    subject: decodeWords(headers['subject'] || ''),
    date: headers['date'] || '',
    messageId: (headers['message-id'] || '').trim(),
    text,
  };
}

module.exports = { parseEmail, htmlToText };
