export function normalize(value, values) {
  const valid=values.filter(Number.isFinite);
  const lo=Math.min(...valid),hi=Math.max(...valid);
  return !Number.isFinite(value)||!valid.length?null:hi===lo?50:(value-lo)/(hi-lo)*100;
}
export function ranks(values) {
  const sorted=[...values].sort((a,b)=>a-b);
  return values.map(v=>(sorted.indexOf(v)+sorted.lastIndexOf(v))/2+1);
}
export function correlation(xs,ys,method='pearson') {
  const pairs=xs.map((x,i)=>[x,ys[i]]).filter(p=>p.every(Number.isFinite));
  if(pairs.length<3)return null;
  let x=pairs.map(p=>p[0]),y=pairs.map(p=>p[1]);
  if(method==='spearman'){x=ranks(x);y=ranks(y);}
  const mx=x.reduce((a,b)=>a+b,0)/x.length,my=y.reduce((a,b)=>a+b,0)/y.length;
  let numerator=0,dx=0,dy=0;
  x.forEach((v,i)=>{numerator+=(v-mx)*(y[i]-my);dx+=(v-mx)**2;dy+=(y[i]-my)**2;});
  return dx&&dy?numerator/Math.sqrt(dx*dy):null;
}
export const sum=(items,key)=>items.reduce((n,x)=>n+(Number(x[key])||0),0);
export function median(items){const s=items.filter(Number.isFinite).sort((a,b)=>a-b);if(!s.length)return null;const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;}
