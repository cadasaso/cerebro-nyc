"""Refresh the four workbook candidates; retain exact queries and raw snapshots."""
import json, pathlib, subprocess, hashlib, datetime, sys
import openpyxl
ROOT=pathlib.Path(__file__).resolve().parents[1]
sources=json.loads((ROOT/'data-sources/excel-sources.json').read_text(encoding='utf-8'))
day=datetime.datetime.now(datetime.timezone.utc).isoformat()
catalog=json.loads((ROOT/'public/data/catalog.json').read_text(encoding='utf-8'))
for fid,key,theme in [('F25','requestsAnnual','escucha'),('F31','ageSex','gente'),('F32','cultureFunding','cultura'),('F33','healthState','servicios')]:
    if len(sys.argv)>1 and fid not in sys.argv[1:]: continue
    source=next(s for s in sources if s['id']==fid)
    raw=ROOT/f'data-sources/{key}.raw'
    url=source['url']+('?download=1' if fid=='F31' else '')
    if '--cached' not in sys.argv:
        subprocess.run(['curl.exe' if sys.platform=='win32' else 'curl','-f','-sS','-L','-A','Mozilla/5.0','--retry','2','--max-time','110',url,'-o',str(raw)],check=True)
    content=raw.read_bytes()
    if fid=='F31':
        with raw.open('rb') as f:
            workbook=openpyxl.load_workbook(f,data_only=True)
            sheet=workbook['2020 Borough by sex age']
            records=[dict(borough=r[0],sex=r[1],age=r[2],population=int(r[3])) for r in sheet.values if r[1] in ('Female','Male') and isinstance(r[3],(int,float))]
        assert len(records)==220 and sum(r['population'] for r in records)==8804190
        data=records
    else:
        data=json.loads(content)
        assert isinstance(data,list) and 0<len(data)<(3000 if fid=='F25' else 5000), 'Empty or possibly truncated response'
    (ROOT/f'public/data/{key}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
    entry=dict(key=key,id=fid,name=source['name'],agency=source['agency'],theme=theme,period=source['period'],source=source['url'],url=source['url'],tested=day[:10],retrievedAt=day,sha256=hashlib.sha256(content).hexdigest(),status='integrado',rows=len(data) if isinstance(data,list) else len(data['rows']),method='Consulta del inventario Excel; instantánea local reproducible. Sin suma entre inventarios diferentes.')
    entry['url']=url
    if fid=='F33': entry['period']='Directorio consultado '+day[:10]
    catalog['datasets']=[s for s in catalog['datasets'] if s['key']!=key]+[entry]
    (ROOT/'public/data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
    print(fid,key,entry['rows'],flush=True)
