import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {locator,aggregatePoints,acsCell,number} from './territorial-lib.mjs';
import {selectTerritories,territoriesCSV,territorialPairs} from '../src/territories.js';
const base=new URL('../',import.meta.url),read=key=>JSON.parse(readFileSync(new URL('public/data/'+key+'.json',base)));
const rectangle=(id,x1,y1,x2,y2)=>({type:'Feature',properties:{nta2020:id},geometry:{type:'Polygon',coordinates:[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]}});
const left=rectangle('L',-74,40.5,-73.9,40.6),right=rectangle('R',-73.9,40.5,-73.8,40.6),locate=locator([left,right]);
assert.deepEqual(locate([-73.95,40.55]),{status:'assigned',code:'L'});
assert.equal(locate([-73.9,40.55]).status,'ambiguous','Frontera compartida no debe duplicar ni asignar arbitrariamente');
assert.equal(locate([null,40.55]).status,'invalid');assert.equal(locate(['',40.55]).status,'invalid');assert.equal(locate([-73.7,40.55]).status,'outside');
const hole=rectangle('H',-74,40.5,-73.8,40.7);hole.geometry.coordinates.push([[-73.95,40.55],[-73.85,40.55],[-73.85,40.65],[-73.95,40.65],[-73.95,40.55]]);
assert.equal(locator([hole])([-73.9,40.6]).status,'outside','Respetar agujeros');
const multi={type:'Feature',properties:{nta2020:'M'},geometry:{type:'MultiPolygon',coordinates:[left.geometry.coordinates,right.geometry.coordinates]}};
assert.equal(locator([multi])([-73.85,40.55]).code,'M');
let assigned=0;const audit=aggregatePoints([[-73.95,40.55],[-73.9,40.55],[null,40.55],[-73.7,40.55]],r=>r,locate,()=>assigned++);
assert.deepEqual(audit,{input:4,assigned:1,invalid:1,outside:1,ambiguous:1});assert.equal(assigned,1);
assert.equal(number(null),null);assert.equal(number(''),null);assert.equal(number('0'),0);
assert.equal(acsCell({sum:null}).value,null);assert.equal(acsCell({sum:-666666666}).value,null);assert.equal(acsCell({sum:0,isReliable:true}).value,0);
assert.equal(acsCell({sum:3500,codingThreshold:'upper'}).status,'censored');
assert.equal(acsCell({percent:.125,percentMarginOfError:.02},true).value,12.5);
assert.equal(acsCell({percent:.125,percentMarginOfError:.02},true).marginOfError,2);
const d=read('territories'),n=read('neighborhoods'),raw=JSON.parse(readFileSync(new URL('data-sources/nta-demographics.json',base)));
assert.equal(d.rows.length,262);assert.equal(d.rows.filter(r=>r.residential).length,197);assert.equal(d.unit.specialCount,65);
assert.equal(new Set(d.rows.map(r=>r.id)).size,d.rows.length);
const codes=new Set(n.features.map(f=>f.properties.nta2020));assert(d.rows.every(r=>codes.has(r.id)));
for(const [key,input] of Object.entries(d.inputs)){
  const file=new URL(key==='ntaDemographics'?'data-sources/nta-demographics.json':'public/data/'+key+'.json',base);
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),input.sha256,'Tabla desactualizada respecto de '+key);
}
for(const r of d.rows){
  assert(r.areaKm2>0);
  for(const value of Object.values(r.metrics))assert(value===null||(Number.isFinite(value)&&value>=0));
  if(r.residential){assert(r.metrics.population>0);const source=raw.rows.find(a=>a.code===r.id);assert.equal(r.metrics.population,source.variables.find(v=>v.variable==='pop').sum);}
  else for(const [key,m] of Object.entries(d.metrics).filter(([,m])=>m.variable))assert.equal(r.metrics[key],null,'No imputar ACS a áreas especiales');
  for(const key of ['allCrashes','crime','requests311','trees','companies'])assert.equal(r.metrics[key],null);
  if(r.quality.buildingsSample.status==='outside_coverage')assert.equal(r.metrics.buildingsSample,null);
}
for(const [source,a] of Object.entries(d.audit)){
  assert.equal(a.input,a.assigned+a.invalid+a.outside+a.ambiguous);
  const metric=Object.keys(d.metrics).find(k=>d.metrics[k].source===source);
  assert.equal(d.rows.reduce((s,r)=>s+(r.metrics[metric]??0),0),a.assigned,'Conservación de registros: '+source);
}
assert.equal(selectTerritories(d).length,197);assert.equal(selectTerritories(d,{universe:'special'}).length,65);
assert.equal(selectTerritories(d,{query:'BK0101'})[0].name,'Greenpoint');
assert(selectTerritories(d,{borough:'Queens'}).every(r=>r.borough==='Queens'));
assert.equal(territorialPairs(d,'population','households').length,197);
assert.equal(territorialPairs(d,'population','buildingsSample').length,0,'Muestra parcial no entra a correlaciones generales');
assert.equal(territorialPairs(d,'population','income').length,195,'Excluir dos medianas censuradas');
const special=selectTerritories(d,{universe:'special'}),csv=territoriesCSV(d,special);
assert(csv.includes('not_applicable'));assert(!csv.includes('NaN'));assert(csv.includes('"","not_applicable"'),'Null se exporta vacío, no cero');
console.log(JSON.stringify({ok:true,ntas:262,residential:197,acsComplete:197,checks:['unión exacta ACS','null frente a cero','fronteras y agujeros','conservación espacial','cobertura Midtown','hashes de entradas','filtros y CSV']}));
