import {portfolioLabels,portfolioState,validPortfolio,partitionProjects,blankProject} from './portfolio.mjs?v=1';
import {blankExploration,blankCase,validExploration,adoptionGaps,buildPrompt,explorationView,explorationReport,explorationRows} from './explore.mjs?v=11';
import {prepareOcr,recognizeOcr,ocrRange} from './ocr-source.mjs?v=2';
import {importInitial,sourcePartText,mergeSource} from './source-import.mjs?v=5';
import {aiContext,validFrictionAnalysis,frictionAnalysisText} from './friction-ai.mjs?v=5';
import {frictionGuideText} from './frictions.mjs?v=1';
import {calculate,benchmark,money} from './finance.mjs';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let portfolioSaving=false;
let sourceImport=importInitial(),sourceOcrJob=null,sourceOcrController=null;
let connectedAi={info:null,draft:null,result:null,busy:false,error:''};
let exploreSelected=0,aiPrompt='',frictionGuideOpen=false;
let project=null,id=null,version=0,tab='context',selected=0,user=null,role=null,csrf='',dirty=false,projects=[];
const clone=x=>JSON.parse(JSON.stringify(x));
const msg=t=>{$('#message').textContent=t;};
const fmt=n=>n==null?'À mesurer':new Intl.NumberFormat('fr-CH',{maximumFractionDigits:1}).format(n);
const statusLabel={hypothesis:'Hypothèse',quote:'Devis / documentation',measured:'Mesuré'};
function changed(){dirty=true;$('#saveState').textContent='Modifications non enregistrées';}
function pathValue(path){return path.split('.').reduce((v,k)=>v?.[k],project);}
function field(label,path,type='text',extra=''){
 const v=pathValue(path);return `<label>${esc(label)}<input data-path="${path}" type="${type}" value="${esc(v)}" ${extra}></label>`;
}
function area(label,path){return `<label>${esc(label)}<textarea data-path="${path}">${esc(pathValue(path))}</textarea></label>`;}
function select(label,path,options){return `<label>${esc(label)}<select data-path="${path}">${options.map(([v,l])=>`<option value="${esc(v)}" ${String(pathValue(path))===String(v)?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;}
const evidence=path=>select('Niveau de preuve',path,Object.entries(statusLabel));
function group(path){return select('Profil de coût',path,[['police','Profil A'],['civil','Profil B'],['custom','Taux spécifique']]);}
function notice(t,w=false){return `<div class="notice ${w?'warning':''}">${t}</div>`;}
function metric(title,v,sub=''){return `<div class="metric"><small>${esc(title)}</small><strong>${esc(v)}</strong><small>${esc(sub)}</small></div>`;}
function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
async function api(action,data){
 const r=await fetch(`api.php?action=${encodeURIComponent(action)}`,data?{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data),credentials:'same-origin'}:{credentials:'same-origin'});
 let d;try{d=await r.json();}catch{throw Error(`Réponse du serveur illisible (HTTP ${r.status}). La fiche reste inchangée ; réessaye plus tard.`);}
 if(!r.ok)throw Error(d.error||'Requête refusée');return d;
}
async function aiInfo(){try{connectedAi.info=await api('friction-method');}catch{connectedAi.info=null;}}
async function session(){try{const d=await api('session');({user,role,csrf}=d);account();if(user){await aiInfo();await loadProjects();}}catch{account();}}
function account(){

 const loginPanel=$('.login-panel');if(loginPanel)loginPanel.hidden=!!user;
 $('#account').replaceChildren();
 const s=document.createElement('span');s.textContent=user?`${user} · ${role==='editor'?'Rédaction':'Lecture'}`:'Non connecté · aperçu';$('#account').append(s);
 if(user){const b=document.createElement('button');b.textContent='Déconnexion';b.className='secondary';b.addEventListener('click',async()=>{if(!guard())return;try{await api('logout',{});user=null;role=null;connectedAi={info:null,draft:null,result:null,busy:false,error:''};projects=[];project=null;dirty=false;account();home();await session();}catch(e){msg(e.message);}});$('#account').append(b);}
}
function guard(){if(portfolioSaving){msg('Enregistrement en cours.');return false;}if(sourceImport.busy){msg('Attendre la fin de l’extraction avant de changer de projet.');return false;}if(connectedAi.busy){msg('Attendre la fin de l’analyse avant de changer de projet.');return false;}return !dirty||confirm('Des modifications ne sont pas enregistrées. Les exporter avant de continuer ? Annuler pour garder cette page.');}
function open(p,record=null){if(sourceImport.busy){msg('Attendre la fin de l’extraction.');return;}if(sourceOcrJob){sourceOcrJob.destroy().catch(()=>{});sourceOcrJob=null;}sourceImport=importInitial();if(connectedAi.busy){msg('Attendre la fin de l’analyse avant de changer de projet.');return;}connectedAi={...connectedAi,draft:null,result:null,error:''};project=clone(p);project.exploration??=blankExploration();project.exploration.sourceMaterial??={reference:'',excerpt:''};project.exploration.approach??='undecided';project.exploration.approachNotes??='';exploreSelected=0;aiPrompt='';frictionGuideOpen=false;id=record?.id??null;version=record?.version??0;selected=0;dirty=false;tab='explore';$('#start').hidden=true;$('#workspace').hidden=false;document.body.classList.add('project-open');$('#portfolioHome').hidden=false;render();msg('');$('#projectTitle').focus();}
function home(){if(portfolioSaving){msg('Enregistrement en cours.');return;}if(sourceImport.busy||connectedAi.busy){msg('Termine ou annule l’opération en cours avant de revenir au portefeuille.');return;}if(dirty){$('#leaveSave').hidden=role!=='editor';$('#leaveError').textContent='';$('#leaveDialog').showModal();return;}$('#workspace').hidden=true;$('#start').hidden=false;document.body.classList.remove('project-open');$('#portfolioHome').hidden=true;dirty=false;project=null;id=null;if(sourceOcrJob){sourceOcrJob.destroy().catch(()=>{});sourceOcrJob=null;}sourceImport=importInitial();renderProjects();$('#portfolioTitle').focus();}
function renderProjects(){
 const {active,archived}=partitionProjects(projects),root=$('#projects');root.replaceChildren();
 const add=(list,target)=>list.forEach(r=>{const b=document.createElement('button');b.className='secondary project-card';b.innerHTML=`<span><strong>${esc(r.data.name)}</strong><span class="project-description">${esc(portfolioLabels[portfolioState(r.data)])}</span><span class="project-description">${esc(r.data.portfolio?.reason||r.data.status)}</span><span class="project-meta">Version ${esc(r.version)} · ${r.data.alternatives.length} variante(s) · ${r.data.exploration?.cases?.length??0} cas observé(s) ailleurs</span></span><span aria-hidden="true">→</span>`;b.addEventListener('click',()=>{if(guard())open(r.data,r);});target.append(b);});
 const h=document.createElement('h3');h.textContent=`Projets à investiguer · ${active.length}`;root.append(h);const grid=document.createElement('div');grid.className='project-grid';root.append(grid);add(active,grid);
 if(!active.length){const p=document.createElement('p');p.textContent='Aucun projet actif. Importe un document d’initialisation ou crée un projet.';root.append(p);}
 if(archived.length){const d=document.createElement('details'),summary=document.createElement('summary');summary.textContent=`Projets écartés ou clôturés · ${archived.length}`;d.append(summary);const hint=document.createElement('p');hint.textContent='Ces projets restent consultables avec leur motif. Tu peux les rouvrir pour les investiguer.';d.append(hint);const g=document.createElement('div');g.className='project-grid';d.append(g);root.append(d);add(archived,g);}
}
async function loadProjects(){const d=await api('projects');projects=d.projects;renderProjects();}
function blankRow(){return {label:'Nouveau poste',amount:0,hours:0,group:'police',rate:120,source:'',evidence:'hypothesis'};}
function blankBenefit(){return {label:'Activité à mesurer',group:'police',rate:120,volume:null,before:null,after:null,review:null,reuse:100,cash:0,source:'',evidence:'hypothesis'};}
function blankAlternative(name='Nouvelle variante'){
 return {name,notes:'',initial:[blankRow()],recurring:[blankRow()],benefits:[blankBenefit()],adoption:Array(project.years).fill(100),avoided:0,scores:Object.fromEntries(project.criteria.map(c=>[c.id,{score:null,source:'',admissibility:'pending',evidence:'hypothesis'}]))};
}
function render(){
 if(!project)return;$('#projectTitle').textContent=project.name;$('#saveState').textContent=dirty?'Modifications non enregistrées':id?`Version ${version} enregistrée`:'Copie locale · exporter pour conserver';
 $('#closeProject').hidden=role!=='editor';$('#closeProject').textContent=portfolioState(project)==='active'?'Écarter ou clôturer':'Gérer le statut du projet';$('#projectLifecycle').textContent=portfolioLabels[portfolioState(project)]+(project.portfolio?.reason?' · '+project.portfolio.reason:'');$('#save').disabled=!user||role!=='editor';$('#save').title=user?'Enregistrer dans la base dédiée':'Connexion nécessaire pour enregistrer sur le serveur';
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-current',b.dataset.tab===tab?'step':'false');});
 $('#content').innerHTML=({explore:()=>explorationView(project,exploreSelected,aiPrompt,{esc,field,area,select,notice,table,showFrictions:frictionGuideOpen,sourceImport,connectedAi:{...connectedAi,role}}),context:contextView,benchmark:benchmarkView,finance:financeView,report:reportView}[tab])();
 if(role==='reader')$('#content').querySelectorAll('input,textarea,select,button[data-action]').forEach(e=>{if(!['friction-guide','export-frictions'].includes(e.dataset.action))e.disabled=true;});
}
function contextView(){return `<section class="panel"><h2>Le besoin et les hypothèses communes</h2><div class="grid">${field('Nom du projet','name')}${field('Statut / décision','status')}${area('Travail actuel, friction, statu quo et périmètre','context')}${area('Sources et références du projet','sources')}</div><div class="grid three">${field('Profil A · CHF/h, coût complet','rates.police','number','min="0" max="10000" step="0.01"')}${field('Profil B · CHF/h, coût complet','rates.civil','number','min="0" max="10000" step="0.01"')}${field('Horizon · années (1 à 10)','years','number','min="1" max="10" step="1"')}${field('Actualisation annuelle · %','discount','number','min="0" max="100" step="0.1"')}</div>${notice('Les taux RH incluent déjà les charges et le poste de travail. Ne pas ajouter ces frais une seconde fois. Une prestation externe remplace les heures internes correspondantes. Tous les montants sont en CHF, sur une même base de TVA à préciser dans les sources.')}<h3>Variantes à comparer au statu quo</h3>${project.alternatives.map((a,i)=>`<div class="alt">${field('Nom de la variante',`alternatives.${i}.name`)}${area('Périmètre, limites, devis et hypothèses',`alternatives.${i}.notes`)}</div>`).join('')}<button data-action="add-alt" class="secondary">Ajouter une variante</button><p class="hint">Un projet peut comparer un achat, une intégration ou un développement. Le statu quo est décrit ci-dessus ; les gains et surcoûts sont calculés par rapport à lui.</p></section>`;}
function benchmarkView(){
 return `<section class="panel"><h2>Benchmark des variantes</h2><p>Comparer les mêmes tâches, le même corpus et les mêmes exigences. Une note sans preuve reste une hypothèse. Échelle : 1 = très insuffisant, 3 = acceptable, 5 = très satisfaisant. Les poids sont normalisés au total saisi.</p><details><summary>Critères et pondérations proposés</summary>${project.criteria.map((c,i)=>`<div class="grid">${field('Critère',`criteria.${i}.name`)}${field('Poids relatif',`criteria.${i}.weight`,'number','min="0" max="100" step="1"')}<label><input type="checkbox" data-path="criteria.${i}.blocking" ${c.blocking?'checked':''}>Condition d’admissibilité obligatoire</label></div>`).join('')}<button data-action="add-criterion" class="secondary">Ajouter un critère</button></details>${table(['Variante','Note pondérée / 5','Admissibilité'],project.alternatives.map(a=>{const b=benchmark(a,project);return [esc(a.name),b.score===null?'À compléter':fmt(b.score),b.blocked?'Bloquée':b.pending?'À valider':'Conditions déclarées satisfaites'];}))}${notice('Un bon score ne lève jamais une condition bloquante. Les autorisations et les preuves doivent être examinées séparément. Les pondérations proposées sont à valider pour votre organisation.')}<div class="actions no-print"><button data-action="refresh" class="secondary">Recalculer le benchmark</button></div>${project.alternatives.map((a,i)=>`<h3>${esc(a.name)}</h3>${table(['Critère','Évaluation','Justification / preuve'],project.criteria.map(c=>{const path=`alternatives.${i}.scores.${c.id}`;return [esc(c.name)+`<br><small>Poids : ${esc(c.weight)}</small>`,select('Note / 5',path+'.score',[['','À évaluer'],[1,'1 — Très insuffisant'],[2,'2 — Insuffisant'],[3,'3 — Acceptable'],[4,'4 — Satisfaisant'],[5,'5 — Très satisfaisant']])+evidence(path+'.evidence')+(c.blocking?select('Admissibilité',path+'.admissibility',[['pending','À valider'],['ok','Satisfaite, preuve renseignée'],['blocked','Bloquante']]):''),area('Source, date, test et limites',path+'.source')];}))}`).join('')}</section>`;
}
function alternativePicker(){return `<label class="no-print">Variante à renseigner<select id="alternative">${project.alternatives.map((a,i)=>`<option value="${i}" ${i===selected?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>`;}
function costRows(kind,title){const a=project.alternatives[selected],base=`alternatives.${selected}.${kind}`;
 return `<h3>${title}</h3>${table(['Poste et preuve','Dépense externe CHF','Travail interne','Actions'],a[kind].map((r,j)=>{const path=`${base}.${j}`;return [field('Libellé',path+'.label')+field('Source / devis / date',path+'.source')+evidence(path+'.evidence'),field(kind==='initial'?'Montant initial':'Montant par mois',path+'.amount','number','min="0" step="0.01"'),field(kind==='initial'?'Heures initiales':'Heures par mois',path+'.hours','number','min="0" step="0.1"')+group(path+'.group')+field('CHF/h si taux spécifique',path+'.rate','number','min="0" step="0.01"'),`<button class="danger" data-action="remove-cost" data-kind="${kind}" data-index="${j}">Retirer ce poste</button>`];}))}<button class="secondary" data-action="add-cost" data-kind="${kind}">Ajouter un poste</button>`;
}
function financeView(){const a=project.alternatives[selected],base=`alternatives.${selected}`;
 return `<section class="panel"><h2>Coûts et gains différentiels</h2>${alternativePicker()}${notice('Renseigner les surcoûts et les gains par rapport au statu quo. Le temps après IA comprend son utilisation ; la relecture, les corrections et les reprises sont saisies séparément. Des temps négatifs nets restent des pertes et sont conservés dans le calcul.')}<details open><summary>1. Mise en œuvre et formation</summary>${costRows('initial','Investissement initial')}</details><details><summary>2. Fonctionnement mensuel</summary>${costRows('recurring','Charges récurrentes par mois')}</details><details open><summary>3. Activités et temps économisé</summary><p class="hint">Séparer les profils A et B. Le volume annuel représente des occurrences, par exemple des personnes × des jours × des tâches. Éviter de compter une même activité dans plusieurs lignes ou projets.</p>${a.benefits.map((r,j)=>{const path=`${base}.benefits.${j}`;return `<div class="alt">${field('Activité',path+'.label')}<div class="grid three">${group(path+'.group')}${field('CHF/h si taux spécifique',path+'.rate','number','min="0" step="0.01"')}${field('Occurrences annuelles à plein usage',path+'.volume','number','min="0" step="1"')}${field('Avant IA · minutes / occurrence',path+'.before','number','min="0" step="0.01"')}${field('Avec IA, hors contrôle · minutes',path+'.after','number','min="0" step="0.01"')}${field('Relecture, corrections, reprises · minutes',path+'.review','number','min="0" step="0.01"')}${field('Temps réellement réutilisable · %',path+'.reuse','number','min="0" max="100" step="1"')}${field('Part convertible en économie salariale · %',path+'.cash','number','min="0" max="100" step="1"')}${evidence(path+'.evidence')}</div>${area('Source, date, protocole de mesure et justification des économies',path+'.source')}${a.benefits.length>1?`<button class="danger" data-action="remove-benefit" data-index="${j}">Retirer cette activité</button>`:''}</div>`;}).join('')}<button data-action="add-benefit" class="secondary">Ajouter une activité / un profil</button></details><h3>4. Adoption et autres dépenses évitées</h3><p class="hint">Les coûts récurrents restent payés à 100 %. L’adoption réduit uniquement les gains. Cette règle prudente ne modélise pas automatiquement les économies d’API liées à une utilisation plus faible.</p><div class="grid three">${a.adoption.map((v,y)=>field(`Usage effectif année ${y+1} · % du volume`,base+`.adoption.${y}`,'number','min="0" max="100" step="1"')).join('')}${field('Autres dépenses évitées · CHF/an',base+'.avoided','number','min="0" step="0.01"')}</div><p class="hint">Les autres dépenses évitées doivent être réellement supprimées et documentées dans les notes de la variante ; elles sont comptées dès la première année, à 100 %.</p><button data-action="refresh">Calculer les résultats</button><h3>Résultat de la variante</h3>${result(a)}</section>`;
}
function result(a){const r=calculate(project,a);
 const hypothesis=a.benefits.some(b=>b.evidence!=='measured')||a.initial.some(b=>b.evidence==='hypothesis')||a.recurring.some(b=>b.evidence==='hypothesis');
 return `${!r.complete?notice('Gains à mesurer : renseigner le volume et les trois temps pour chaque activité. Les coûts et le seuil sont calculables ; la rentabilité reste indéterminée.',true):notice(hypothesis?'Résultat prévisionnel fondé en partie sur des hypothèses. Il ne constitue pas une rentabilité mesurée.':'Résultat calculé à partir des données déclarées mesurées. Vérifier les preuves et leur représentativité.')}<div class="grid three">${metric('Coût initial complet',money(r.initial),'dont dépenses externes : '+money(r.initialCash))}${metric('Fonctionnement annuel',money(r.annual),'dont dépenses externes : '+money(r.annualCash))}${metric('Coût total sur '+project.years+' ans',money(r.tco),'hors réserve ; coûts constants')}${metric('Gain net cumulé valorisé',money(r.rows.at(-1).cumulative),'après investissement et fonctionnement')}${metric('ROI valorisé sur la période',r.roi===null?'À mesurer':fmt(r.roi)+' %','gain net cumulé / coût total')}${metric('Remboursement valorisé',r.complete?(r.payback===null?'Non atteint':fmt(r.payback)+' mois'):'À mesurer','dans l’horizon ; gains uniformes dans chaque année')}</div>${table(['Année','Usage effectif','Gains bruts valorisés','Coût récurrent','Gain net annuel','Cumul, initial inclus'],r.rows.map(y=>[esc(y.year),fmt(y.adoption)+' %',money(y.gross),money(r.annual),money(y.net),money(y.cumulative)]))}<h3>Lecture budgétaire distincte</h3><p>Le coût RH est une ressource à mobiliser. Seule la part explicitement justifiée comme une économie salariale apparaît dans les flux budgétaires, avec les dépenses externes évitées.</p><div class="grid three">${metric('Dépenses externes sur la période',money(r.tcoCash))}${metric('Solde budgétaire cumulé',money(r.rows.at(-1).cumulativeCash),'économies réalisables moins dépenses externes')}${metric('VAN des gains valorisés',money(r.npv),'taux annuel : '+fmt(project.discount)+' %')}</div><p><strong>Seuil de première année :</strong> ${r.threshold===null?'à calculer après renseignement du volume':fmt(r.threshold*60)+' secondes nettes à gagner par occurrence, en moyenne pondérée sur les profils et le temps réutilisable.'}</p><p class="hint">Le coût initial est payé au départ. Les flux annuels sont actualisés en fin d’année. Le matériel est compté une seule fois à l’achat, sans ajouter son amortissement. Aucun gain qualitatif, réserve, inflation ou valeur résiduelle n’est ajouté automatiquement. Le seuil inclut les dépenses évitées déjà renseignées.</p>`;
}
function reportView(){
 return `<article class="panel"><p class="eyebrow">DOSSIER DE TRAVAIL · ${new Date().toLocaleDateString('fr-CH')}</p><h2>${esc(project.name)}</h2><p><strong>Statut :</strong> ${esc(project.status)}</p><p><strong>Portefeuille :</strong> ${esc(portfolioLabels[portfolioState(project)])} ${esc(project.portfolio?.date||'')}<br>${esc(project.portfolio?.reason||'')}</p><p class="print-source">${esc(project.context)}</p><p>Profil A : ${money(project.rates.police)}/h · Profil B : ${money(project.rates.civil)}/h · Horizon : ${project.years} ans · Actualisation : ${fmt(project.discount)} %</p><h3>Comparaison financière et benchmark</h3>${table(['Variante','Initial complet','Annuel complet','Coût total','Gain net cumulé','Benchmark / 5','Admissibilité'],project.alternatives.map(a=>{const r=calculate(project,a),b=benchmark(a,project);return [esc(a.name),money(r.initial),money(r.annual),money(r.tco),money(r.rows.at(-1).cumulative),b.score===null?'À compléter':fmt(b.score),b.blocked?'Bloquée':b.pending?'À valider':'Déclarée satisfaite'];}))}${notice('Ces résultats comparent les variantes au statu quo décrit. La note du benchmark, le résultat économique et l’admissibilité sont trois lectures complémentaires. La décision de déploiement nécessite une validation compétente.')}<h3>Sources et méthode</h3><div class="print-source">${esc(project.sources)}</div>${project.alternatives.map(a=>`<section class="alt-report"><h2>${esc(a.name)}</h2><p class="print-source">${esc(a.notes)}</p>${result(a)}<h3>Coûts détaillés</h3>${table(['Période','Poste','Externe CHF','Heures','Profil / taux spécifique','Preuve et source'],['initial','recurring'].flatMap(k=>a[k].map(r=>[k==='initial'?'Initial':'Par mois',esc(r.label),money(r.amount),fmt(r.hours),esc(r.group==='custom'?r.rate+' CHF/h':r.group==='police'?'Profil A':'Profil B'),esc(statusLabel[r.evidence])+ '<br>'+esc(r.source)])))}<h3>Hypothèses des gains</h3>${table(['Activité','Volume / an','Avant / IA / contrôle (min)','Profil','Réutilisable / économie salariale','Preuve'],a.benefits.map(r=>[esc(r.label),fmt(r.volume),[r.before,r.after,r.review].map(fmt).join(' / '),esc(r.group==='custom'?r.rate+' CHF/h':r.group==='police'?'Profil A':'Profil B'),fmt(r.reuse)+' % / '+fmt(r.cash)+' %',esc(statusLabel[r.evidence])+'<br>'+esc(r.source)]))}<p>Autres dépenses évitées : ${money(a.avoided)}/an.</p><h3>Évaluations du benchmark</h3>${table(['Critère et poids','Note / 5','Condition','Justification'],project.criteria.map(c=>{const s=a.scores[c.id];return [esc(c.name)+' ('+fmt(c.weight)+')',fmt(s.score),c.blocking?esc({pending:'À valider',ok:'Satisfaite',blocked:'Bloquante'}[s.admissibility]):'—',esc(statusLabel[s.evidence])+'<br>'+esc(s.source)];}))}</section>`).join('')}${explorationReport(project,{esc,table})}</article>`;
}
function download(filename,type,text){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function validateForCalculation(){
 // Native constraints cover edited number fields; structural import uses strict checks below.
 const invalid=$('#content').querySelector(':invalid');if(invalid){invalid.reportValidity();return false;}
 if(!project.name.trim()||project.criteria.reduce((s,c)=>s+c.weight,0)<=0){msg('Renseigner le nom et au moins un poids positif.');return false;}return true;
}
function validateProjectDocument(){
 if(!validPortfolio(project.portfolio)){msg('Vérifier le statut du projet et son motif.');return false;}
 if(!validateForCalculation())return false;
 if(!validExploration(project.exploration)){msg('Exploration : vérifier les dates, les sources et la justification du statut. Pour « adopter », compléter la fiche et vérifier une source documentée ; « surveiller » exige un signal de réexamen. Le statut « brouillon » permet de conserver un travail incomplet.');return false;}
 return true;
}
function exportRows(filename,rows){
 const cell=v=>{if(v==null)return '"À mesurer"';if(typeof v==='number')return String(Math.round(v*100)/100).replace('.',',');const s=String(v);return '"'+(/^[\s]*[=+@\-]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"';};
 download(filename,'text/csv;charset=utf-8','\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n'));
}
function exportCsv(){
 const rows=[['Projet','Variante','Année','Usage %','Initial complet CHF','Fonctionnement annuel CHF','Gain brut valorisé CHF','Gain net annuel CHF','Cumul valorisé CHF','Cumul budgétaire CHF','Note benchmark /5','Admissibilité','Nature des gains']];
 project.alternatives.forEach(a=>{const r=calculate(project,a),b=benchmark(a,project);r.rows.forEach(y=>rows.push([project.name,a.name,y.year,y.adoption,r.initial,r.annual,y.gross,y.net,y.cumulative,y.cumulativeCash,b.score,b.blocked?'Bloquée':b.pending?'À valider':'Déclarée satisfaite',a.benefits.every(x=>x.evidence==='measured')?'Déclarés mesurés':'Hypothèses à valider']));});
 // Guard formula injection even when CSV is opened directly in Excel.
 const cell=v=>{if(v==null)return '"À mesurer"';if(typeof v==='number')return String(Math.round(v*100)/100).replace('.',',');const s=String(v);return '"'+(/^[\s]*[=+@\-]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"';};
 download('benchmark-finances.csv','text/csv;charset=utf-8','\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n'));
}
async function prepareSourceOcr(file){
 if(!file||sourceImport.busy||connectedAi.busy||role!=='editor')return;
 const owner=project;sourceImport={...importInitial(),busy:true,ocrActive:true,open:true};render();
 if(sourceOcrJob){await sourceOcrJob.destroy().catch(()=>{});sourceOcrJob=null;}
 const controller=new AbortController();sourceOcrController=controller;const timer=setTimeout(()=>controller.abort(),30000);
 const progress=t=>{if(controller.signal.aborted)return;sourceImport.progress=t;if($('#sourceOcrStatus'))$('#sourceOcrStatus').textContent=t;};
 try{const job=await prepareOcr(file,{signal:controller.signal,onProgress:progress});if(project!==owner){await job.destroy();return;}sourceOcrJob=job;sourceImport={...importInitial(),open:true,ocrSetup:{filename:file.name,pages:job.pages,kind:job.kind},ocrStart:1,ocrEnd:Math.min(10,job.pages)};}
 catch(err){sourceImport.error=err.name==='AbortError'?'Préparation OCR annulée ou délai dépassé.':err.message;}
 finally{clearTimeout(timer);sourceOcrController=null;sourceImport.busy=false;sourceImport.ocrActive=false;render();}
}
async function runSourceOcr(){
 if(sourceImport.busy||!sourceOcrJob||role!=='editor')return;
 let range;try{range=ocrRange(sourceImport.ocrStart,sourceImport.ocrEnd,sourceOcrJob.pages);}catch(err){sourceImport.error=err.message;render();return;}
 const owner=project,job=sourceOcrJob;sourceImport={...sourceImport,busy:true,ocrActive:true,error:'',document:null};render();
 const controller=new AbortController();sourceOcrController=controller;const timer=setTimeout(()=>controller.abort(),180000);
 const progress=t=>{if(controller.signal.aborted)return;sourceImport.progress=t;if($('#sourceOcrStatus'))$('#sourceOcrStatus').textContent=t;};
 try{const doc=await recognizeOcr(job,{...range,signal:controller.signal,onProgress:progress});if(project===owner)sourceImport={...importInitial(),document:doc,text:doc.text,open:true};}
 catch(err){sourceImport.error=err.name==='AbortError'?'Reconnaissance OCR annulée ou délai maximal dépassé. Essaie moins de pages.':err.message;}
 finally{clearTimeout(timer);await job.destroy().catch(()=>{});sourceOcrJob=null;sourceOcrController=null;sourceImport.busy=false;sourceImport.ocrActive=false;sourceImport.ocrSetup=null;render();$('#sourceImportPreviewTitle')?.focus();}
}
async function importSourceDocument(file){
 if(!file||sourceImport.busy||connectedAi.busy||role!=='editor')return;
 const formats=connectedAi.info?.documentImport?.formats||['pptx','docx','txt'],ext=file.name.split('.').pop().toLowerCase();
 if(['png','jpg','jpeg','webp'].includes(ext)&&connectedAi.info?.documentImport?.ocr){await prepareSourceOcr(file);return;}
 if(!formats.includes(ext)||file.size<1||file.size>8388608){sourceImport={...sourceImport,error:'Format non pris en charge ou fichier vide/trop volumineux (8 Mo maximum).',open:true};render();return;}
 const owner=project;let retryOcr=false;sourceImport={...importInitial(),busy:true,open:true};render();
 try{const form=new FormData();form.append('document',file);const r=await fetch('api.php?action=import-source',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':csrf},body:form});let d;try{d=await r.json();}catch{throw Error('Le serveur n’a pas pu extraire ce document. Essaie un fichier plus petit.');}if(!r.ok)throw Error(d.error||'Import refusé.');if(!d.document?.parts?.length||typeof d.document.text!=='string')throw Error('Texte extrait invalide.');if(project===owner)sourceImport={...importInitial(),document:d.document,text:d.document.text,open:true};}
 catch(err){sourceImport={...sourceImport,error:err.message};retryOcr=ext==='pdf'&&connectedAi.info?.documentImport?.ocr&&/OCR|Aucun texte/i.test(err.message);}
 finally{sourceImport.busy=false;render();$('#sourceImportPreviewTitle')?.focus();}
 if(retryOcr&&project===owner)await prepareSourceOcr(file);
}
function commitInput(e){
 if(e.target.id==='sourceOcrDocument'){if(e.type==='change')prepareSourceOcr(e.target.files[0]);return;}
 if(e.target.id==='sourceDocument'){if(e.type==='change')importSourceDocument(e.target.files[0]);return;}
 if(e.target.dataset.importField){const key=e.target.dataset.importField;sourceImport[key]=e.target.value;if(key==='part'&&e.type==='change'){sourceImport.text=sourcePartText(sourceImport.document,sourceImport.part);render();}return;}

 if(e.target.dataset.aiField){if(connectedAi.draft)connectedAi.draft[e.target.dataset.aiField]=e.target.value;return;}

 if(e.target.id==='explore-case'){exploreSelected=Number(e.target.value);aiPrompt='';render();return;}
 if(e.target.id==='alternative'){selected=Number(e.target.value);render();return;}
 const path=e.target.dataset.path;if(!path)return;
 if(!e.target.checkValidity()){if(e.type==='change')e.target.reportValidity();return;}
 const keys=path.split('.');let parent=project;for(const k of keys.slice(0,-1))parent=parent[k];
 let val=e.target.type==='checkbox'?e.target.checked:e.target.value;
 if(e.target.type==='number'||path.endsWith('.score'))val=val===''?null:Number(val);
 if(path==='years'){if(!Number.isInteger(val)||val<1||val>10){render();return;}project.alternatives.forEach(a=>{a.adoption=Array.from({length:val},(_,i)=>a.adoption[i]??a.adoption.at(-1)??100);});}
 if(val===null&&!['volume','before','after','review','score'].includes(keys.at(-1)))return;
 parent[keys.at(-1)]=val;changed();
 if(path.startsWith('exploration.')&&(path.endsWith('.decision')||path.endsWith('.title'))) {if(e.type==='change')render();}
}
$('#content').addEventListener('input',commitInput);
$('#content').addEventListener('change',commitInput);
$('#content').addEventListener('click',async e=>{
 const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action,a=project.alternatives[selected];
 if(action==='go-context'){if(validateForCalculation()){tab='context';render();$('#projectTitle').focus();}return;}
 if(action==='friction-guide'){frictionGuideOpen=true;render();$('#frictionGuideTitle')?.focus();msg('Pistes de friction affichées : hypothèses préparées localement, à vérifier sur le terrain. La fiche du projet reste inchangée.');return;}
 if(action==='export-frictions'){download('pistes-de-friction.txt','text/plain;charset=utf-8',frictionGuideText(project));return;}
 if(role==='reader')return;
 const ex=project.exploration,c=ex.cases[exploreSelected];
 if(action==='source-ocr-choose'){if(!sourceImport.busy&&!connectedAi.busy)$('#sourceOcrDocument')?.click();return;}
 if(action==='source-ocr-run'){await runSourceOcr();return;}
 if(action==='source-ocr-cancel'){sourceOcrController?.abort();return;}
 if(action==='source-ocr-dismiss'){if(sourceOcrJob){await sourceOcrJob.destroy().catch(()=>{});sourceOcrJob=null;}sourceImport={...importInitial(),open:true};render();return;}
 if(action==='source-choose'){if(!sourceImport.busy&&!connectedAi.busy)$('#sourceDocument')?.click();return;}
 if(action==='source-dismiss'){sourceImport={...importInitial(),open:true};render();return;}
 if(action==='source-use'||action==='source-analyze'){
  if(!sourceImport.document)return;
  try{if(sourceImport.mode==='append'&&sourceImport.text.trim()&&ex.sourceMaterial.excerpt.includes(sourceImport.text.trim()))throw Error('Ce passage est déjà dans la source.');ex.sourceMaterial=mergeSource(ex.sourceMaterial,sourceImport.document,sourceImport.text,sourceImport.part,sourceImport.mode);sourceImport={...importInitial(),open:true};changed();
   if(action==='source-analyze'){connectedAi.draft=aiContext(project);connectedAi.error='';}render();
   if(action==='source-analyze')$('#connectedFrictionAi h4')?.scrollIntoView({block:'start',behavior:'instant'});
   msg(action==='source-analyze'?'Source ajoutée. Vérifie le contexte avant son envoi au service IA configuré.':'Texte ajouté à la source de travail. Clique sur Enregistrer pour le conserver.');
  }catch(err){sourceImport.error=err.message;render();}return;
 }
 if(action==='friction-preview'){if(connectedAi.busy)return;connectedAi.draft=aiContext(project);connectedAi.error='';render();$('#connectedFrictionAi h4')?.scrollIntoView({block:'start',behavior:'instant'});return;}
 if(action==='friction-cancel'){if(!connectedAi.busy){connectedAi.draft=null;connectedAi.error='';render();}return;}
 if(action==='friction-run'){
  if(connectedAi.busy||!connectedAi.draft||!user||role!=='editor')return;
  const context=clone(connectedAi.draft),owner=project;connectedAi.busy=true;connectedAi.error='';render();
  try{const d=await api('analyze-frictions',{consent:true,context});if(!validFrictionAnalysis(d.analysis))throw Error('La réponse IA reçue est invalide.');if(project===owner){connectedAi.result=d.analysis;connectedAi.draft=null;msg('Analyse IA reçue : relis les hypothèses, puis conserve le brouillon ou ajoute les pistes utiles.');}}
  catch(err){connectedAi.error=err.message;msg(err.message);}
  finally{connectedAi.busy=false;render();if(connectedAi.result)$('#frictionAiResultTitle')?.focus();}return;
 }
 if(action==='friction-keep'){
  if(!connectedAi.result)return;ex.frictionAnalysis=clone(connectedAi.result);connectedAi.result=null;changed();render();msg('Brouillon IA ajouté à la copie de travail. Clique sur Enregistrer pour le retrouver sur tes autres appareils.');return;
 }
 if(action==='friction-use'){
  const analysis=connectedAi.result||ex.frictionAnalysis,f=analysis?.report.frictions[Number(b.dataset.index)];if(!f)return;
  const addition=`Hypothèse à vérifier — ${f.title}\n${f.problem}\nMaillon : ${f.step} · Personnes : ${f.people}\nConséquence possible : ${f.effect}\nÉléments déclarés : ${f.evidence}\nQuestion terrain : ${f.question}\nObservation : ${f.observation}\nÀ mesurer : ${f.measurement}\nChevauchements : ${f.overlap}${f.opportunity?'\nQuestion d’opportunité : '+f.opportunity:''}${f.sourceRef?'\nSource : '+f.sourceRef:''}`;
  if(ex.friction.includes(addition)){msg('Cette piste est déjà dans la friction.');return;}
  const next=[ex.friction,addition].filter(Boolean).join('\n\n');if(new TextEncoder().encode(next).length>12000){msg('Le texte de friction est trop long. Reformule les pistes utiles avant de continuer.');return;}
  ex.friction=next;changed();render();msg('Piste ajoutée au texte existant. Tu peux la reformuler, puis Enregistrer.');return;
 }
 if(action==='friction-analysis-export'){const a=connectedAi.result||ex.frictionAnalysis;if(a)download('analyse-frictions-ia.txt','text/plain;charset=utf-8',frictionAnalysisText(a));return;}
 if(action.startsWith('ai-')){aiPrompt=buildPrompt(ex,c,action.slice(3));render();const panel=$('#aiPrompt')?.closest('details');if(panel)panel.open=true;$('#aiPrompt')?.focus();msg('Consigne préparée localement. Relis et retire les données sensibles avant de l’utiliser dans un outil autorisé.');return;}
 if(action==='download-prompt'){if(aiPrompt)download('consigne-analyse-ia.txt','text/plain;charset=utf-8',aiPrompt);return;}
 if(action==='export-exploration'){if(!validExploration(ex)){msg('La fiche comporte un statut ou un champ invalide. Vérifier la fiche avant export.');return;}exportRows('exploration-transposition.csv',explorationRows(project));return;}
 if(action==='add-case'){if(ex.cases.length>=20)return;ex.cases.push(blankCase('uc_'+crypto.randomUUID().replaceAll('-','')));exploreSelected=ex.cases.length-1;aiPrompt='';changed();render();return;}
 if(action==='check-case'){const gaps=adoptionGaps(ex,c);msg(gaps.length?'Pour retenir ce cas au catalogue, compléter : '+gaps.join(' · '):'Fiche documentée pour une décision humaine. Choisis le statut approprié ; aucune autorisation n’est déduite.');return;}
 if(action==='case-to-benchmark'){
  const gaps=adoptionGaps(ex,c);if(c.decision!=='adopt'||gaps.length){msg('Fiche à compléter : '+gaps.join(' · '));return;}
  if(project.alternatives.some(x=>x.explorationCaseId===c.id)){msg('Une variante est déjà reliée à cette fiche.');return;}
  if(project.alternatives.length>=20){msg('20 variantes maximum par projet.');return;}
  const next=blankAlternative(c.title.slice(0,180)+' — à comparer');next.explorationCaseId=c.id;next.notes='Origine : benchmark intersectoriel · '+c.id+'\nSource : '+c.sourceUrl+' · '+c.sourceDate+'\nMécanisme : '+c.mechanism+'\nTransposition : '+c.transfer+'\nTest : '+c.test+'\nIndicateurs : '+c.metrics+'\nLes coûts et gains locaux restent à mesurer.';next.notes=next.notes.slice(0,12000);
  project.alternatives.push(next);selected=project.alternatives.length-1;changed();tab='benchmark';render();msg('Variante préparée avec des coûts à renseigner, sans gain ni note transférés. Ajoute une amélioration sans IA si elle répond au même besoin.');return;
 }

 if(action==='refresh'){if(validateForCalculation())render();return;}
 if(action==='add-alt')project.alternatives.push(blankAlternative());
 if(action==='add-cost')a[b.dataset.kind].push(blankRow());
 if(action==='remove-cost'&&confirm('Retirer ce poste de la copie de travail ?'))a[b.dataset.kind].splice(Number(b.dataset.index),1);
 if(action==='add-benefit')a.benefits.push(blankBenefit());
 if(action==='remove-benefit'&&confirm('Retirer cette activité ?'))a.benefits.splice(Number(b.dataset.index),1);
 if(action==='add-criterion'){
  const c={id:'c'+Date.now(),name:'Nouveau critère',weight:10,blocking:false};project.criteria.push(c);project.alternatives.forEach(a=>a.scores[c.id]={score:null,source:'',admissibility:'pending',evidence:'hypothesis'});
 }
 changed();render();
});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(validateForCalculation()){tab=b.dataset.tab;render();}}));
$('#demo')?.addEventListener('click',async()=>{if(!guard())return;try{const r=await fetch('assets/exemple.json');open(await r.json());msg('Exemple entièrement fictif : mesures, notes et décisions à renseigner.');}catch(e){msg(e.message);}});
function startProject(name='Nouveau projet'){if(!guard())return false;open(blankProject(name));changed();return true;}
$('#new').addEventListener('click',()=>startProject());
$('#home').addEventListener('click',home);$('#portfolioHome').addEventListener('click',home);
$('#importDocument').addEventListener('click',()=>{if(!user||role!=='editor'){msg('Connecte-toi avec un compte de rédaction pour importer un document.');const panel=$('.login-panel');panel.open=true;$('#login input').focus();return;}if(!guard())return;$('#initializationDocument').click();});
$('#initializationDocument').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const name=file.name.replace(/\.[^.]+$/,'').trim().slice(0,200)||'Nouveau projet';if(startProject(name)){sourceImport={...importInitial(),open:true};await importSourceDocument(file);}e.target.value='';});
$('#closeProject').addEventListener('click',()=>{if(!project||portfolioSaving||sourceImport.busy||connectedAi.busy)return;$('#lifecycleState').value=portfolioState(project)==='active'?'discarded':'active';$('#lifecycleReason').value='';$('#lifecycleError').textContent='';$('#lifecycleDialog').showModal();$('#lifecycleState').focus();});
$('#lifecycleCancel').addEventListener('click',()=>$('#lifecycleDialog').close());
$('#lifecycleForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!project||role!=='editor'||sourceImport.busy||connectedAi.busy)return;
 const next={...project.portfolio,state:$('#lifecycleState').value,reason:$('#lifecycleReason').value.trim(),date:new Date().toISOString().slice(0,10)};
 if(!validPortfolio(next)){$('#lifecycleError').textContent='Indique un motif pour écarter ou clôturer le projet (2 000 caractères maximum).';return;}
 const previous=project.portfolio;project.portfolio=next;portfolioSaving=true;$('#lifecycleApply').disabled=true;
 try{if(!validateProjectDocument())throw Error('Vérifier les champs du projet avant d’enregistrer son statut.');const d=await api('save',{id,version,data:project});({id,version}=d);dirty=false;projects=projects.filter(r=>r.id!==id);projects.push({id,version,data:clone(project)});portfolioSaving=false;$('#lifecycleDialog').close();home();msg('Statut enregistré. Le projet et ses versions sont conservés.');}
 catch(err){project.portfolio=previous;$('#lifecycleError').textContent=err.message;}finally{portfolioSaving=false;$('#lifecycleApply').disabled=false;}
});
$('#leaveStay').addEventListener('click',()=>$('#leaveDialog').close());
$('#leaveDiscard').addEventListener('click',()=>{dirty=false;$('#leaveDialog').close();home();});
$('#leaveSave').addEventListener('click',async()=>{if(!validateProjectDocument())return;portfolioSaving=true;$('#leaveSave').disabled=true;try{const d=await api('save',{id,version,data:project});({id,version}=d);dirty=false;projects=projects.filter(r=>r.id!==id);projects.push({id,version,data:clone(project)});portfolioSaving=false;$('#leaveDialog').close();home();msg('Projet enregistré.');}catch(err){$('#leaveError').textContent=err.message;}finally{portfolioSaving=false;$('#leaveSave').disabled=false;}});
$('#json').addEventListener('click',()=>{if(validateProjectDocument())download('projet-benchmark.json','application/json',JSON.stringify({format:'benchmark-finances-v1',exportedAt:new Date().toISOString(),data:project},null,2));});
$('#csv').addEventListener('click',()=>{if(validateProjectDocument())exportCsv();});
$('#print').addEventListener('click',()=>{if(!validateProjectDocument())return;tab='report';render();window.print();});
$('#save').addEventListener('click',async()=>{if(!validateProjectDocument())return;portfolioSaving=true;$('#content').inert=true;$('#save').disabled=true;try{const d=await api('save',{id,version,data:project});({id,version}=d);dirty=false;render();msg('Projet enregistré. Une version est conservée dans le journal.');await loadProjects();}catch(e){msg(e.message);}finally{portfolioSaving=false;$('#content').inert=false;$('#save').disabled=!user||role!=='editor';}});
$('#login').addEventListener('submit',async e=>{e.preventDefault();try{const f=new FormData(e.target),d=await api('login',{user:f.get('user'),password:f.get('password')});({user,role,csrf}=d);e.target.reset();account();await aiInfo();await loadProjects();msg('Connexion établie.');}catch(e){msg(e.message);}});
// Import uses an isolated candidate and a full structural guard before rendering.
function validImport(p){
 if(!validPortfolio(p?.portfolio))return false;
 if(p?.exploration!==undefined&&!validExploration(p.exploration))return false;
 const text=(v,n=20000)=>typeof v==='string'&&v.length<=n;
 const num=(v,min=0,max=1e12,opt=false)=>(opt&&(v===null||v===''))||(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max);
 const list=(a,max=100)=>Array.isArray(a)&&a.length<=max;
 const ev=r=>['hypothesis','quote','measured'].includes(r.evidence);
 const staff=r=>['police','civil','custom'].includes(r.group)&&num(r.rate,0,10000);
 if(!p||!text(p.name,200)||!p.name.trim()||!text(p.context)||!text(p.sources)||!text(p.status,300)||!Number.isInteger(p.years)||!num(p.years,1,10)||!num(p.discount,0,100)||!num(p.rates?.police,0,10000)||!num(p.rates?.civil,0,10000)||!list(p.criteria,30)||!p.criteria.length||!list(p.alternatives,20)||!p.alternatives.length)return false;
 const ids=new Set();
 for(const c of p.criteria){if(!c||!text(c.id,80)||!/^[a-zA-Z0-9_-]+$/.test(c.id)||['__proto__','constructor','prototype'].includes(c.id)||ids.has(c.id)||!text(c.name,200)||!num(c.weight,0,100)||typeof c.blocking!=='boolean')return false;ids.add(c.id);}
 if(p.criteria.reduce((s,c)=>s+c.weight,0)<=0)return false;
 return p.alternatives.every(a=>a&&(a.explorationCaseId===undefined||(text(a.explorationCaseId,80)&&p.exploration?.cases.some(c=>c.id===a.explorationCaseId)))&&text(a.name,200)&&text(a.notes)&&num(a.avoided)&&list(a.adoption,10)&&a.adoption.length===p.years&&a.adoption.every(v=>num(v,0,100))&&['initial','recurring'].every(k=>list(a[k])&&a[k].every(r=>r&&text(r.label,300)&&text(r.source,2000)&&num(r.amount)&&num(r.hours,0,1e7)&&staff(r)&&ev(r)))&&list(a.benefits)&&a.benefits.length&&a.benefits.every(r=>r&&text(r.label,300)&&text(r.source,2000)&&staff(r)&&ev(r)&&num(r.volume,0,1e10,true)&&['before','after','review'].every(k=>num(r[k],0,1e6,true))&&num(r.reuse,0,100)&&num(r.cash,0,100))&&a.scores&&p.criteria.every(c=>{const s=a.scores[c.id];return s&&num(s.score,1,5,true)&&text(s.source,3000)&&['pending','ok','blocked'].includes(s.admissibility)&&ev(s);}));
}
$('#import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1048576)throw Error('Fichier trop volumineux (1 Mo maximum).');const d=JSON.parse(await f.text()),p=d.data??d;if(!validImport(p))throw Error('Format de projet invalide.');if(guard()){open(p);changed();msg('Copie importée : enregistrer ou exporter pour conserver les changements.');}}catch(err){msg(err.message);}e.target.value='';});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
session();
