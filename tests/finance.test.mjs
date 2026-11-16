import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculate,benchmark} from '../public/assets/finance.mjs';
const seed=JSON.parse(await readFile(new URL('../public/assets/exemple.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(seed);
let checks=0;
function check(name,fn){fn();checks++;console.log('OK '+name);}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function measured(){const p=copy(),a=p.alternatives[0];a.benefits[0].before=10;a.benefits[0].after=6;a.benefits[0].review=1;a.adoption=[100,100,100];return [p,a];}
check('Exemple sans mesure : aucun gain ou ROI inventé',()=>{const r=calculate(seed,seed.alternatives[0]);assert.equal(r.initial,2200);assert.equal(r.annual,1200);assert.equal(r.tco,5800);assert.equal(r.roi,null);assert.equal(r.npv,null);});
check('Trois minutes nettes : 50 heures et 4000 CHF',()=>{const [p,a]=measured(),r=calculate(p,a);assert.equal(r.hours,50);assert.equal(r.value,4000);assert.equal(r.rows[0].net,2800);near(r.payback,2200/2800*12);});
check('Capacité libérée distincte de la trésorerie',()=>{const [p,a]=measured(),r=calculate(p,a);assert.equal(r.rows[0].cashNet,-240);assert.equal(r.rows.at(-1).cumulativeCash,-1720);});
check('Conversion salariale explicite',()=>{const [p,a]=measured();a.benefits[0].cash=10;assert.equal(calculate(p,a).rows[0].cashNet,160);});
check('Taux spécifique',()=>{const [p,a]=measured();a.benefits[0].group='custom';a.benefits[0].rate=90;assert.equal(calculate(p,a).value,4500);});
check('Adoption progressive avec coûts constants',()=>{const [p,a]=measured();a.adoption=[0,50,100];const r=calculate(p,a);assert.equal(r.rows[0].net,-1200);assert.equal(r.rows[1].gross,2000);assert.equal(r.threshold,null);});
check('Pertes de temps conservées',()=>{const [p,a]=measured();a.benefits[0].review=5;const r=calculate(p,a);near(r.hours,-1000/60);assert.equal(r.payback,null);assert.ok(r.roi<0);});
check('Temps inutilisable : aucun bénéfice',()=>{const [p,a]=measured();a.benefits[0].reuse=0;assert.equal(calculate(p,a).value,0);});
check('Champ vide : mesure incomplète',()=>{const [p,a]=measured();a.benefits[0].review='';assert.equal(calculate(p,a).complete,false);});
check('Actualisation des flux en fin d’année',()=>{const [p,a]=measured();p.discount=10;near(calculate(p,a).npv,-2200+2800/1.1+2800/1.1**2+2800/1.1**3);});
check('Dépense supprimée comptée une seule fois',()=>{const [p,a]=measured();a.avoided=100;const r=calculate(p,a);assert.equal(r.rows[0].gross,4100);assert.equal(r.rows[0].cashGross,100);});
check('Score incomplet sans notes',()=>assert.equal(benchmark(seed.alternatives[0],seed).score,null));
check('Score élevé sans levée du blocage',()=>{const p=copy(),a=p.alternatives[0];p.criteria.forEach(c=>a.scores[c.id].score=5);a.scores.data.admissibility='blocked';const r=benchmark(a,p);assert.equal(r.score,5);assert.equal(r.blocked,true);});
check('Pondération normalisée',()=>{const p=copy(),a=p.alternatives[0];p.criteria.forEach(c=>{c.weight=10;a.scores[c.id].score=3;});assert.equal(benchmark(a,p).score,3);});
console.log(`${checks} contrôles financiers réussis.`);
