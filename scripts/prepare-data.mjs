import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { simplify } from '@turf/simplify';
const dir=new URL('../public/data/',import.meta.url);
const read=key=>JSON.parse(readFileSync(new URL(`${key}.json`,dir)));
const write=(key,data)=>writeFileSync(new URL(`${key}.json`,dir),JSON.stringify(data));
const fields={
  boroughs:['borocode','boroname'],neighborhoods:['ntaname','nta2020','boroname','ntatype','cdtaname'],
  buildings:['bin','height_roof','construction_year'],parks:['borough','acres','signname','name311','typecategory']
};
// Simplification preserves source geometry while limiting mobile transfer cost.
for(const key of Object.keys(fields)){
  let data=read(key);
  if(key!=='buildings')data=simplify(data,{tolerance:.000025,highQuality:true,mutate:true});
  const round=a=>typeof a[0]==='number'?a.map(n=>+n.toFixed(6)):a.map(round);
  for(const f of data.features){f.geometry.coordinates=round(f.geometry.coordinates);f.properties=Object.fromEntries(fields[key].map(k=>[k,f.properties[k]]));}
  write(key,data);
}
for(const [key,keys] of [
  ['culture',['organization_name','address','borough','latitude','longitude']],
  ['health',['facility_name','facility_type','borough','location_1']],
  ['subway',['stop_name','borough','gtfs_latitude','gtfs_longitude','daytime_routes','ada']]
]){write(key,read(key).map(r=>Object.fromEntries(keys.map(k=>[k,r[k]]))));}
const geoKeys=Object.keys(fields);
const compact={};
for(const key of geoKeys){const data=read(key);compact[key]={type:'FeatureCollection',features:data.features.map(f=>({type:'Feature',properties:f.properties}))};}
write('dashboard',compact);
const catalog=read('catalog');
for(const source of catalog.datasets){
  if(geoKeys.includes(source.key))source.method+=' Geometria simplificada a tolerancia 0,000025 grados (excepto edificios), coordenadas a seis decimales.';
  if(['culture','health','subway'].includes(source.key))source.method+=' Solo atributos necesarios; se omiten telefonos.';
  if(source.key==='requests')source.note='La consulta anual por tema excedio el tiempo de respuesta; este corte es solo diciembre de 2025.';
}
write('catalog',catalog);
console.log('Geometria optimizada; resumen ligero preparado.');
