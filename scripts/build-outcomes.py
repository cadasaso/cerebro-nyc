"""Build supplemental aggregates. Requires pyproj==3.8.0 (EPSG:2263 -> 4326)."""
import json, math, re, statistics
from pathlib import Path
from collections import defaultdict
from datetime import date
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
def read(name): return json.loads((ROOT / name).read_text(encoding='utf-8'))
manifest = read('data-sources/outcomes-manifest.json')
boroughs = ['BRONX', 'BROOKLYN', 'MANHATTAN', 'QUEENS', 'STATEN ISLAND']
pairs = read('data-sources/closureDays-2025.json')
totals = read('data-sources/closureTotals-2025.json')
sat = read('data-sources/satisfaction-2025.json')
service = []
for b in boroughs:
    t = next(t for t in totals if t['borough'] == b)
    ds = [(date.fromisoformat(r['closed_day'][:10])-date.fromisoformat(r['created_day'][:10]), int(r['n'])) for r in pairs if r.get('borough') == b]
    ds = sorted((d.days, n) for d, n in ds)
    n = sum(n for d,n in ds)
    def kth(k):
        cumulative = 0
        for d, count in ds:
            cumulative += count
            if cumulative > k: return d
    ratings = {r['overall_satisfaction']:int(r['n']) for r in sat if r.get('borough') == b}
    recognized = ['Agree','Strongly Agree','Neutral','Disagree','Strongly Disagree']
    valid = sum(ratings.get(k,0) for k in recognized)
    positive = sum(ratings.get(k,0) for k in ['Agree','Strongly Agree'])
    service.append(dict(borough=b,total=int(t['total']),validClosed=n,missingClosed=int(t['total'])-int(t['with_closed_date']),excludedClosed=int(t['with_closed_date'])-n,meanDays=sum(d*c for d,c in ds)/n if n else None,medianDays=(kth((n-1)//2)+kth(n//2))/2 if n else None,surveyResponses=sum(ratings.values()),surveyValid=valid,surveyPositive=positive,agreementPct=100*positive/valid if valid else None,ratings=ratings))
data = dict(retrieved=manifest['retrieved'],closurePeriod='Solicitudes creadas en diciembre de 2025; cierres registrados antes del 4 de noviembre de 2026',surveyPeriod='Respuestas de 2025 (cohorte distinta)',rows=service,audit=dict(totalRequests=sum(int(t['total']) for t in totals),unknownBoroughRequests=sum(int(t['total']) for t in totals if t.get('borough') not in boroughs),unknownBoroughSurveys=sum(int(t['n']) for t in sat if t.get('borough') not in boroughs)),sources=[dict(id='F34',url='https://data.cityofnewyork.us/d/erm2-nwe9'),dict(id='F35',url='https://data.cityofnewyork.us/d/5ijn-vbdv')])
(ROOT/'public/data/serviceOutcomes.json').write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')

traffic = read('data-sources/traffic-2025.json') + read('data-sources/traffic-2024.json') + read('data-sources/traffic-2023.json')
transformer = Transformer.from_crs('EPSG:2263','EPSG:4326',always_xy=True)
extent = [-74.002,40.741,-73.971,40.771]
groups = defaultdict(dict)
audit = dict(input=len(traffic),invalid=0,duplicates=0,conflicts=0,outside=0,incompleteHours=0,completeHours=0)
conflicts = set()
for r in traffic:
    p = re.fullmatch(r'POINT\s*\(([-\d.]+)\s+([-\d.]+)\)', r.get('wktgeom',''))
    try:
        x,y = transformer.transform(*map(float,p.groups()))
        volume = float(r['vol']); minute=int(r['mm']); hour=int(r['hh']); day=date(int(r['yr']),int(r['m']),int(r['d'])).isoformat()
        assert math.isfinite(volume) and volume >= 0 and minute in (0,15,30,45) and 0 <= hour < 24
    except (AttributeError,ValueError,AssertionError,KeyError): audit['invalid']+=1; continue
    w,s,e,n=extent
    if not(w<=x<e and s<=y<n): audit['outside']+=1; continue
    cell=math.floor((y-s)/(n-s)*3)*3+math.floor((x-w)/(e-w)*3)
    key=(cell,r['segmentid'],r['direction'],r['wktgeom'],day,hour)
    if minute in groups[key]:
        audit['duplicates']+=1
        if groups[key][minute]!=volume: conflicts.add(key);audit['conflicts']+=1
    groups[key][minute]=volume
rows=[]
for cell in range(9):
    eligible=[(k,sum(v.values())) for k,v in groups.items() if k[0]==cell and len(v)==4 and k not in conflicts]
    partial=[k for k,v in groups.items() if k[0]==cell and (len(v)!=4 or k in conflicts)]
    audit['incompleteHours']+=len(partial);audit['completeHours']+=len(eligible)
    values=[v for k,v in eligible]
    days=sorted({k[4] for k,v in eligible})
    rows.append(dict(cell='M'+str(cell+1),segments=len({k[1] for k,v in eligible}),directions=len({(k[1],k[2],k[3]) for k,v in eligible}),observedDays=len(days),firstDay=days[0] if days else None,lastDay=days[-1] if days else None,completeHours=len(values),excludedHours=len(partial),meanVehiclesPerObservedHour=statistics.mean(values) if values else None,medianVehiclesPerObservedHour=statistics.median(values) if values else None))
output=dict(retrieved=manifest['retrieved'],period='Aforos 2023–2025; consultar fechas y cobertura por celda en la descarga',source='https://data.cityofnewyork.us/d/7ym2-wayt',id='F36',crs='Coordenadas WKT interpretadas como NAD83 / New York Long Island (ftUS), EPSG:2263; transformación con pyproj 3.8.0. Asignación espacial exploratoria.',extent=extent,rows=rows,audit=audit)
(ROOT/'public/data/trafficCounts.json').write_text(json.dumps(output,ensure_ascii=False),encoding='utf-8')
print(json.dumps(dict(serviceRows=len(service),traffic=rows,audit=audit),ensure_ascii=False))
