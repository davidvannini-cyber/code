// Uso: GEMINI_API_KEY=... node harmonize.mjs <fotomontaggio.png> <out.png>
import fs from 'node:fs'
const [inp,out]=process.argv.slice(2)
const prompt=`Fotomontaggio di un montascale su una foto reale. Il binario (due tubi d'acciaio con montanti bianchi) è già disegnato nella posizione e forma corretta, comprese le curve: MANTIENI esattamente forma, posizione e percorso. Rendilo fotorealistico: acciaio zincato con riflessi coerenti con l'ambiente, montanti bianchi verniciati, ombre proiettate e di contatto sui gradini, grana e nitidezza uguali alla foto. Non alterare la scala né altro.`
const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:'image/png',data:fs.readFileSync(inp).toString('base64')}}]}],generationConfig:{responseModalities:['IMAGE','TEXT']}})})
const j=await r.json(); if(!r.ok){console.log(JSON.stringify(j).slice(0,400));process.exit(1)}
for(const p of j.candidates?.[0]?.content?.parts??[]){const d=p.inlineData??p.inline_data; if(d){fs.writeFileSync(out,Buffer.from(d.data,'base64'));console.log('ok')}}
