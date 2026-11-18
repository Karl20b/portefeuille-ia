// All engines/languages are served from this application. Source files remain in this browser.
export const OCR_MAX_BYTES=8388608,OCR_MAX_PAGES=10,OCR_MAX_CHARACTERS=100000;
const base=new URL('./vendor-ocr-v1/',import.meta.url);
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Lecture OCR annulée.','AbortError');};
export function ocrRange(start,end,pages){start=Number(start);end=Number(end);if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>pages||end-start+1>OCR_MAX_PAGES)throw Error('Choisis une plage valide de 10 pages maximum, comprise dans le document.');return {start,end};}
export async function ocrFileType(file){
 if(!file||file.size<1||file.size>OCR_MAX_BYTES)throw Error('Choisis un fichier non vide de 8 Mo maximum.');
 const ext=file.name.split('.').pop().toLowerCase(),b=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const ascii=String.fromCharCode(...b);
 if(ext==='pdf'&&ascii.startsWith('%PDF-'))return 'pdf';
 if(ext==='png'&&b[0]===137&&ascii.slice(1,4)==='PNG')return 'image';
 if(['jpg','jpeg'].includes(ext)&&b[0]===255&&b[1]===216&&b[2]===255)return 'image';
 if(ext==='webp'&&ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP')return 'image';
 throw Error('Pour l’OCR, choisis un PDF, PNG, JPG/JPEG ou WebP valide.');
}
async function interruptible(promise,signal){
 aborted(signal);let listener;
 const interrupted=new Promise((resolve,reject)=>{listener=()=>reject(new DOMException('Lecture OCR annulée.','AbortError'));signal?.addEventListener('abort',listener,{once:true});});
 try{return await Promise.race([promise,interrupted]);}finally{signal?.removeEventListener('abort',listener);}
}
export async function prepareOcr(file,{signal,onProgress=()=>{}}={}){
 const kind=await ocrFileType(file);aborted(signal);
 if(kind==='image')return {kind,file,pages:1,destroy:async()=>{}};
 onProgress('Ouverture du PDF dans le navigateur…');
 const pdfjs=await import('./vendor-ocr-v1/pdf/pdf.mjs');aborted(signal);
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf/pdf.worker.mjs',base).href;
 const loading=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableXfa:false,useWasm:false,cMapUrl:new URL('pdf/cmaps/',base).href,cMapPacked:true,standardFontDataUrl:new URL('pdf/standard_fonts/',base).href,wasmUrl:new URL('pdf/wasm/',base).href,iccUrl:new URL('pdf/iccs/',base).href});
 try{const pdf=await interruptible(loading.promise,signal);return {kind,file,pdf,pages:pdf.numPages,destroy:()=>loading.destroy()};}
 catch(e){await loading.destroy();if(e.name==='AbortError')throw e;throw Error('PDF illisible ou protégé. Choisis une version non protégée.');}
}
async function imageCanvas(file){
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
 try{
  if(bitmap.width*bitmap.height>40000000)throw Error('Image trop grande : utilise une image de moins de 40 mégapixels.');
  const scale=Math.min(1,3200/bitmap.width,3200/bitmap.height,Math.sqrt(6000000/(bitmap.width*bitmap.height)));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas;
 }finally{bitmap.close();}
}
export async function recognizeOcr(job,{start=1,end=1,signal,onProgress=()=>{}}={}){
 ({start,end}=ocrRange(start,end,job.pages));aborted(signal);
 onProgress('Chargement du lecteur OCR français et anglais…');
 const {default:Tesseract}=await import('./vendor-ocr-v1/tesseract/tesseract.esm.min.js');const {createWorker}=Tesseract;aborted(signal);
 let worker,currentPage=start;const parts=[],unread=[],uncertain=[];let characters=0;
 const stop=()=>{if(worker)worker.terminate().catch(()=>{});};signal?.addEventListener('abort',stop,{once:true});
 try{
  const creating=createWorker('fra+eng',1,{workerPath:new URL('tesseract/worker.min.js',base).href,corePath:new URL('core/',base).href,langPath:new URL('lang/',base).href,workerBlobURL:false,gzip:false,logger:m=>{if(m.status==='recognizing text')onProgress(`Page ${currentPage} sur ${end} · reconnaissance ${Math.round(m.progress*100)} %`);}});creating.then(w=>{if(signal?.aborted)w.terminate().catch(()=>{});});worker=await interruptible(creating,signal);
  for(let number=start;number<=end;number++){
   aborted(signal);currentPage=number;onProgress(`Page ${number} sur ${end} · préparation de l’image…`);let canvas,page;
   try{
    if(job.kind==='pdf'){
     page=await interruptible(job.pdf.getPage(number),signal);const unscaled=page.getViewport({scale:1});const scale=Math.min(2.5,4500/unscaled.width,4500/unscaled.height,Math.sqrt(6000000/(unscaled.width*unscaled.height)));const viewport=page.getViewport({scale});
     canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const context=canvas.getContext('2d',{willReadFrequently:true});
     await interruptible(page.render({canvas,canvasContext:context,viewport,background:'rgb(255,255,255)'}).promise,signal);
    }else canvas=await interruptible(imageCanvas(job.file),signal);
    const {data}=await interruptible(worker.recognize(canvas,{}, {text:true}),signal);
    const text=(data.text||'').replace(/\r\n?/g,'\n').trim();
    if((text.match(/\p{L}/gu)||[]).length<3){unread.push(number);continue;}
    characters+=[...text].length;if(characters>OCR_MAX_CHARACTERS)throw Error('Le texte OCR dépasse 100 000 caractères. Choisis moins de pages.');
    if(Number(data.confidence)<60)uncertain.push(number);
    parts.push({label:job.kind==='pdf'?`Page ${number} · OCR`:'Image · OCR',text});
   }finally{if(canvas){canvas.width=1;canvas.height=1;}page?.cleanup();}
  }
  if(!parts.length)throw Error('Aucun texte suffisamment lisible. Essaie une image plus nette, droite et bien éclairée.');
  const text=parts.map(p=>`[${p.label}]\n${p.text}`).join('\n\n');
  const warnings=['Texte obtenu par OCR, à vérifier contre le document original : des lettres, nombres, noms ou négations peuvent être mal reconnus. Une citation retrouvée dans ce texte ne garantit pas sa fidélité à l’image.','La reconnaissance a été effectuée dans ce navigateur. Aucun scan ou image n’a été envoyé à un service de conversion externe. Seul le texte retenu peut être envoyé ensuite au service IA configuré.'];
  if(start!==1||end!==job.pages)warnings.push(`Seules les pages ${start} à ${end} sur ${job.pages} ont été lues. Les autres pages ne sont pas analysées.`);
  if(unread.length)warnings.push('Pages sans texte lisible reconnu : '+unread.join(', ')+'. Elles ne sont pas considérées comme analysées.');
  if(uncertain.length)warnings.push('Reconnaissance incertaine, contrôle renforcé conseillé : page(s) '+uncertain.join(', ')+'.');
  return {filename:job.file.name,format:'ocr',parts,text,characters:[...text].length,reference:job.file.name+' · OCR à vérifier'+(job.kind==='pdf'?` · pages ${start}–${end}`:''),warnings};
 }finally{signal?.removeEventListener('abort',stop);if(worker)await worker.terminate().catch(()=>{});}
}
