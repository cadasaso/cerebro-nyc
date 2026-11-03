import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {boroughs,city} from '../src/seed.js';
import {correlation,ranks,normalize} from '../src/math.js';
const base=new URL('../',import.meta.url),read=key=>JSON.parse(readFileSync(new URL(`public/data/${key}.json`,base)));
const catalog=read('catalog');
for(const entry of catalog.datasets.filter(s=>s.status==='integrado')){
  assert(existsSync(new URL(`public/data/${entry.key}.json`,base)),`Falta ${entry.key}`);
  assert(entry.source.startsWith('https://')||(entry.key==='sourceUsage'&&entry.source==='/data/sourceUsage.json'));
}
assert.equal(boroughs.reduce((n,b)=>n+b.population,0),city.population,'La poblacion de los boroughs debe sumar NYC');
assert.equal(boroughs.reduce((n,b)=>n+b.pop2020,0),city.pop2020);
assert.equal(read('boroughs').features.length,5);
assert.equal(read('neighborhoods').features.length,262);
assert.equal(read('subway').length,496);
assert.equal(read('requests').reduce((n,x)=>n+ +x.count,0),+read('requestMonths').find(x=>+x.month===12).count,'El desglose de diciembre debe reconciliar con el total de ese mes');
assert(!existsSync(new URL('public/data/crashPoints.json',base)),'No se deben publicar eventos de colisión con coordenadas exactas');
assert(!catalog.datasets.some(s=>s.key==='crashPoints'),'El catálogo público no debe ofrecer la capa de eventos exactos');
assert.equal(correlation([1,2,3],[3,2,1]),-1);
assert.equal(correlation([1,2,3],[2,4,6],'spearman'),1);
assert.deepEqual(ranks([2,2,5]),[1.5,1.5,3]);
assert.equal(correlation([2,2,2],[1,2,3]),null);
assert.equal(normalize(5,[5,5,5]),50);
let coordinates=0;
function checkCoordinates(a){if(typeof a[0]==='number'){assert(a.every(Number.isFinite));assert(a[0]>-75&&a[0]<-73);assert(a[1]>40&&a[1]<42);coordinates++;}else a.forEach(checkCoordinates);}
for(const key of ['boroughs','neighborhoods','buildings','parks'])for(const f of read(key).features)checkCoordinates(f.geometry.coordinates);
assert(read('buildings').features.some(f=>+f.properties.height_roof>500),'Deben existir edificios altos reales en el recorte');
const html=new JSDOM(readFileSync(new URL('index.html',base),'utf8'));
assert(html.window.document.querySelector('script[type=module]'));
assert.equal(html.window.document.documentElement.lang,'es');
console.log(JSON.stringify({ok:true,boroughs:5,geographicCoordinates:coordinates,requestsDecember:read('requests').reduce((n,x)=>n+ +x.count,0),sources:catalog.datasets.length,checks:['totales demograficos','reconciliacion 311','correlaciones y empates','coordenadas geograficas','fuentes y archivos']}));
