// node render_pdf.js in1.html out1.pdf in2.html out2.pdf ...
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i += 2) {
    const p = await b.newPage();
    await p.goto('file://' + path.resolve(a[i]));
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: a[i + 1], preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
    await p.close();
  }
  await b.close();
})();
