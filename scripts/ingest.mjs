import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';

const dir = new URL('../public/data/', import.meta.url);
mkdirSync(dir, { recursive: true });
const catalog = [];
const previousCatalog = existsSync(new URL('catalog.json',dir)) ? JSON.parse(readFileSync(new URL('catalog.json',dir))).datasets : [];
// Keep independently refreshed workbook snapshots and their original retrieval dates.
catalog.push(...previousCatalog.filter(s=>['requestsAnnual','ageSex','cultureFunding','healthState','sourceUsage','urbanDiagnostic','urbanBuildings','urbanEnergy'].includes(s.key)));
const day = new Date().toISOString().slice(0, 10);
const requested = process.argv.slice(2);
const yearFilter = (key, year) => `${key} >= '${year}-01-01T00:00:00' AND ${key} < '${year + 1}-01-01T00:00:00'`;
const definitions = [
  ['boroughs','gthc-hcne','Limites de boroughs','NYC DCP','geo','2026',{},'geojson'],
  ['neighborhoods','9nt8-h7nd','Areas estadisticas NTA 2020','NYC DCP','geo','geografia 2020',{ '$limit': 500 },'geojson'],
  ['buildings','5zhs-2jue','Huellas y alturas de edificios','NYC OTI','edificios','corte consultado',{
    '$select':'the_geom,bin,height_roof,construction_year,shape_area',
    '$where':"within_box(the_geom,40.775,-74.015,40.735,-73.965)", '$limit':10000
  },'geojson'],
  ['crashes','h9gi-nx95','Colisiones por borough y mes','NYPD','seguridad','2025',{
    '$select':'borough,date_extract_m(crash_date) as month,count(*) as count,sum(number_of_persons_injured) as injured,sum(number_of_persons_killed) as killed',
    '$where':yearFilter('crash_date',2025),'$group':'borough,month','$limit':200
  }],
  ['requests','erm2-nwe9','Solicitudes 311 por tema y borough','NYC 311','escucha','diciembre 2025',{
    '$select':'borough,complaint_type,count(*) as count','$where':"created_date >= '2025-12-01T00:00:00' AND created_date < '2026-01-01T00:00:00'",'$group':'borough,complaint_type','$limit':3000
  }],
  ['requestMonths','erm2-nwe9','Solicitudes 311 por mes','NYC 311','municipio','2025',{
    '$select':'date_extract_m(created_date) as month,count(*) as count','$where':yearFilter('created_date',2025),'$group':'month','$limit':12
  }],
  ['trees','uvpi-gqnh','Censo de arbolado urbano','NYC Parks','ambiente','2015',{
    '$select':'boroname,health,status,count(*) as count','$group':'boroname,health,status','$limit':100
  }],
  ['restaurants','43nn-pn8j','Establecimientos con inspecciones sanitarias','NYC DOHMH','turismo','corte consultado',{
    '$select':'boro,count(distinct camis) as count','$group':'boro','$limit':10
  }],
  ['crime','qgea-i56i','Denuncias registradas por tipo y borough','NYPD','seguridad','2024',{
    '$select':'boro_nm,ofns_desc,count(*) as count','$where':yearFilter('cmplnt_fr_dt',2024),'$group':'boro_nm,ofns_desc','$limit':1000
  }],
  ['subway','39hk-dx4f','Estaciones de metro y Staten Island Railway','MTA','movilidad','corte consultado',{'$limit':1000},'json','data.ny.gov'],
  ['parks','enfh-gkve','Propiedades administradas por Parks','NYC Parks','ambiente','corte consultado',{'$limit':5000},'geojson'],
  ['culture','u35m-9t32','Organizaciones culturales','NYC DCLA','cultura','corte consultado',{'$limit':5000}],
  ['health','q6fj-vxf8','Centros de NYC Health + Hospitals','NYC H+H','servicios','corte consultado',{'$limit':500}],
  ['energy','5zyy-y8am','Consumo energetico declarado LL84','NYC DOB','infraestructura','2023',{
    '$select':'property_id,property_name,borough,latitude,longitude,site_eui_kbtu_ft,electricity_use_grid_purchase_1,property_gfa_self_reported',
    '$where':'report_year=2023', '$limit':50000
  }]
];
for (const [key,id,name,agency,theme,period,params,format='json',host='data.cityofnewyork.us'] of definitions) {
  const url = `https://${host}/resource/${id}.${format}?${new URLSearchParams(params)}`;
  const file = new URL(`${key}.json`,dir);
  const entry = {key,id,name,agency,theme,period,url,source:`https://${host}/d/${id}`,tested:day,method:'Consulta SODA reproducible; sin datos personales',status:'integrado'};
  if(requested.length && !requested.includes(key)) {
    const previous = previousCatalog.find(x=>x.key===key);
    if(previous) catalog.push(previous);
    else if(existsSync(file)) {const j=JSON.parse(readFileSync(file));entry.rows=j.features?.length??j.length;catalog.push(entry);}
    continue;
  }
  try {
    const raw=execFileSync('curl',['-f','-sS','-L','--max-time','110',url],{encoding:'utf8',maxBuffer:50*1024*1024});
    const data=JSON.parse(raw);
    if(data.error || (!Array.isArray(data) && data.type!=='FeatureCollection')) throw new Error(data.message || 'Respuesta sin registros');
    entry.rows=data.features?.length??data.length;
    if(!entry.rows) throw new Error('Consulta sin filas');
    writeFileSync(file,JSON.stringify(data));
    console.log(`${key}: ${entry.rows} filas`);
  } catch(e) {
    entry.status='no disponible';entry.note=e.message.slice(0,180);
    if(existsSync(file)) {entry.status='copia previa';entry.note='Se conserva el ultimo corte verificado; la nueva consulta no respondio.';}
    console.log(`${key}: ${entry.status}`);
  }
  catalog.push(entry);
  writeFileSync(new URL('catalog.json',dir),JSON.stringify({tested:day,datasets:catalog},null,2));
}
writeFileSync(new URL('catalog.json',dir),JSON.stringify({tested:day,datasets:catalog},null,2));
