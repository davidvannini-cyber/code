const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });

  const filePath = path.resolve(
    '/root/progetti/RENDERING MONTASCALE/assets/reference/rail-01.jpg',
  );
  await page.setInputFiles('input[type=file]', filePath);
  await page.waitForFunction(() => {
    const img = document.querySelector('img');
    return img && img.naturalWidth > 0;
  }, { timeout: 10000 });
  await page.waitForTimeout(500);

  const box = await page.locator('img').boundingBox();
  // Muovo il mouse sopra l'immagine (senza cliccare) per attivare la lente
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.6, { steps: 5 });
  await page.waitForTimeout(200);

  await page.screenshot({ path: '/tmp/rm-loupe-test.png' });
  console.log('SCREENSHOT loupe OK');

  const loupeVisible = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')];
    const loupe = canvases.find((c) => c.style.borderRadius === '50%');
    return loupe ? { display: loupe.style.display, left: loupe.style.left, top: loupe.style.top } : null;
  });
  console.log('Loupe canvas state:', loupeVisible);

  await browser.close();
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
