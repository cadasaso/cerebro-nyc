import { execFileSync } from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const dir=new URL('../public/data/',import.meta.url),tested=new Date().toISOString().slice(0,10);
const catalog=JSON.parse(readFileSync(new URL('catalog.json',dir)));
const pull=url=>execFileSync('curl',['-fsSL','--max-time','35','-A','CerebroNYC-AcademicDashboard/1.0',url],{encoding:'utf8',maxBuffer:10*1024*1024});
function saveSource(s,data){
  catalog.datasets=catalog.datasets.filter(x=>x.key!==s.key);
  catalog.datasets.push({...s,tested,status:data?'integrado':'no disponible'});
  if(data)writeFileSync(new URL(s.key+'.json',dir),JSON.stringify(data));
  writeFileSync(new URL('catalog.json',dir),JSON.stringify(catalog,null,2));
}
const wiki={key:'wikipedia',name:'Atencion a boroughs y lugares en Wikipedia',agency:'Wikimedia Foundation',theme:'escucha',period:'septiembre 2025 - agosto 2026',source:'https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html',method:'Pageviews mensuales, en.wikipedia, user, all-access. Conteos de vistas, no de personas ni opinion. Articulos no disponibles se omiten.',queries:[]};
const articles=['New_York_City','Manhattan','Brooklyn','Queens','The_Bronx','Staten_Island','Central_Park','Empire_State_Building','Statue_of_Liberty'];
const pages=[];
for(const article of articles){try{const url=`https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/${article}/monthly/2025090100/2026083100`;const result=JSON.parse(pull(url));if(result.items?.length){pages.push({article,items:result.items.map(x=>({month:x.timestamp.slice(0,6),views:x.views}))});wiki.queries.push(url);saveSource(wiki,pages);console.log('Wikipedia: '+article);}}catch{console.log('Wikipedia no disponible: '+article);if(!pages.length)break;}}
saveSource(wiki,pages.length?pages:null);
const climateUrl='https://archive-api.open-meteo.com/v1/archive?latitude=40.758&longitude=-73.9855&start_date=2015-01-01&end_date=2025-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America%2FNew_York';
const climate={key:'climate',name:'Serie de clima de Manhattan',agency:'Open-Meteo / reanalisis',theme:'ambiente',period:'2015-2025',source:'https://open-meteo.com/en/docs/historical-weather-api',url:climateUrl,method:'Medias anuales de maximas y minimas diarias; suma de precipitacion. Reanalisis, no medicion de estacion.'};
try{const d=JSON.parse(pull(climateUrl)).daily,out=[];for(let year=2015;year<=2025;year++){const ids=d.time.map((t,i)=>t.startsWith(String(year))?i:-1).filter(i=>i>=0);const mean=k=>{const vals=ids.map(i=>d[k][i]).filter(Number.isFinite);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;};const rainVals=ids.map(i=>d.precipitation_sum[i]).filter(Number.isFinite);out.push({year,max:mean('temperature_2m_max'),min:mean('temperature_2m_min'),rain:rainVals.length?rainVals.reduce((a,b)=>a+b,0):null});}saveSource(climate,out);console.log('Clima: '+out.length+' años');}catch{saveSource(climate,null);}
const newsUrl='https://news.google.com/rss/search?q=%22New%20York%20City%22%20after%3A2026-08-23%20before%3A2026-09-24&hl=en-US&gl=US&ceid=US%3Aen';
const news={key:'news',name:'Titulares sobre Nueva York',agency:'Google News RSS / medios originales',theme:'escucha',period:'23 agosto - 23 septiembre 2026',source:newsUrl,url:newsUrl,method:'Titulares y enlaces RSS; no se almacena el cuerpo de articulos. Muestra del agregador, no toda la prensa. Categorias por palabras clave, no analisis de sentimiento.'};
try{const doc=new JSDOM(pull(newsUrl),{contentType:'text/xml'}).window.document;const items=[...doc.querySelectorAll('item')].slice(0,40).map(n=>({title:n.querySelector('title')?.textContent,link:n.querySelector('link')?.textContent,date:n.querySelector('pubDate')?.textContent,source:n.querySelector('source')?.textContent})).filter(x=>x.title&&/^https:\/\//.test(x.link));saveSource(news,items.length?items:null);console.log('Prensa: '+items.length+' titulares');}catch{saveSource(news,null);}
