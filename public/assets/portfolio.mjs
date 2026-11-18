export const portfolioLabels={active:'À investiguer',discarded:'Écarté — hors périmètre',closed:'Clôturé — étude terminée'};
export const portfolioState=p=>p?.portfolio?.state||'active';
export function validPortfolio(v){
 if(v===undefined)return true;
 if(!v||typeof v!=='object'||Array.isArray(v)||!Object.hasOwn(portfolioLabels,v.state)||typeof v.reason!=='string'||v.reason.length>2000||typeof v.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||Number.isNaN(Date.parse(v.date))||new Date(v.date+'T00:00:00Z').toISOString().slice(0,10)!==v.date)return false;
 if(v.state!=='active'&&!v.reason.trim())return false;
 return v.priority===undefined||(Number.isInteger(v.priority)&&v.priority>=1&&v.priority<=100);
}
export function partitionProjects(records){const active=[],archived=[];for(const x of records)(portfolioState(x.data)==='active'?active:archived).push(x);active.sort((a,b)=>(a.data.portfolio?.priority??1000)-(b.data.portfolio?.priority??1000));return {active,archived};}
export function blankProject(name='Nouveau projet',context=''){
 const criteria=[{id:'quality',name:'Qualité et utilité métier',weight:40,blocking:false},{id:'data',name:'Données, droits et admissibilité',weight:35,blocking:true},{id:'integration',name:'Intégration et exploitation',weight:25,blocking:false}];
 const row=()=>({label:'Poste à chiffrer',amount:0,hours:0,group:'police',rate:120,source:'À documenter — aucun devis ni mesure',evidence:'hypothesis'});
 return {name,context,status:'Entrée du projet — besoin à explorer',sources:'',rates:{police:120,civil:80},years:3,discount:0,criteria,alternatives:[{name:'Approche à préciser après exploration',notes:'Hypothèse de travail. Prototype interne ou solution externe à étudier ; aucun choix validé.',initial:[row()],recurring:[row()],benefits:[{label:'Activité à mesurer',group:'police',rate:120,volume:null,before:null,after:null,review:null,reuse:100,cash:0,source:'À mesurer',evidence:'hypothesis'}],adoption:[100,100,100],avoided:0,scores:Object.fromEntries(criteria.map(c=>[c.id,{score:null,source:'',admissibility:'pending',evidence:'hypothesis'}]))}]};
}
export function approachView(p,{select,area}){return `<section class="project-approach"><h3>4. Prototype interne ou solution externe</h3><p>Précise l’approche à explorer à partir des frictions. Un cas observé ailleurs est facultatif. Ce choix reste une hypothèse à confronter au statu quo pendant le cadrage.</p>${select('Approche envisagée','exploration.approach',[['undecided','À préciser'],['internal','Prototype interne'],['external','Solution externe'],['compare','Comparer les deux approches']])}${area('Piste envisagée, périmètre du test et questions ouvertes','exploration.approachNotes')}<button type="button" data-action="go-context">Continuer vers le cadrage</button></section>`;}
