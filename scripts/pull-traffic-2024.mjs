import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const year=Number(process.argv[2]||2024);if(![2023,2024].includes(year))throw Error('Año no admitido');
const root=new URL('../',import.meta.url),p={'$select':'requestid,segmentid,wktgeom,street,fromst,tost,direction,yr,m,d,hh,mm,vol','$where':`boro='Manhattan' AND yr=${year}`,'$order':'requestid,segmentid,yr,m,d,hh,mm,direction','$limit':50000};
const url='https://data.cityofnewyork.us/resource/7ym2-wayt.json?'+new URLSearchParams(p);
const response=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error(await response.text());
const rows=await response.json();if(rows.length===50000)throw Error('Truncado');
writeFileSync(new URL(`data-sources/traffic-${year}.json`,root),JSON.stringify(rows));
const file=new URL('data-sources/outcomes-manifest.json',root),m=JSON.parse(readFileSync(file));m.queries=m.queries.filter(q=>!q.url.includes('yr%3D'+year));m.queries.push({id:'7ym2-wayt',url,rows:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')});writeFileSync(file,JSON.stringify(m,null,2));console.log(rows.length);
