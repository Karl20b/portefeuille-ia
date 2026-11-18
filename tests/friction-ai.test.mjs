import assert from 'node:assert/strict';
import {aiContext,validFrictionAnalysis,frictionAnalysisView,frictionAnalysisText} from '../public/assets/friction-ai.mjs';
import {validExploration,blankExploration} from '../public/assets/explore.mjs';
const p={name:'Projet maintenance',context:'Recherche de notices',password:'secret',sources:'document privé',exploration:{...blankExploration(),friction:'Recherche longue',users:'Techniciens'}};
assert.deepEqual(Object.keys(aiContext(p)),['name','context','friction','strategy','baseline','users','sourceReference','sourceExcerpt']);assert(!JSON.stringify(aiContext(p)).includes('secret'));assert(!JSON.stringify(aiContext(p)).includes('document privé'));
const f=Object.fromEntries(['title','problem','step','people','effect','evidence','question','observation','measurement','overlap'].map(k=>[k,'<img src=x onerror=alert(1)>']));f.category='Perte de temps';
const a={generatedAt:'2026-11-18T18:00:00Z',provider:'Infomaniak',model:'test',methodVersion:'test',contextHash:'a'.repeat(64),references:[{id:'M3-FRICTION',title:'Méthode',source:'Test local'}],report:{summary:'Recherche à objectiver',declared:[],frictions:[f,f,f],priorityQuestions:['Qui ?','Où ?','Quand ?'],missing:['Chronométrage']}};
assert(validFrictionAnalysis(a));assert(validExploration({...blankExploration(),frictionAnalysis:a}));
assert(!validFrictionAnalysis({...a,contextHash:'invalid'}));assert(!validExploration({...blankExploration(),frictionAnalysis:{}}));
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=frictionAnalysisView(a,esc,{actions:true});assert(!view.includes('<img'));assert(view.includes('&lt;img'));assert(view.includes('friction-use'));assert(!frictionAnalysisView(a,esc).includes('friction-use'));assert(frictionAnalysisText(a).includes('BROUILLON IA'));assert(frictionAnalysisText(a).includes('pas des preuves terrain'));
console.log('Contexte minimal, validation des analyses enregistrées et rendu HTML sans injection : OK.');

const withSource=structuredClone(a);withSource.report.frictions=[{...f,opportunity:'Comment pourrions-nous retrouver la procédure pour les cadres lors de la préparation ?',basis:'declared',sourceRef:'Note 1',sourceQuote:'<script>alert(1)</script>',quoteVerified:true}];
assert(validFrictionAnalysis(withSource));assert(validExploration({...blankExploration(),sourceMaterial:{reference:'Note 1',excerpt:'Source autorisée'},frictionAnalysis:withSource}));
assert(!validExploration({...blankExploration(),sourceMaterial:{reference:'Note 1',excerpt:'x'.repeat(24001)}}));
const sourceView=frictionAnalysisView(withSource,esc);assert(sourceView.includes('Question d’opportunité'));assert(sourceView.includes('&lt;script&gt;'));assert(!sourceView.includes('<script>'));assert(frictionAnalysisText(withSource).includes('Question d’opportunité'));
