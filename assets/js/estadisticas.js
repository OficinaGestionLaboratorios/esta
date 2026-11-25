/* Estadísticas de relación · Ubicación / REG / NRC. Usa D (horarios) y A (matriz de ambientes) que arma datos.js */
const $=s=>document.querySelector(s),esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DN=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],hm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const nf=n=>n.toLocaleString('es-PE'),d1=n=>n.toLocaleString('es-PE',{maximumFractionDigits:1});
const SIN='(Sin ubicación)';
let modo='pabe',prog='',orden='reg',q='',filas=[];

/* NRC únicos por ubicación → {k, sub, nrcs: Map(nrc → {datos, bloques[]})} */
function agrupar(){
  const G=new Map();
  const add=(k,sub,s,c,p,txt,doc)=>{
    let g=G.get(k);if(!g){g={k,sub,nrcs:new Map()};G.set(k,g)}
    let r=g.nrcs.get(s.nrc);if(!r){r={nrc:s.nrc,curso:c.c,cn:c.n,sec:s.sec,prog:p.k,reg:s.reg,cap:s.cap,bl:[],doc:new Set()};g.nrcs.set(s.nrc,r)}
    if(txt&&!r.bl.includes(txt))r.bl.push(txt);if(doc)r.doc.add(doc);
  };
  const info=new Map();
  for(const p of D)for(const c of p.c)for(const s of c.s)info.set(s.nrc,{s,c,p});
  if(modo==='lab'){
    for(const l of A.labs){const k=l.n+' · '+l.amb;
      for(const e of l.ev){if(prog&&!e[9].includes(prog))continue;const i=info.get(e[4]);if(!i)continue;
        add(k,l.a,i.s,i.c,i.p,DN[e[0]]+' '+hm(e[1])+'–'+hm(e[2])+' ('+e[3]+')',e[8].join(' / '))}}
  }else{
    for(const p of D){if(prog&&p.k!==prog)continue;
      for(const c of p.c)for(const s of c.s){
        if(!s.m.length){add(SIN,'',s,c,p,'','');continue}
        for(const m of s.m)add(modo==='pabe'?m[0]:m[1],modo==='aula'?m[0]:'',s,c,p,m[2]+' '+m[3],m[5])}}
  }
  return[...G.values()].map(g=>{const a=[...g.nrcs.values()],nrc=a.length,reg=a.reduce((x,r)=>x+r.reg,0),cap=a.reduce((x,r)=>x+r.cap,0);
    return{k:g.k,sub:g.sub,nrc,reg,cap,prom:nrc?reg/nrc:0,ocup:cap?reg/cap:null,det:a}});
}

function ajuste(P){ // regresión lineal reg = a + b·nrc y coeficiente de Pearson
  const n=P.length;if(n<3)return null;
  const mx=P.reduce((a,p)=>a+p.nrc,0)/n,my=P.reduce((a,p)=>a+p.reg,0)/n;
  let sxy=0,sxx=0,syy=0;P.forEach(p=>{sxy+=(p.nrc-mx)*(p.reg-my);sxx+=(p.nrc-mx)**2;syy+=(p.reg-my)**2});
  if(!sxx||!syy)return null;const b=sxy/sxx;return{a:my-b*mx,b,r:sxy/Math.sqrt(sxx*syy)};
}

function kpis(){
  const u=new Map();for(const p of D){if(prog&&p.k!==prog)continue;for(const c of p.c)for(const s of c.s)u.set(s.nrc,s)}
  const reg=[...u.values()].reduce((a,s)=>a+s.reg,0),cap=[...u.values()].reduce((a,s)=>a+s.cap,0),ub=filas.filter(f=>f.k!==SIN).length;
  const sin=filas.find(f=>f.k===SIN);
  $('#kp').innerHTML=[[nf(ub),'ubicaciones'],[nf(u.size),'NRC (sin duplicar)'],[nf(reg),'alumnos registrados (REG)'],[u.size?d1(reg/u.size):'—','REG promedio por NRC'],[cap?d1(100*reg/cap)+' %':'—','ocupación (REG / capacidad)'],[sin?nf(sin.nrc):'0','NRC sin ubicación']]
   .map(([v,t])=>`<div class="kpi"><b>${v}</b><span>${t}</span></div>`).join('');
}

function dispersion(){
  const P=filas.filter(f=>f.k!==SIN&&f.nrc>0);
  if(!P.length){$('#sc').innerHTML='<p class="nota">Sin datos para graficar.</p>';$('#rr').textContent='';return}
  const W=900,H=360,L=56,R=16,T=12,B=40,mx=Math.max(...P.map(p=>p.nrc)),my=Math.max(...P.map(p=>p.reg));
  const X=v=>L+(v/mx)*(W-L-R),Y=v=>H-B-(v/my)*(H-T-B),tk=(m,n=5)=>Array.from({length:n+1},(_,i)=>Math.round(m*i/n));
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Dispersión NRC contra alumnos registrados por ubicación">`;
  tk(my).forEach(v=>s+=`<line class="ax" x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end">${nf(v)}</text>`);
  tk(mx).forEach(v=>s+=`<line class="ax" x1="${X(v)}" x2="${X(v)}" y1="${T}" y2="${H-B}"/><text x="${X(v)}" y="${H-B+16}" text-anchor="middle">${nf(v)}</text>`);
  s+=`<text x="${(L+W-R)/2}" y="${H-6}" text-anchor="middle">NRC en la ubicación</text><text transform="translate(14 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle">Alumnos registrados (REG)</text>`;
  const f=ajuste(P);
  if(f)s+=`<line class="rg" x1="${X(0)}" y1="${Y(Math.max(0,f.a))}" x2="${X(mx)}" y2="${Y(Math.min(my*1.2,f.a+f.b*mx))}"/>`;
  P.forEach(p=>s+=`<circle cx="${X(p.nrc)}" cy="${Y(p.reg)}" r="5" data-k="${esc(p.k)}"><title>${esc(p.k)}: ${p.nrc} NRC · ${nf(p.reg)} alumnos</title></circle>`);
  $('#sc').innerHTML=s+'</svg>';
  $('#rr').textContent=f?`Cada punto es una ubicación. Línea punteada: ajuste lineal (≈ ${d1(f.b)} alumnos más por cada NRC adicional) · correlación r = ${f.r.toFixed(2).replace('.',',')}. Haz clic en un punto para ver sus NRC.`:'Se necesitan al menos 3 ubicaciones para calcular la relación.';
  $('#sc').querySelectorAll('circle').forEach(c=>c.onclick=()=>detalle(c.dataset.k));
}

function lista(){
  const t=q.trim().toLowerCase();
  let a=filas.filter(f=>!t||(f.k+' '+f.sub).toLowerCase().includes(t));
  const cmp={reg:(x,y)=>y.reg-x.reg,nrc:(x,y)=>y.nrc-x.nrc,prom:(x,y)=>y.prom-x.prom,ocup:(x,y)=>(y.ocup||0)-(x.ocup||0),nom:(x,y)=>x.k.localeCompare(y.k,'es',{numeric:true})}[orden];
  a.sort(cmp);
  const mr=Math.max(1,...a.map(f=>f.reg)),mn=Math.max(1,...a.map(f=>f.nrc)),M=400,v=a.slice(0,M);
  const ub=modo==='pabe'?'Pabellón':modo==='aula'?'Aula':'Laboratorio · ambiente';
  $('#tb').innerHTML=`<thead><tr><th>${ub}</th>${modo==='aula'?'<th class="l">Pabellón</th>':modo==='lab'?'<th class="l">Programa</th>':''}<th>NRC</th><th>Alumnos (REG)</th><th>REG por NRC</th><th>Capacidad</th><th>Ocupación</th></tr></thead><tbody>${
    v.map(f=>`<tr data-k="${esc(f.k)}"><td>${esc(f.k)}</td>${modo!=='pabe'?`<td class="l">${esc(f.sub)}</td>`:''}<td class="db"><i style="width:${100*f.nrc/mn}%"></i><span>${nf(f.nrc)}</span></td><td class="db"><i style="width:${100*f.reg/mr}%"></i><span>${nf(f.reg)}</span></td><td>${d1(f.prom)}</td><td>${nf(f.cap)}</td><td>${f.ocup===null?'—':d1(100*f.ocup)+' %'}</td></tr>`).join('')||'<tr><td colspan="7">Sin resultados.</td></tr>'}</tbody>`;
  $('#nt').textContent=(a.length>M?`Se muestran las primeras ${M} de ${a.length} ubicaciones (usa el buscador). `:'')+'Un NRC con clases en varias ubicaciones se cuenta en cada una; por eso la suma de la tabla puede superar el total de arriba. Haz clic en una fila para ver sus NRC.';
  $('#tb').querySelectorAll('tbody tr[data-k]').forEach(r=>r.onclick=()=>detalle(r.dataset.k));
}

function detalle(k){
  const f=filas.find(x=>x.k===k);if(!f)return;
  const a=[...f.det].sort((x,y)=>y.reg-x.reg);
  $('#pb').innerHTML=`<button class="x" onclick="$('#pn').classList.remove('on')">✕</button><h3>${esc(k)}</h3><p>${f.nrc} NRC · ${nf(f.reg)} alumnos registrados · ${d1(f.prom)} por NRC · Periodo ${esc(PERIODO)}</p>
  <div class="tw"><table class="tb"><thead><tr><th>NRC</th><th class="l">Curso</th><th class="l">Secc.</th><th class="l">Prog.</th><th>REG</th><th>Capac.</th><th class="l">Horario en esta ubicación</th></tr></thead><tbody>${a.map(r=>`<tr style="cursor:default"><td>${r.nrc}</td><td class="l">${esc(r.curso)} · ${esc(r.cn)}</td><td class="l">${esc(r.sec)}</td><td class="l">${esc(r.prog)}</td><td>${r.reg}</td><td>${r.cap}</td><td class="l">${esc(r.bl.join(' | '))}</td></tr>`).join('')}</tbody></table></div>`;
  $('#pn').classList.add('on');
}

function exportarCsv(){
  const c=v=>'"'+String(v).replace(/"/g,'""')+'"';
  const R=[['Ubicación','Sub','NRC','REG','Capacidad','REG por NRC','Ocupación %']].concat(filas.map(f=>[f.k,f.sub,f.nrc,f.reg,f.cap,f.prom.toFixed(2),f.ocup===null?'':(100*f.ocup).toFixed(1)]));
  const b=new Blob(['\uFEFF'+R.map(r=>r.map(c).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download='estadisticas_'+modo+'_'+PERIODO+(prog?'_'+prog:'')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function pintar(){filas=agrupar();kpis();dispersion();lista()}
$('#prog').innerHTML+=D.map(p=>`<option value="${esc(p.k)}">${esc(p.k)} · ${esc(p.n)}</option>`).join('');
$('#modo').onchange=e=>{modo=e.target.value;pintar()};
$('#prog').onchange=e=>{prog=e.target.value;pintar()};
$('#orden').onchange=e=>{orden=e.target.value;lista()};
$('#q').oninput=e=>{q=e.target.value;lista()};
$("#csv").onclick=exportarCsv;
$('#pn').onclick=e=>{if(e.target.id==='pn')$('#pn').classList.remove('on')};
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#pn').classList.remove('on')});
$('#th').onclick=()=>{const r=document.documentElement,d=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;r.dataset.theme=d?'light':'dark'};
pintar();
