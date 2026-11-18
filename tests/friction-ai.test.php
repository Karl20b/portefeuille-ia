<?php
declare(strict_types=1);
require __DIR__.'/../src/friction_ai.php';
function check(bool $v,string $name):void{if(!$v)throw new RuntimeException($name);echo 'OK '.$name.PHP_EOL;}
function rejected(callable $fn,string $name):void{try{$fn();}catch(InvalidArgumentException|FrictionAiException){check(true,$name);return;}throw new RuntimeException('Expected rejection: '.$name);}
$context=['name'=>'Préparation RH','context'=>'Les cadres préparent des entretiens en consultant leurs anciens supports de formation.','friction'=>'Les documents sont dispersés, temps de recherche non mesuré.','strategy'=>'Qualité du management','baseline'=>'Déclaration du porteur, observation à réaliser','users'=>'Cadres et DRH'];
check(friction_ai_context($context)===$context+['sourceReference'=>'','sourceExcerpt'=>''],'Contexte conservé ; source optionnelle vide par défaut');
rejected(fn()=>friction_ai_context($context+['password'=>'secret']),'Champs supplémentaires refusés');
rejected(fn()=>friction_ai_context(['friction'=>'Court']),'Contexte vide ou trop court refusé');
rejected(fn()=>friction_ai_context(array_replace($context,['context'=>str_repeat('x',6001)])),'Contexte borné');
$method=friction_ai_method();$cards=friction_ai_retrieve($context,$method);
check(in_array('APP-RH',array_column($cards,'id'),true),'Complément RH récupéré');
$general=['name'=>'Maintenance machines','context'=>'Des techniciens recherchent des documents de maintenance.','friction'=>'Recherche documentaire longue à objectiver','strategy'=>'Qualité','baseline'=>'À observer','users'=>'Techniciens'];
check(!in_array('APP-RH',array_column(friction_ai_retrieve($general,$method),'id'),true),'Projet non RH sans contexte RH importé');
$system=friction_ai_system($method,$cards);
check(str_contains($system,'N’invente aucun')&&str_contains($system,'pas une instruction')&&str_contains($system,'Pas de recherche web'),'Règles de preuve, frontière données et limites de recherche');
$safe=['friction_ai'=>['enabled'=>true,'endpoint'=>'https://api.infomaniak.com/2/ai/123/openai/v1/chat/completions','api_key'=>'test-only','model'=>'test-model']];
check(friction_ai_config($safe)['model']==='test-model','Configuration explicite valide');
foreach(['http://api.infomaniak.com/2/ai/123/openai/v1/chat/completions','https://evil.example/2/ai/123/openai/v1/chat/completions','https://api.infomaniak.com/2/ai/123/openai/v1/chat/completions?token=x'] as $url)rejected(fn()=>friction_ai_config(['friction_ai'=>array_replace($safe['friction_ai'],['endpoint'=>$url])]),'Endpoint non autorisé refusé');
$state=friction_ai_reserve([],2000000000);check($state['count']===1,'Tentative réservée');
rejected(fn()=>friction_ai_reserve($state,2000000001),'Double clic limité');
rejected(fn()=>friction_ai_reserve(['day'=>gmdate('Y-m-d',2000000000),'count'=>20,'last'=>0],2000000000),'Quota journalier limité');
check(friction_ai_reserve(['day'=>'2000-01-01','count'=>20,'last'=>0],2000000000)['count']===1,'Quota renouvelé au jour UTC suivant');
$f=array_fill_keys(['title','problem','step','people','effect','evidence','question','observation','measurement','overlap'],'À vérifier');$f['category']='Perte de temps';
$r=['summary'=>'Exemple de test','declared'=>[],'frictions'=>[$f,$f,$f],'priorityQuestions'=>['Qui ?','Où ?','Quand ?'],'missing'=>['Durée observée']];
check(friction_ai_report($r)===$r,'Rapport structuré accepté');
rejected(fn()=>friction_ai_report($r+['html'=>'<script>']),'Champs IA inattendus refusés');
rejected(fn()=>friction_ai_report(array_replace($r,['frictions'=>[]])),'Rapport IA incomplet refusé');
check(friction_ai_hash($context)===friction_ai_hash(array_reverse($context,true)),'Empreinte déterministe');
$single=array_replace($r,['frictions'=>[$f]]);check(count(friction_ai_report($single)['frictions'])===1,'Une seule frustration recevable sans remplissage artificiel');
$sourceContext=friction_ai_context(['sourceReference'=>'Entretien anonymisé, note 1','sourceExcerpt'=>'Dit : Je recherche la bonne procédure dans plusieurs dossiers. Fait : consulte deux classeurs. Pense (interprétation du rédacteur) : peur de se tromper.']);
check($sourceContext['friction']==='','Analyse possible à partir de la seule source');
$ground=$single;$ground['frictions'][0]['sourceQuote']='Je recherche la bonne procédure dans plusieurs dossiers.';$ground['frictions'][0]['sourceRef']='Référence inventée';$ground=friction_ai_ground_quotes($ground,$sourceContext);
check($ground['frictions'][0]['quoteVerified']&&$ground['frictions'][0]['sourceRef']===$sourceContext['sourceReference'],'Citation contrôlée par présence exacte et référence fournie');
$ground['frictions'][0]['sourceQuote']='Citation jamais prononcée';$ground=friction_ai_ground_quotes($ground,$sourceContext);
check(!$ground['frictions'][0]['quoteVerified']&&$ground['frictions'][0]['sourceQuote']===''&&$ground['frictions'][0]['basis']==='hypothesis','Citation non présente retirée et piste reclassée en hypothèse');
$ids=array_column(friction_ai_retrieve($sourceContext,$method),'id');check(in_array('M3-EMPATHIE',$ids,true)&&in_array('M3-OPPORTUNITE',$ids,true),'Repères empathie et opportunité récupérés');
$props=friction_ai_schema()['schema']['properties']['frictions'];check($props['minItems']===1&&isset($props['items']['properties']['opportunity']),'Schéma acceptant une friction avec question d’opportunité');
echo 'Tous les contrôles IA sont passés sans appel fournisseur.'.PHP_EOL;
