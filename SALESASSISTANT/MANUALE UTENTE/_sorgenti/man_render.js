// node man_render.js misura in.html out.json   -> altezze (px) di ogni blocco e capacità delle pagine
// node man_render.js pdf in.html out.pdf       -> PDF A4 + controllo che nessuna pagina "trabocchi"
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const [mode, inp, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(inp));
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => { await Promise.all(Array.from(document.images).map(i => i.decode ? i.decode().catch(() => {}) : Promise.resolve())); });
  if (mode === 'misura') {
    const r = await p.evaluate(() => {
      const hOf = el => { const cs = getComputedStyle(el); return el.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); };
      const first = document.querySelector('section.pagina.first .corpo'); const cont = document.querySelector('section.pagina.cont .corpo');
      const capFirst = first.clientHeight, capCont = cont.clientHeight;
      const mis = document.getElementById('misura');
      // la larghezza della zona di misura deve essere quella reale del corpo
      mis.style.width = first.clientWidth + 'px';
      const alt = Array.from(mis.querySelectorAll(':scope > .b')).map(hOf);
      const mt = document.getElementById('misura_toc'); mt.style.width = ((first.clientWidth - 9 * 96 / 25.4) / 2) + 'px';
      const altToc = Array.from(mt.querySelectorAll('.toc-riga')).map(hOf);
      return { capFirst, capCont, altezze: alt, altezzeToc: altToc, larghezza: first.clientWidth };
    });
    fs.writeFileSync(out, JSON.stringify(r));
  } else {
    // controllo traboccamenti
    const over = await p.evaluate(() => Array.from(document.querySelectorAll('section.pagina')).map(s => {
      const c = s.querySelector('.corpo'); if (!c) return null;
      return c.scrollHeight - c.clientHeight > 1 ? { id: s.id, extra: c.scrollHeight - c.clientHeight } : null;
    }).filter(Boolean));
    if (over.length) console.log('TRABOCCAMENTI:', JSON.stringify(over));
    await p.pdf({ path: out, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
  }
  await b.close();
})().catch(e => { console.error('ERRORE', e); process.exit(1); });
