// Pure calculation engine: shared by the interface and the executable tests.
export const money = n => n == null ? 'À mesurer' : new Intl.NumberFormat('fr-CH',{style:'currency',currency:'CHF',maximumFractionDigits:0}).format(n);
export function rate(row,p){return row.group==='custom'?Number(row.rate):Number(p.rates[row.group]);}
export function cost(row,p){return Number(row.amount||0)+Number(row.hours||0)*rate(row,p);}
export function benchmark(a,p){
  const total=p.criteria.reduce((s,c)=>s+Number(c.weight),0);
  const complete=total>0 && p.criteria.every(c=>a.scores[c.id]?.score!=null && a.scores[c.id]?.score!=='');
  return {score:complete?p.criteria.reduce((s,c)=>s+Number(c.weight)*Number(a.scores[c.id].score),0)/total:null,weight:total,blocked:p.criteria.some(c=>c.blocking && a.scores[c.id]?.admissibility==='blocked'),pending:p.criteria.some(c=>c.blocking && a.scores[c.id]?.admissibility!=='ok')};
}
export function calculate(p,a){
  const years=Number(p.years), discount=Number(p.discount)/100;
  const initial=a.initial.reduce((s,r)=>s+cost(r,p),0);
  const initialCash=a.initial.reduce((s,r)=>s+Number(r.amount||0),0);
  const annual=a.recurring.reduce((s,r)=>s+cost(r,p)*12,0);
  const annualCash=a.recurring.reduce((s,r)=>s+Number(r.amount||0)*12,0);
  const complete=a.benefits.length>0 && a.benefits.every(r=>['volume','before','after','review'].every(k=>r[k]!=='' && r[k]!=null));
  let hours=0,value=0,cash=0;
  if(complete) for(const r of a.benefits){
    const h=Number(r.volume)*(Number(r.before)-Number(r.after)-Number(r.review))/60*Number(r.reuse)/100;
    hours+=h;value+=h*rate(r,p);cash+=h*rate(r,p)*Number(r.cash)/100;
  }
  const avoided=Number(a.avoided||0); // Annual cash expense actually avoided, outside staff time.
  let cum=-initial,cumCash=-initialCash,npv=-initial,npvCash=-initialCash,payback=null,cashPayback=null;
  const rows=[];
  for(let y=1;y<=years;y++){
    const adoption=Number(a.adoption[y-1]??a.adoption.at(-1)??100)/100;
    const gross=complete?value*adoption+avoided:null;
    const cashGross=complete?cash*adoption+avoided:null;
    const net=complete?gross-annual:null,cashNet=complete?cashGross-annualCash:null;
    if(complete){
      if(payback===null && cum<0 && net>0 && cum+net>=0)payback=(y-1+(-cum)/net)*12;
      if(cashPayback===null && cumCash<0 && cashNet>0 && cumCash+cashNet>=0)cashPayback=(y-1+(-cumCash)/cashNet)*12;
      cum+=net;cumCash+=cashNet;npv+=net/((1+discount)**y);npvCash+=cashNet/((1+discount)**y);
    }
    rows.push({year:y,adoption:adoption*100,gross,net,cashGross,cashNet,cumulative:complete?cum:null,cumulativeCash:complete?cumCash:null});
  }
  if(complete&&initial===0&&rows[0].net>=0)payback=0;
  if(complete&&initialCash===0&&rows[0].cashNet>=0)cashPayback=0;
  const tco=initial+annual*years,tcoCash=initialCash+annualCash*years;
  // Threshold uses all eligible benefit volumes, at the year-one adoption and hourly mix.
  const weightedVolume=a.benefits.reduce((s,r)=>s+Number(r.volume||0)*rate(r,p)*Number(r.reuse)/100,0)*Number(a.adoption[0]??100)/100;
  const threshold=weightedVolume>0?Math.max(0,initial+annual-avoided)/weightedVolume*60:null;
  return {initial,initialCash,annual,annualCash,tco,tcoCash,complete,hours:complete?hours:null,value:complete?value:null,rows,npv:complete?npv:null,npvCash:complete?npvCash:null,payback,cashPayback,roi:complete&&tco>0?cum/tco*100:null,roiCash:complete&&tcoCash>0?cumCash/tcoCash*100:null,threshold};
}
