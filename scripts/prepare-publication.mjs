import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../dist/data/',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root))),write=(p,d)=>writeFileSync(new URL(p,root),JSON.stringify(d));
const namesOnly=rows=>rows.map(({organization_name,borough})=>({organization_name,borough}));
write('culture.json',namesOnly(read('culture.json')));
const catalog=read('catalog.json');catalog.datasets.find(s=>s.key==='culture').note='Directorio cultural: nombres y borough. Se omiten direcciones y coordenadas puntuales en la publicación. Los conteos agregados se conservan.';write('catalog.json',catalog);
// Public source index: only identifiers, dataset names and public source links.
// No workbook names, local evidence paths or detailed project usage metadata.
const usage=read('sourceUsage.json');const rows=usage.rows.map(({id,key,name,url})=>({id,key,name,url:url?.startsWith('https://')?url:'https://github.com/cadasaso/cerebro-nyc/blob/main/public/data/catalog.json',use:'Fuente pública; consultar su ficha en el catálogo.',status:'Ver ficha de fuente',limit:'La vigencia, el método y la cobertura se conservan en la ficha.'}));
write('sourceUsage.json',{rows});
if(rows.length!==30||rows.some(r=>!r.url.startsWith('https://')))throw Error('Índice público inválido');
console.log('Publicación: directorio cultural minimizado e índice con 30 referencias públicas.');
