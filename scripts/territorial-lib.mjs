import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
import {pointOnFeature} from '@turf/point-on-feature';
import {area} from '@turf/area';

export const number=value=>value===null||value===undefined||String(value).trim()===''?null:Number.isFinite(Number(value))?Number(value):null;
export function bbox(feature){const box=[Infinity,Infinity,-Infinity,-Infinity];function walk(a){if(typeof a[0]==='number'){box[0]=Math.min(box[0],a[0]);box[1]=Math.min(box[1],a[1]);box[2]=Math.max(box[2],a[0]);box[3]=Math.max(box[3],a[1]);}else a.forEach(walk);}walk(feature.geometry.coordinates);return box;}
export const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
export const representative=feature=>pointOnFeature(feature).geometry.coordinates;
export const areaKm2=feature=>area(feature)/1e6;
export function locator(features){const indexed=features.map(f=>({f,box:bbox(f)}));return coordinates=>{
  if(!Array.isArray(coordinates)||coordinates.length!==2||coordinates.some(v=>number(v)===null))return {status:'invalid'};
  const p=coordinates.map(Number);if(p[0]<-75||p[0]>-73||p[1]<40||p[1]>42)return {status:'invalid'};
  const candidates=indexed.filter(({box})=>p[0]>=box[0]&&p[0]<=box[2]&&p[1]>=box[1]&&p[1]<=box[3]);
  const hits=candidates.filter(({f})=>booleanPointInPolygon(p,f));
  if(hits.length===1)return {status:'assigned',code:hits[0].f.properties.nta2020};
  // Shared boundaries / overlapping simplified polygons are not assigned arbitrarily.
  return {status:hits.length?'ambiguous':'outside'};
};}
export function aggregatePoints(records,getPoint,locate,onAssign){
  const audit={input:records.length,assigned:0,invalid:0,outside:0,ambiguous:0};
  for(const record of records){const result=locate(getPoint(record));audit[result.status]++;if(result.status==='assigned')onAssign(result.code,record);}
  return audit;
}
export function acsCell(variable,percent=false){
  const value=number(variable?.[percent?'percent':'sum']);
  if(value===null||value<0)return {value:null,marginOfError:null,status:'missing',reason:'Estimación no disponible'};
  const rawMoe=number(variable?.[percent?'percentMarginOfError':'marginOfError']);
  const capped=Boolean(variable.codingThreshold),reliable=variable[percent?'percentIsReliable':'isReliable'];
  return {value:value*(percent?100:1),marginOfError:rawMoe!==null&&rawMoe>=0?rawMoe*(percent?100:1):null,
    status:capped?'censored':reliable===false?'low_reliability':'estimated',
    reliable:typeof reliable==='boolean'?reliable:null,codingThreshold:variable.codingThreshold??null,
    reason:capped?'Valor limitado por umbral de publicación; no usar como mediana exacta':reliable===false?'Fiabilidad baja según FactFinder':'Estimación ACS; conservar margen de error'};
}
