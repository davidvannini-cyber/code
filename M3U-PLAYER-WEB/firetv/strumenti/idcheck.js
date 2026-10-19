// Gemello di IdCheck.java: stesso output, calcolato con le regole JavaScript del sito (public/dtt-it.js).
const fs = require('fs');
const path = require('path');
const pub = path.join(__dirname, '..', '..', 'public');
const M3U = require(path.join(pub, 'm3u.js'));
const DTT = require(path.join(pub, 'dtt-it.js'));
const ch = M3U.parseM3U(fs.readFileSync(process.argv[2], 'utf8')).channels;
const groups = DTT.groupChannels(ch);
let out = 'canali=' + ch.length + ' gruppi=' + groups.length + '\n';
for (const g of groups) out += 'G\t' + g.id + '\t' + (g.lcn === undefined ? 'null' : g.lcn) + '\t' + DTT.cleanName(g.head) + '\t' + g.alts.length + '\n';
for (const g of DTT.sortGroups(groups.filter(g => g.alts.some(DTT.isItalian)))) out += 'I\t' + g.id + '\t' + (g.lcn === undefined ? 'null' : g.lcn) + '\t' + g.head.url + '\n';
process.stdout.write(out);
