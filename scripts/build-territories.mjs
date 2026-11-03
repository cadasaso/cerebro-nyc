import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {locator,aggregatePoints,representative,areaKm2,bbox,intersects,acsCell,number} from './territorial-lib.mjs';
const root=new URL('../',import.meta.url),dir=new URL('public/data/',root),inputs={};
function read(key){const raw=readFileSync(new URL(key+'.json',dir));inputs[key]={sha256:createHash('sha256').update(raw).digest('hex')};return JSON.parse(raw);}
const geography=read('neighborhoods'),catalog=JSON.parse(readFileSync(new URL('catalog.json',dir)));
const acsRaw=readFileSync(new URL('data-sources/nta-demographics.json',root)),acs=JSON.parse(acsRaw);
if(acs.geography!=='NTA2020'||acs.period!=='ACS 2020–2024')throw Error('Geografía o período ACS incompatible');
inputs.ntaDemographics={sha256:createHash('sha256').update(acsRaw).digest('hex')};
const acsMap=new Map(acs.rows.map(r=>[r.code,r]));
if(acsMap.size!==acs.rows.length)throw Error('Códigos ACS duplicados');
const expected=new Set(geography.features.filter(f=>String(f.properties.ntatype)==='0').map(f=>f.properties.nta2020));
if(expected.size!==acsMap.size||[...expected].some(k=>!acsMap.has(k)))throw Error('El cruce ACS debe cubrir exactamente las NTA residenciales');
const types={'0':'Residencial','5':'Rikers Island','6':'Área especial','7':'Cementerio','8':'Aeropuerto','9':'Parque'};
const metrics={
  population:{label:'Población estimada',unit:'personas',source:'ntaDemographics',variable:'pop'},
  households:{label:'Hogares / viviendas ocupadas',unit:'hogares',source:'ntaDemographics',variable:'ochu2'},
  housingUnits:{label:'Unidades de vivienda',unit:'viviendas',source:'ntaDemographics',variable:'hu1'},
  income:{label:'Ingreso mediano del hogar',unit:'US$/año',source:'ntaDemographics',variable:'mdhhinc'},
  poverty:{label:'Población bajo el umbral de pobreza',unit:'%',source:'ntaDemographics',variable:'pbwpv',percent:true},
  rent:{label:'Alquiler bruto mediano',unit:'US$/mes',source:'ntaDemographics',variable:'mdgr'},
  homeValue:{label:'Valor mediano de vivienda en propiedad',unit:'US$',source:'ntaDemographics',variable:'mdvl'},
  subway:{label:'Registros de estaciones MTA',unit:'registros',source:'subway'},
  health:{label:'Centros de la red H+H',unit:'registros',source:'health'},
  culture:{label:'Organizaciones DCLA geolocalizadas',unit:'registros',source:'culture'},
  energyRecords:{label:'Registros energéticos LL84 geolocalizados',unit:'registros',source:'energy'},
  buildingsSample:{label:'Huellas de edificios del recorte Midtown',unit:'huellas de la muestra',source:'buildings'},
  parkRecords:{label:'Propiedades Parks por punto representativo',unit:'registros',source:'parks'}
};
const sources={ntaDemographics:{name:acs.source,source:'https://popfactfinder.planning.nyc.gov/',period:acs.period,method:'Cruce exacto NTA2020; estimaciones publicadas por DCP, incluidas medianas calculadas por DCP. Sin promediar medianas de tracts ni repartir cifras del borough.',periodEvidence:acs.periodEvidence},
  neighborhoods:catalog.datasets.find(s=>s.key==='neighborhoods')};
for(const m of Object.values(metrics)){if(!sources[m.source]){const s=catalog.datasets.find(s=>s.key===m.source);if(!s||!['integrado','copia previa'].includes(s.status))throw Error('Fuente no disponible: '+m.source);sources[m.source]={name:s.name,source:s.source,url:s.url,period:s.period,tested:s.tested,status:s.status};}m.period=sources[m.source].period;}
sources.energy.period='report_year=2023; período de consumo no validado';metrics.energyRecords.period=sources.energy.period;
const rows=geography.features.map(f=>{const p=f.properties,id=p.nta2020,residential=String(p.ntatype)==='0',a=acsMap.get(id);
  const row={id,name:p.ntaname,borough:p.boroname,type:String(p.ntatype),typeLabel:types[p.ntatype]||'No clasificada',residential,areaKm2:areaKm2(f),metrics:{},quality:{},demographicSource:a?{url:a.url,retrievedAt:a.retrievedAt,responseSha256:a.responseSha256}:null};
  for(const [key,m] of Object.entries(metrics)){
    if(m.variable){const cell=residential?acsCell(a.variables.find(v=>v.variable===m.variable),m.percent):{value:null,status:'not_applicable',marginOfError:null,reason:'Área especial fuera del universo residencial ACS de esta tabla'};row.metrics[key]=cell.value;row.quality[key]=cell;}
    else {row.metrics[key]=0;row.quality[key]={status:'derived',reason:'Conteo de registros del archivo asignados a esta NTA; no inventario exhaustivo'};}
  }
  // Preserve explicit gaps instead of downscaling borough-level totals.
  for(const key of ['allCrashes','crime','requests311','trees','companies']){row.metrics[key]=null;row.quality[key]={status:'missing',reason:'La fuente local solo tiene agregados por borough; no se distribuye entre NTA'};}
  return row;
}).sort((a,b)=>a.id.localeCompare(b.id));
if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('NTA duplicadas');
const byId=new Map(rows.map(r=>[r.id,r])),locate=locator(geography.features),audit={};
const coords=r=>[number(r.longitude),number(r.latitude)];
const definitions=[['subway','subway',r=>[number(r.gtfs_longitude),number(r.gtfs_latitude)]],['health','health',r=>r.location_1?.coordinates],['culture','culture',coords],['energy','energyRecords',coords],['buildings','buildingsSample',representative],['parks','parkRecords',representative]];
for(const [source,key,point] of definitions){const d=read(source),records=d.features||d;
  audit[source]=aggregatePoints(records,point,locate,(id)=>byId.get(id).metrics[key]++);
  if(source==='buildings'){
    // The source query is spatially clipped AND capped: never call a zero outside it an absence of buildings.
    const clip=[-74.015,40.735,-73.965,40.775];
    for(const f of geography.features){const row=byId.get(f.properties.nta2020),covered=intersects(bbox(f),clip);
      if(!covered&&row.metrics[key]!==0)throw Error('Edificio fuera del recorte declarado');
      if(!covered)row.metrics[key]=null;
      row.quality[key]={status:covered?'partial':'outside_coverage',reason:covered?'Muestra de hasta 10.000 huellas de Midtown; no total NTA ni cobertura completa':'NTA fuera del recorte Midtown'};
    }
  }
}
for(const [key,m] of Object.entries(metrics))if(!m.variable&&key!=='buildingsSample')m.method='Asignación espacial única al polígono NTA. Casos inválidos, fuera de límites o ambiguos se excluyen y se reportan en auditoría. Cero significa ningún registro asignado, no ausencia del servicio.';
metrics.parkRecords.method+=' Una propiedad que cruza NTA se asigna por un punto representativo, sin calcular cobertura verde.';
metrics.buildingsSample.method='Punto representativo de cada huella; muestra limitada de Midtown, nunca extrapolada.';
for(const row of rows)for(const [key,q] of Object.entries(row.quality))q.comparable=row.residential&&row.metrics[key]!==null&&['estimated','derived'].includes(q.status);
const output={schemaVersion:1,generatedAt:new Date().toISOString(),unit:{key:'NTA2020',name:'Áreas estadísticas NTA 2020',residentialCount:expected.size,specialCount:rows.length-expected.size,total:rows.length,defaultUniverse:'residential',typeReference:'https://storymaps.arcgis.com/stories/d30850ba28944619b94e8ee4f746d5c4'},
  method:{join:'Código exacto para ACS; punto en polígono para registros geográficos. Polígonos locales simplificados: tolerancia 0,000025 grados.',nulls:'null = no disponible/no aplicable/fuera de cobertura; jamás sustituir por cero.',area:'Área geodésica aproximada del polígono, no superficie terrestre censal.',time:'Cada métrica conserva su período; no hay un año único común.',comparison:'Por defecto solo NTA residenciales. quality.comparable excluye valores censurados, poco fiables y muestras parciales. No sumar medianas ni atribuir promedios del borough a NTA.',privacy:'La tabla derivada no incluye coordenadas individuales, nombres de instalaciones, identificadores de colisiones ni fechas de eventos.'},inputs,sources,metrics,audit,rows};
writeFileSync(new URL('territories.json.tmp',dir),JSON.stringify(output,null,2));renameSync(new URL('territories.json.tmp',dir),new URL('territories.json',dir));
const entry={key:'territories',name:'Base territorial integrada NTA 2020',agency:'NYC DCP / Census / MTA / agencias NYC',theme:'geo',period:'ACS 2020–2024 y cortes específicos por indicador',source:'https://popfactfinder.planning.nyc.gov/',status:'integrado',tested:output.generatedAt.slice(0,10),rows:rows.length,method:'Derivado reproducible: scripts/build-territories.mjs. 197 NTA residenciales y 65 especiales separadas; códigos, fuentes, márgenes de error, cobertura y auditoría espacial.',note:'Los indicadores sin cobertura NTA permanecen nulos. Los edificios son una muestra de Midtown.'};
catalog.datasets=catalog.datasets.filter(s=>s.key!=='territories').concat(entry);
writeFileSync(new URL('catalog.json.tmp',dir),JSON.stringify(catalog,null,2));renameSync(new URL('catalog.json.tmp',dir),new URL('catalog.json',dir));
console.log(JSON.stringify({rows:rows.length,residential:expected.size,audit},null,2));
