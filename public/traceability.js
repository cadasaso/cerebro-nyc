const byId=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const requiredFields=['ID de fuente','Fuente','Entidad','Vigencia','Probado','Estado','Método'];
let liveReport=null;

function showReport(data){
  byId('status').textContent=data.ok?'APROBADA':'REVISAR';
  byId('status').className=data.ok?'ok':'error';
  byId('clicks').textContent=data.clicksVerified;
  byId('ids').textContent=data.uniqueSourceIds.length;
  byId('tested').textContent=`Probada: ${data.testedAt} · ${data.mode||'Prueba funcional local de DOM'} · Campos obligatorios: ${data.requiredFields.join(', ')}.`;
  byId('rows').innerHTML=data.results.map(row=>`<tr><td>${row.click}</td><td>${esc(row.control)}<br>${esc(row.label)}</td><td><strong>${esc(row.sourceId)}</strong></td><td>${esc(row.source)}<br>${esc(row.agency)}</td><td>${esc(row.period)}</td><td>${esc(row.tested)}</td><td>${esc(row.status)}</td><td><a href="${esc(row.originalUrl)}" target="_blank" rel="noopener">Abrir ↗</a></td></tr>`).join('');
}

async function waitForApp(frame){
  const deadline=Date.now()+90000;
  while(Date.now()<deadline){
    const doc=frame.contentDocument;
    if(doc?.documentElement.dataset.ready==='true')return doc;
    if(doc?.querySelector('#app > .callout.warning'))throw new Error('La aplicación no pudo cargar sus datos.');
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('La aplicación no terminó de cargar en 90 segundos.');
}

byId('run-test').addEventListener('click',async()=>{
  const button=byId('run-test'),output=byId('live-result'),frame=byId('test-frame');
  button.disabled=true;
  byId('test-viewport').disabled=true;
  byId('download-test').disabled=true;
  liveReport=null;
  output.className='';
  output.textContent='Cargando la aplicación publicada…';
  frame.style.width=`${byId('test-viewport').value}px`;
  frame.hidden=false;
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('La página bajo prueba no respondió en 90 segundos.')),90000);
      frame.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});
      frame.src='/?traceability-check=1';
    });
    const doc=await waitForApp(frame),appWindow=frame.contentWindow;
    const controls=[...doc.querySelectorAll('button[data-metric],button[data-source]')];
    if(!controls.length)throw new Error('No se encontraron controles de trazabilidad.');
    const results=[],failures=[];
    for(const [index,control] of controls.entries()){
      const item={click:index+1,control:control.dataset.metric?'cifra':'fuente',label:(control.getAttribute('aria-label')||control.textContent).trim().replace(/\s+/g,' ').slice(0,180)};
      try{
        control.click();
        const dialog=doc.getElementById('source-dialog');
        if(!dialog?.open)throw new Error('No abrió el modal.');
        const fields=Object.fromEntries([...doc.querySelectorAll('#source-detail dt')].map(dt=>[dt.textContent.trim(),dt.nextElementSibling?.textContent.trim()||'']));
        for(const field of requiredFields)if(!fields[field])throw new Error(`Falta ${field}.`);
        if(!/F\d{2}/.test(fields['ID de fuente']))throw new Error('Falta ID Fxx.');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(fields.Probado))throw new Error('Fecha de prueba inválida.');
        const link=doc.querySelector('#source-detail a[href]');
        if(!link||new URL(link.href).protocol!=='https:')throw new Error('Falta enlace HTTPS original.');
        Object.assign(item,{sourceId:fields['ID de fuente'],source:fields.Fuente,agency:fields.Entidad,period:fields.Vigencia,tested:fields.Probado,status:fields.Estado,originalUrl:link.href});
        doc.querySelector('[data-close="source-dialog"]').click();
        if(dialog.open)throw new Error('El modal no cerró.');
        results.push(item);
      }catch(error){
        failures.push({...item,error:error.message});
        doc.getElementById('source-dialog')?.close();
      }
      output.textContent=`Comprobando control ${index+1} de ${controls.length}…`;
      if(index%10===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    const horizontalOverflow=doc.documentElement.scrollWidth>appWindow.innerWidth;
    liveReport={ok:failures.length===0&&!horizontalOverflow,testedAt:new Date().toISOString(),mode:'Navegador real: activación programática sobre la aplicación publicada',url:new URL(frame.src).origin+'/',viewport:{width:appWindow.innerWidth,height:appWindow.innerHeight},controlsFound:controls.length,clicksVerified:results.length,uniqueSourceIds:[...new Set(results.flatMap(row=>row.sourceId.match(/F\d{2}/g)||[]))].sort(),requiredFields:[...requiredFields,'Enlace HTTPS'],horizontalOverflow,failures,results};
    showReport(liveReport);
    output.className=liveReport.ok?'ok':'error';
    output.textContent=`${liveReport.ok?'APROBADA':'REVISAR'} · ${results.length}/${controls.length} controles · ${liveReport.uniqueSourceIds.length} IDs · ${failures.length} errores · vista ${appWindow.innerWidth} × ${appWindow.innerHeight} · desbordamiento horizontal: ${horizontalOverflow?'sí':'no'}.`;
    byId('download-test').disabled=false;
  }catch(error){output.className='error';output.textContent=error.message;}
  finally{button.disabled=false;byId('test-viewport').disabled=false;}
});

byId('download-test').addEventListener('click',()=>{
  if(!liveReport)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(liveReport,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=`cerebro-nyc-trazabilidad-${liveReport.viewport.width}px.json`;
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});

fetch('/data/traceabilityAudit.json').then(response=>{
  if(!response.ok)throw new Error('Sin resultado guardado.');
  return response.json();
}).then(showReport).catch(error=>{
  byId('status').textContent='NO DISPONIBLE';
  byId('status').className='error';
  byId('tested').textContent=error.message;
});
