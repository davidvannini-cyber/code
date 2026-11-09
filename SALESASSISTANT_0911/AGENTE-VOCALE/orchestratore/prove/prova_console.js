// Prova completa nella Console vera (Chromium): serve prima `python3 prove/server_di_prova.py`. Lancio: NODE_PATH=$(npm root -g) node prove/prova_console.js
const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:900}});
 const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('dialog',d=>{console.log('DIALOG:',d.message());d.accept('TEST')});
 await p.addInitScript(()=>{window.claude={db:{get:async()=>undefined,set:async()=>{},delete:async()=>{}}}});
 await p.goto('file://'+require('path').resolve(__dirname,'../../../LEADREWORKS/src/lead-rework-console.html'));
 await p.waitForFunction(()=>typeof state!=='undefined' && state.profile, null, {timeout:15000});
 await p.evaluate(()=>{
  localStorage.setItem(LOCAL_PREFIX+'phone_topic','ym-prova');
  const id='lead1';
  state.leadsHistory[id]={id,stato_lead:1,canali_generati:['telefono'],data_creazione:new Date().toISOString(),dati_lead_input:{nome:'Mario Rossi',telefono1:'3331234567',prodotto:'Montascale',zona:'Città (XX)',prezzo_esistente:'13.000 €',tempistica:'1 mese',analisi_strategia:'Recuperare il lead',note:'visita fatta',data_appuntamento:'28/10'},script_generati:{'Telefono 1':'Buongiorno [Nome] (con calma)'}};
  state.tab='storico'; state.historyOpen=id; render();
 });
 await p.waitForTimeout(300);
 console.log('bottoni:', await p.$$eval('.hm-lb .hm-txt',e=>e.map(x=>x.textContent)));
 await p.click('.hm-lb[title^="Chiama con l"]');
 await p.waitForSelector('.agai-conf',{timeout:5000});
 console.log('tipo preselezionato:', await p.$eval('.agai-tipo',e=>e.value));
 await p.click('.agai-conf button[data-a=si]');
 await p.waitForSelector('#agai-strip');
 await p.waitForFunction(()=>/Sto chiamando/.test(document.getElementById('agai-strip').textContent));
 await p.click('#agai-strip button[data-az=risposto]');
 await p.waitForFunction(()=>/Il cliente aspetta/.test(document.getElementById('agai-strip').textContent),null,{timeout:8000});
 await p.screenshot({path:require('os').tmpdir()+'/strip-passaggio.png'});
 await p.click('#agai-strip button[data-az=ci-sono]');
 await p.waitForFunction(()=>/Stai parlando tu/.test(document.getElementById('agai-strip').textContent));
 await p.click('#agai-strip button[data-az=termina]');
 await p.waitForFunction(()=>/Chiamata passata a te/.test(document.getElementById('agai-strip').textContent),null,{timeout:8000});
 await p.waitForTimeout(300);
 const r=await p.evaluate(()=>({n:state.leadsHistory.lead1.chiamate_ai.length,note:state.leadsHistory.lead1.note_ym,ta:(document.querySelector('textarea[oninput^="saveHistoryNoteYM"]')||{}).value}));
 console.log(JSON.stringify(r));
 console.log('errori pagina:',errs);
 await b.close();
})();
