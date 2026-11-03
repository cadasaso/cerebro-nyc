import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync,renameSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const run=promisify(execFile);
const root=new URL('../',import.meta.url),dir=new URL('data-sources/',root),cache=new URL('nta-cache/',dir);
mkdirSync(cache,{recursive:true});
const host='https://factfinder-api.herokuapp.com';
const get=async url=>(await run(process.platform==='win32'?'curl.exe':'curl',['-f','-sS','-L','--retry','2','--max-time','60',url],{maxBuffer:12*1024*1024})).stdout;
const geographies=JSON.parse(await get(host+'/geo-options'));
const codes=JSON.parse(readFileSync(new URL('public/data/neighborhoods.json',root))).features.filter(f=>String(f.properties.ntatype)==='0').map(f=>f.properties.nta2020).sort();
for(const code of codes)if(!geographies.some(g=>g.geoid===code&&g.geotype==='NTA2020'))throw Error('NTA no reconocida por FactFinder: '+code);
// Verify the published period on every refresh; do not silently relabel a new release.
const pageURL='https://popfactfinder.planning.nyc.gov/';
const html=await get(pageURL);
const asset=html.match(/src="(\/assets\/labs-nyc-factfinder-[^"]+\.js)"/)?.[1];
if(!asset)throw Error('No se pudo verificar el período de FactFinder');
const app=await get(new URL(asset,pageURL).href);
if(!/id:"acs-current",label:"2020 - 2024"/.test(app))throw Error('Cambió el período ACS; revisar metadatos antes de actualizar');
const wanted=['pop','ochu2','hu1','mdhhinc','pbwpv','poppvu1','mdgr','mdvl'];
const rows=[];let cursor=0;
async function worker(){while(cursor<codes.length){const code=codes[cursor++],file=new URL(code+'.json',cache);let item;
  if(process.argv.includes('--resume')&&existsSync(file))item=JSON.parse(readFileSync(file));
  else {const url=host+'/survey/acs/ntas/'+code+'?compareTo=0',raw=await get(url),data=JSON.parse(raw);
    if(!Array.isArray(data)||wanted.some(v=>!data.some(r=>r.variable===v)))throw Error('Respuesta incompleta: '+code);
    item={code,period:'2020-2024',url,retrievedAt:new Date().toISOString(),responseSha256:createHash('sha256').update(raw).digest('hex'),variables:data.filter(r=>wanted.includes(r.variable)).map(r=>Object.fromEntries(['variable','base','category','survey','sum','marginOfError','percent','percentMarginOfError','isReliable','percentIsReliable','codingThreshold'].filter(k=>k in r).map(k=>[k,r[k]])))};
    writeFileSync(file,JSON.stringify(item));
  }
  if(item.code!==code||item.period!=='2020-2024')throw Error('Caché incompatible: '+code);
  rows.push(item);if(rows.length%20===0)console.log(`${rows.length}/${codes.length} NTA descargadas`);
}}
await Promise.all([worker(),worker()]);
const output={schemaVersion:1,source:'NYC DCP Population FactFinder / U.S. Census Bureau',period:'ACS 2020–2024',geography:'NTA2020',periodEvidence:{url:new URL(asset,pageURL).href,sha256:createHash('sha256').update(app).digest('hex'),verifiedAt:new Date().toISOString()},rows:rows.sort((a,b)=>a.code.localeCompare(b.code))};
writeFileSync(new URL('nta-demographics.json.tmp',dir),JSON.stringify(output,null,2));
renameSync(new URL('nta-demographics.json.tmp',dir),new URL('nta-demographics.json',dir));
console.log(`ACS integrado: ${rows.length} NTA residenciales. Instantánea publicada completa.`);
