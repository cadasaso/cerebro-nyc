import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('public/trazabilidad.html',root),'utf8');
const source=readFileSync(new URL('public/traceability.js',root),'utf8');
const report=JSON.parse(readFileSync(new URL('public/data/traceabilityAudit.json',root)));

async function check(fetch){
  const dom=new JSDOM(html,{url:'https://test.local/trazabilidad.html',runScripts:'outside-only'});
  dom.window.fetch=fetch;
  dom.window.eval(source);
  await new Promise(resolve=>setTimeout(resolve,30));
  return dom;
}

const successful=await check(async()=>({ok:true,json:async()=>report}));
try{
  const doc=successful.window.document;
  assert.equal(doc.getElementById('status').textContent,'APROBADA');
  assert.equal(doc.getElementById('clicks').textContent,String(report.clicksVerified));
  assert.equal(doc.getElementById('ids').textContent,String(report.uniqueSourceIds.length));
  assert.equal(doc.querySelectorAll('#rows tr').length,report.results.length);
  assert(doc.getElementById('download-test').disabled);
  assert(!doc.getElementById('run-test').disabled);
  const appDoc=doc.implementation.createHTMLDocument('App');
  appDoc.body.innerHTML='<main id="app"><section><div class="callout warning">Advertencia de cobertura</div></section></main>';
  setTimeout(()=>{appDoc.documentElement.dataset.ready='true';},10);
  assert.equal(await successful.window.waitForApp({contentDocument:appDoc}),appDoc);
}finally{successful.window.close();}

const failed=await check(async()=>({ok:false}));
try{
  assert.equal(failed.window.document.getElementById('status').textContent,'NO DISPONIBLE');
  assert(failed.window.document.getElementById('tested').textContent.includes('Sin resultado'));
}finally{failed.window.close();}

console.log(JSON.stringify({ok:true,checks:['estado renderizado sin variables globales reservadas','contadores y filas de evidencia','error de carga explícito','controles de prueba web']}));
