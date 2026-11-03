import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../data-sources/',import.meta.url);
const get=url=>JSON.parse(execFileSync('curl.exe',['-f','-sS','-L','--retry','2','--max-time','120',url],{encoding:'utf8',maxBuffer:120e6}));
const specifications=[
 {key:'urban-buildings',id:'5zhs-2jue',format:'geojson',where:'within_box(the_geom,40.775,-74.015,40.735,-73.965)',select:'the_geom,bin,height_roof,construction_year,feature_code,doitt_id',order:':id'},
 {key:'urban-energy',id:'5zyy-y8am',format:'json',where:'report_year=2023',select:'report_year,year_ending,property_id,parent_property_id,number_of_buildings,property_name,borough,latitude,longitude,site_eui_kbtu_ft,electricity_use_grid_purchase_1,property_gfa_self_reported',order:':id'}
];
const requested=process.argv.slice(2);
const manifest={retrieved:new Date().toISOString(),sources:requested.length?JSON.parse(readFileSync(new URL('urban-manifest.json',root))).sources.filter(s=>!requested.includes(s.key)):[]};
for(const s of specifications.filter(s=>!requested.length||requested.includes(s.key))){
 const base=`https://data.cityofnewyork.us/resource/${s.id}`;
 const count=()=>Number(get(base+'.json?'+new URLSearchParams({'$select':'count(*) as n','$where':s.where}))[0].n);
 const expected=count();let rows=[];const urls=[];
 for(let offset=0;offset<expected;offset+=10000){const url=base+'.'+s.format+'?'+new URLSearchParams({'$select':s.select,'$where':s.where,'$order':s.order,'$limit':10000,'$offset':offset});const page=get(url);rows.push(...(page.features||page));urls.push(url);}
 if(rows.length!==expected||count()!==expected)throw Error(s.key+': cambió el recuento durante la consulta');
 const raw=JSON.stringify(s.format==='geojson'?{type:'FeatureCollection',features:rows}:rows);
 writeFileSync(new URL(s.key+'.json',root),raw);
 const metadata=get(`https://data.cityofnewyork.us/api/views/${s.id}.json`);writeFileSync(new URL(s.key+'-metadata.json',root),JSON.stringify(metadata));
 manifest.sources.push({...s,rows:expected,urls,sha256:createHash('sha256').update(raw).digest('hex'),source:`https://data.cityofnewyork.us/d/${s.id}`,name:metadata.name,updated:metadata.rowsUpdatedAt});
 console.log(s.key,expected);
}
writeFileSync(new URL('urban-manifest.json',root),JSON.stringify(manifest,null,2));
