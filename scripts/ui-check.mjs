import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const base=new URL('../',import.meta.url);
const html=readFileSync(new URL('index.html',base),'utf8');
const dom=new JSDOM(html,{url:'https://test.local/',pretendToBeVisual:true,runScripts:'outside-only'});
const w=dom.window,context=dom.getInternalVMContext();
const errors=[],plots=new Map();
w.console.error=(...args)=>errors.push(args.map(String).join(' '));
w.matchMedia=()=>({matches:false});
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.scrollTo=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;};
w.IntersectionObserver=class{observe(){}disconnect(){}};
w.ResizeObserver=class{observe(){}disconnect(){}};
w.AbortSignal=AbortSignal;
w.fetch=async url=>{
  if(String(url).startsWith('/data/')){const data=JSON.parse(readFileSync(new URL((process.env.UI_DATA_DIR||'public')+url,base)));return {ok:true,json:async()=>data};}
  throw new Error('Las consultas externas se excluyen de esta prueba de DOM');
};
const source=readFileSync(new URL('src/main.js',base),'utf8');
const lucideNames=source.match(/import \{ ([^}]+) \} from 'lucide'/)[1].split(',').map(x=>x.trim().split(' as ')[0]);
function stub(exports){const m=new vm.SyntheticModule(Object.keys(exports),function(){for(const [k,v] of Object.entries(exports))this.setExport(k,v);},{context});return m;}
const cache=new Map();
async function load(path){if(cache.has(path))return cache.get(path);const m=new vm.SourceTextModule(readFileSync(new URL(path,base),'utf8'),{context,identifier:path});cache.set(path,m);await m.link(async spec=>{
  if(spec.endsWith('.css'))return stub({});
  if(spec==='echarts/core')return stub({use:()=>{},init:el=>({setOption:option=>plots.set(el.id,option),resize:()=>{}})});
  if(spec==='echarts/charts')return stub(Object.fromEntries(['BarChart','LineChart','PieChart','ScatterChart'].map(n=>[n,{}])));
  if(spec==='echarts/components')return stub(Object.fromEntries(['GridComponent','LegendComponent','TooltipComponent'].map(n=>[n,{}])));
  if(spec==='echarts/renderers')return stub({SVGRenderer:{}});
  if(spec==='lucide')return stub(Object.fromEntries(lucideNames.map(n=>[n,n==='createIcons'?()=>{}:{}])));
  return load('src/'+spec.replace('./',''));
});return m;}
const m=await load('src/main.js');await m.evaluate();
for(let i=0;i<100&&w.document.documentElement.dataset.ready!=='true';i++)await new Promise(resolve=>setTimeout(resolve,20));
const doc=w.document;
assert.equal(doc.documentElement.dataset.ready,'true',errors.join('\n'));
assert.equal(doc.querySelectorAll('.section').length,13);
assert.equal(doc.querySelectorAll('#service-outcomes tbody tr').length,10);
assert.equal(doc.querySelectorAll('#traffic-counts tbody tr').length,9);
assert(doc.querySelector('#service-outcomes').textContent.includes('F35'));
assert(doc.querySelector('#traffic-counts').textContent.includes('Sin dato'));
assert.equal(doc.querySelectorAll('#people-metrics .metric').length,16);
assert.equal(doc.querySelectorAll('#navigation a').length,13);
assert(plots.size>=30);
assert.equal(doc.querySelectorAll('#composite-map path').length,197);
assert.equal(doc.querySelectorAll('#composite-ranking tr').length,197);
const originalMap=doc.querySelector('#composite-map').innerHTML;
const slider=doc.querySelector('[data-composite-weight="transit"]');slider.value=10;slider.dispatchEvent(new w.Event('input'));
assert.notEqual(doc.querySelector('#composite-map').innerHTML,originalMap,'Weights must update map scores');
doc.querySelector('#composite-reset').click();assert.equal(doc.querySelector('#composite-map').innerHTML,originalMap);
for(const el of doc.querySelectorAll('[data-composite-weight]')){el.value=0;el.dispatchEvent(new w.Event('input'));}
assert(doc.querySelector('#composite-status').textContent.includes('0 de 197'));
doc.querySelector('#composite-reset').click();
doc.querySelector('#composite-borough').value='Brooklyn';doc.querySelector('#composite-borough').dispatchEvent(new w.Event('change'));
assert.equal(doc.querySelectorAll('#composite-map path').length,doc.querySelectorAll('#composite-ranking tr').length);
assert(doc.querySelectorAll('#composite-ranking tr').length<197);
doc.querySelector('#composite-borough').value='all';doc.querySelector('#composite-borough').dispatchEvent(new w.Event('change'));
const path=doc.querySelectorAll('#composite-map path')[3];path.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(doc.querySelector('#composite-primary').value,path.dataset.compositeId);
assert.equal(plots.get('nta-scatter').series[0].data.length,195);
doc.querySelector('#nta-axis-x').value='buildingsSample';doc.querySelector('#nta-axis-x').dispatchEvent(new w.Event('change'));assert.equal(plots.get('nta-scatter').series[0].data.length,0);assert(doc.querySelector('#nta-relation-result').textContent.includes('No calculable'));
assert(doc.querySelector('#age-total').textContent.includes('8.804.190'));
const annualText=doc.querySelector('#annual-311-total').textContent;doc.querySelector('#annual-311-period').value='requests';doc.querySelector('#annual-311-period').dispatchEvent(new w.Event('change'));assert.notEqual(doc.querySelector('#annual-311-total').textContent,annualText);assert(doc.querySelector('#annual-311-total').textContent.includes('332.103'));
assert.equal(doc.querySelectorAll('#excel-source-usage tbody tr').length,30);
assert.equal(doc.querySelectorAll('#state-health-table tr').length,2116);
doc.querySelector('#state-health-search').value='zzzzzzz';doc.querySelector('#state-health-search').dispatchEvent(new w.Event('input'));assert(doc.querySelector('#state-health-table').textContent.includes('No hay coincidencias'));
assert.equal(doc.querySelectorAll('#nta-table tr').length,197);
doc.querySelector('#nta-search').value='Greenpoint';doc.querySelector('#nta-search').dispatchEvent(new w.Event('input'));
assert.equal(doc.querySelectorAll('#nta-table tr').length,1);
assert(doc.querySelector('#nta-detail').textContent.includes('39.784'));
assert(doc.querySelector('#nta-detail').textContent.includes('Fuera de cobertura'));
doc.querySelector('#nta-search').value='';doc.querySelector('#nta-search').dispatchEvent(new w.Event('input'));
doc.querySelector('#nta-universe').value='special';doc.querySelector('#nta-universe').dispatchEvent(new w.Event('change'));
assert.equal(doc.querySelectorAll('#nta-table tr').length,65);
assert(doc.querySelector('#nta-detail').textContent.includes('No aplicable'));
doc.querySelector('#nta-search').value='zzzzzz';doc.querySelector('#nta-search').dispatchEvent(new w.Event('input'));
assert(doc.querySelector('#nta-table').textContent.includes('No hay áreas'));
doc.querySelector('#nta-search').value='';doc.querySelector('#nta-universe').value='residential';doc.querySelector('#nta-universe').dispatchEvent(new w.Event('change'));
const prev=doc.querySelector('#score').textContent;
doc.querySelector('#primary').value='Queens';doc.querySelector('#primary').dispatchEvent(new w.Event('change'));
assert.notEqual(doc.querySelector('#score').textContent,prev);
doc.querySelector('[data-preset="1"]').click();
const presetScore=doc.querySelector('#score').textContent;
doc.querySelector('[data-weight="0"]').dispatchEvent(new w.Event('input'));
assert.equal(doc.querySelector('#score').textContent,presetScore,'Un control sin cambios debe conservar los pesos del preset');
doc.querySelector('#swap-boroughs').click();
assert.equal(doc.querySelector('#primary').value,'Brooklyn');
assert.equal(doc.querySelector('#comparison').value,'Queens');
doc.querySelector('#people-borough').value='Bronx';doc.querySelector('#people-borough').dispatchEvent(new w.Event('change'));
assert(doc.querySelector('#people-metrics').textContent.includes('1.406.332'));
doc.querySelector('#people-metrics .metric').click();
assert(doc.querySelector('#source-dialog').open);
assert(doc.querySelector('#source-detail').textContent.includes('Bronx'));
doc.querySelector('[data-close="source-dialog"]').click();
const traceabilityControls=[...new Set(doc.querySelectorAll('button[data-metric],button[data-source]'))];
const traceabilityResults=[];
for(const [index,control] of traceabilityControls.entries()){
  control.click();
  const dialog=doc.querySelector('#source-dialog');
  assert(dialog.open,`El control ${index+1} no abrió la ficha de fuente`);
  const fields=Object.fromEntries([...doc.querySelectorAll('#source-detail dt')].map(dt=>[dt.textContent.trim(),dt.nextElementSibling?.textContent.trim()||'']));
  for(const field of ['ID de fuente','Fuente','Entidad','Vigencia','Probado','Estado','Método'])assert(fields[field],`El control ${index+1} no muestra ${field}`);
  assert(/F\d{2}/.test(fields['ID de fuente']),`El control ${index+1} (${control.dataset.source||control.dataset.metric||control.textContent.trim().slice(0,80)}) no muestra un ID Fxx: ${fields['ID de fuente']}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(fields.Probado),`El control ${index+1} no muestra fecha de prueba válida: ${fields.Probado}`);
  const original=doc.querySelector('#source-detail a[href]');
  assert(original?.href.startsWith('https://'),`El control ${index+1} no enlaza una fuente HTTPS`);
  traceabilityResults.push({
    click:index+1,
    control:control.dataset.metric?'cifra':'fuente',
    label:(control.getAttribute('aria-label')||control.textContent).trim().replace(/\s+/g,' ').slice(0,180),
    sourceId:fields['ID de fuente'],
    source:fields.Fuente,
    agency:fields.Entidad,
    period:fields.Vigencia,
    tested:fields.Probado,
    status:fields.Estado,
    originalUrl:original.href
  });
  doc.querySelector('[data-close="source-dialog"]').click();
  assert(!dialog.open,`La ficha del control ${index+1} no cerró correctamente`);
}
const traceabilityAudit={
  ok:true,
  testedAt:'2026-11-03',
  scope:'Todos los botones de cifras y fuentes renderizados por la aplicación.',
  clicksVerified:traceabilityResults.length,
  uniqueSourceIds:[...new Set(traceabilityResults.flatMap(row=>row.sourceId.match(/F\d{2}/g)||[]))].sort(),
  requiredFields:['ID de fuente','Fuente','Entidad','Vigencia','Probado','Estado','Método','Enlace HTTPS'],
  results:traceabilityResults
};
writeFileSync(new URL('public/data/traceabilityAudit.json',base),JSON.stringify(traceabilityAudit,null,2));
doc.querySelector('#axis-x').value='rent';doc.querySelector('#axis-x').dispatchEvent(new w.Event('change'));
assert(plots.get('scatter-chart').series[0].data.length===5);
assert(!doc.querySelector('#correlation-value').textContent.includes('NaN'));
doc.querySelector('#source-filter').value='zzzz';doc.querySelector('#source-filter').dispatchEvent(new w.Event('input'));
assert(doc.querySelector('#source-table').textContent.includes('No hay fuentes'));
doc.querySelector('#source-filter').value='';doc.querySelector('#source-filter').dispatchEvent(new w.Event('input'));
doc.querySelector('#open-search').click();
doc.querySelector('#global-search').value='Central';doc.querySelector('#global-search').dispatchEvent(new w.Event('input'));
assert(doc.querySelector('#search-results').textContent.includes('Central Park'));
doc.querySelector('[data-close="search-dialog"]').click();
doc.querySelector('#presentation').click();assert(doc.body.classList.contains('presenting'));doc.querySelector('#exit-presentation').click();assert(!doc.body.classList.contains('presenting'));
const duplicateIds=[...doc.querySelectorAll('[id]')].map(el=>el.id).filter((id,i,all)=>all.indexOf(id)!==i);
assert.deepEqual(duplicateIds,[]);
assert.equal(errors.length,0,errors.join('\n'));
console.log(JSON.stringify({ok:true,sections:13,charts:plots.size,traceabilityClicks:traceabilityAudit.clicksVerified,traceabilityIds:traceabilityAudit.uniqueSourceIds,checks:['seleccion y comparacion territorial','todas las fichas y fuentes','correlaciones','catalogo','busqueda','presentacion','IDs unicos'],limitation:'Prueba funcional de DOM; no valida WebGL ni apariencia visual'}));
w.close();
