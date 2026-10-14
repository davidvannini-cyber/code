'use strict';
const fs = require('fs');
const path = require('path');
const FILE = process.env.LEADS_FILE || path.join(__dirname, 'data', 'leads.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}
function save(leads) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(leads, null, 2));
  fs.renameSync(tmp, FILE);
}
module.exports = { load, save };
