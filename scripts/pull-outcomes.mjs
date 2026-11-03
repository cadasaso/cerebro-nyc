import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),manifest={retrieved:new Date().toISOString(),queries:[]};
async function get(id,params){
 const url=`https://data.cityofnewyork.us/resource/${id}.json?`+new URLSearchParams({...params,'$limit':50000});
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetch(url,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error(await r.text());const rows=await r.json();if(rows.length===50000)throw Error('Resultado truncado');manifest.queries.push({id,url,rows:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')});return rows;}catch(e){if(attempt===2)throw e;}
 }
}
const cohort="created_date >= '2025-12-01T00:00:00' AND created_date < '2026-01-01T00:00:00'";
const jobs=[
 ['closureTotals','erm2-nwe9',{'$select':'borough,count(*) as total,count(closed_date) as with_closed_date','$where':cohort,'$group':'borough','$order':'borough'}],
 ['closureDays','erm2-nwe9',{'$select':'borough,date_trunc_ymd(created_date) as created_day,date_trunc_ymd(closed_date) as closed_day,count(*) as n','$where':cohort+" AND closed_date >= created_date AND closed_date < '2026-11-04T00:00:00'",'$group':'borough,created_day,closed_day','$order':'borough,created_day,closed_day'}],
 ['satisfaction','5ijn-vbdv',{'$select':'borough,overall_satisfaction,count(*) as n','$where':'year=2025','$group':'borough,overall_satisfaction','$order':'borough,overall_satisfaction'}],
 ['traffic','7ym2-wayt',{'$select':'requestid,segmentid,wktgeom,street,fromst,tost,direction,yr,m,d,hh,mm,vol','$where':"boro='Manhattan' AND yr=2025",'$order':'requestid,segmentid,yr,m,d,hh,mm,direction'}]
];
await Promise.all(jobs.map(async([key,id,p])=>{const rows=await get(id,p);writeFileSync(new URL(`data-sources/${key}-2025.json`,root),JSON.stringify(rows));console.log(key,rows.length);}));
writeFileSync(new URL('data-sources/outcomes-manifest.json',root),JSON.stringify(manifest,null,2));
