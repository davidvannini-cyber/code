const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });

  const consoleErrors = [];
  page.on('console', (msg) => {
    consoleErrors.push(msg.type()+': '+msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });

  const filePath = path.resolve(
    '/root/progetti/RENDERING MONTASCALE/assets/reference/rail-01.jpg',
  );
  await page.setInputFiles('input[type=file]', filePath);

  // Aspetta che l'immagine sia caricata (naturalWidth valorizzato)
  await page.waitForFunction(() => {
    const img = document.querySelector('img');
    return img && img.naturalWidth > 0;
  }, { timeout: 10000 });

  await page.waitForTimeout(1000); // layout settle + canvas mount

  const preCanvas = await page.locator('canvas').count();
  console.log('Canvas presente prima del tracciamento?', preCanvas);
  if (preCanvas > 0) {
    await page.locator('canvas').screenshot({ path: '/tmp/rm-00-default-camera.png' });
    console.log('SCREENSHOT default camera OK');
  }

  const box = await page.locator('img').boundingBox();
  const natural = await page.evaluate(() => {
    const img = document.querySelector('img');
    return { w: img.naturalWidth, h: img.naturalHeight };
  });
  console.log('IMG box:', box, 'natural:', natural);

  // Punti scelti a occhio sui bordi visibili dei gradini nella foto
  // (coordinate pixel "naturali" dell'immagine 1204x1600)
  const naturalPoints = [
    [700, 960], [1150, 940], // gradino 0: sx, dx
    [690, 770], [1160, 750], // gradino 1
    [680, 580], [1170, 560], // gradino 2
    [670, 390], [1180, 370], // gradino 3
  ];

  // Ricalcolo il bounding box ad ogni click: appena stepCount raggiunge 2
  // (dopo il 4° punto) compaiono i bottoni "1. Gradini/2. Punto pavimento"
  // che spostano il layout, invalidando un box calcolato in anticipo.
  for (const p of naturalPoints) {
    const liveBox = await page.locator('img').boundingBox();
    const s = {
      x: liveBox.x + (p[0] / natural.w) * liveBox.width,
      y: liveBox.y + (p[1] / natural.h) * liveBox.height,
    };
    await page.mouse.click(s.x, s.y);
    await page.waitForTimeout(100);
  }

  await page.screenshot({ path: '/tmp/rm-02-traced.png' });
  console.log('SCREENSHOT traced OK');

  const pointsCountText = await page.locator('text=punti tracciati').textContent();
  console.log('Points status:', pointsCountText);

  // Passo 2: punto di riferimento sul pavimento (rompe l'ambiguità planare).
  // IMPORTANTE: i bottoni "1. Gradini / 2. Punto pavimento" appaiono solo ora
  // (stepCount>=2), spostando il layout — ricalcolo il bounding box
  // dell'immagine invece di riusare quello calcolato prima (altrimenti il
  // click del punto pavimento finisce nel posto sbagliato, verificato: errore
  // di riproiezione esploso a 1800+px per un semplice offset di layout).
  await page.locator('button', { hasText: '2. Punto pavimento' }).click();
  await page.waitForTimeout(200);
  const box2 = await page.locator('img').boundingBox();
  const toScreen2 = ([nx, ny]) => ({
    x: box2.x + (nx / natural.w) * box2.width,
    y: box2.y + (ny / natural.h) * box2.height,
  });
  // Punto dove l'alzata del gradino "0" tracciato incontra il livello sottostante,
  // calibrato per errore di riproiezione minimo (vedi tests/test-realphoto-floor-debug.ts)
  const floorNatural = [800, 1000];
  const sFloor = toScreen2(floorNatural);
  await page.mouse.click(sFloor.x, sFloor.y);
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/rm-02b-floor-traced.png' });
  console.log('SCREENSHOT floor point traced OK');

  const generateBtn = page.locator('button', { hasText: 'Genera anteprima 3D' });
  const disabled = await generateBtn.isDisabled();
  console.log('Generate button disabled?', disabled);

  await generateBtn.click();

  // La stima PnP è async (carica WASM opencv.js la prima volta) - aspetto lo status
  await page.waitForFunction(() => {
    const els = [...document.querySelectorAll('p')];
    return els.some((el) => /stimata|fallita/i.test(el.textContent || ''));
  }, { timeout: 30000 }).catch(() => console.log('TIMEOUT waiting for status text'));

  await page.waitForTimeout(500);
  const statusText = await page.locator('p').last().textContent();
  console.log('Status after generate:', statusText);

  await page.screenshot({ path: '/tmp/rm-03-result.png' });
  console.log('SCREENSHOT result OK');

  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, w: c.width, h: c.height };
  });
  console.log('Canvas info:', canvasInfo);

  if (canvasInfo) {
    await page.locator('canvas').screenshot({ path: '/tmp/rm-04-canvas-only.png' });
    console.log('SCREENSHOT canvas-only OK');
  }

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors, null, 2));

  await browser.close();
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
