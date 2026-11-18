<?php
declare(strict_types=1);
function txt(mixed $v,int $max=12000): bool {return is_string($v) && strlen($v)<=$max;}
function num(mixed $v,float $min=0,float $max=1e12,bool $optional=false): bool {
 return ($optional && ($v===null||$v==='')) || ((is_int($v)||is_float($v))&&is_finite((float)$v)&&$v>=$min&&$v<=$max);
}
function rows(mixed $v,int $max=100): bool {return is_array($v)&&array_is_list($v)&&count($v)<=$max;}
function require_valid(bool $ok): void {if(!$ok) throw new InvalidArgumentException('Données invalides : vérifier les nombres, les champs et les limites.');}
function validate_project(array $p): void {
 if(array_key_exists('portfolio',$p))validate_portfolio($p['portfolio']);
 if(array_key_exists('exploration',$p)){require_valid(is_array($p['exploration']));validate_exploration($p['exploration']);}
 require_valid(txt($p['name']??null,200)&&trim($p['name'])!==''&&txt($p['context']??null)&&txt($p['status']??null,300)&&txt($p['sources']??null,20000));
 require_valid(num($p['years']??null,1,10)&&is_int($p['years'])&&num($p['discount']??null,0,100));
 foreach(['police','civil'] as $g)require_valid(num($p['rates'][$g]??null,0,10000));
 require_valid(rows($p['criteria']??null,30)&&count($p['criteria'])>0&&rows($p['alternatives']??null,20)&&count($p['alternatives'])>0);
 $ids=[];$total=0;
 foreach($p['criteria'] as $c){
  require_valid(is_array($c)&&txt($c['id']??null,80)&&preg_match('/^[a-zA-Z0-9_-]+$/D',$c['id'])===1&&!isset($ids[$c['id']])&&txt($c['name']??null,200)&&num($c['weight']??null,0,100)&&is_bool($c['blocking']??null));
  require_valid(!in_array($c['id'],['__proto__','constructor','prototype'],true));
  $ids[$c['id']]=true;$total+=$c['weight'];
 }
 require_valid($total>0);
 foreach($p['alternatives'] as $a){
  if(isset($a['explorationCaseId'])){require_valid(txt($a['explorationCaseId'],80)&&is_array($p['exploration']['cases']??null)&&in_array($a['explorationCaseId'],array_column($p['exploration']['cases'],'id'),true));}
  require_valid(is_array($a)&&txt($a['name']??null,200)&&txt($a['notes']??null)&&num($a['avoided']??null)&&rows($a['adoption']??null,10)&&count($a['adoption'])===$p['years']);
  foreach($a['adoption'] as $v)require_valid(num($v,0,100));
  foreach(['initial','recurring'] as $k){
   require_valid(rows($a[$k]??null));
   foreach($a[$k] as $r){
    require_valid(is_array($r)&&txt($r['label']??null,300)&&num($r['amount']??null)&&num($r['hours']??null,0,1e7)&&in_array($r['group']??null,['police','civil','custom'],true)&&num($r['rate']??null,0,10000)&&txt($r['source']??null,2000)&&in_array($r['evidence']??null,['hypothesis','quote','measured'],true));
   }
  }
  require_valid(rows($a['benefits']??null)&&count($a['benefits'])>0);
  foreach($a['benefits'] as $r){
   require_valid(is_array($r)&&txt($r['label']??null,300)&&in_array($r['group']??null,['police','civil','custom'],true)&&num($r['rate']??null,0,10000)&&num($r['volume']??null,0,1e10,true)&&num($r['before']??null,0,1e6,true)&&num($r['after']??null,0,1e6,true)&&num($r['review']??null,0,1e6,true)&&num($r['reuse']??null,0,100)&&num($r['cash']??null,0,100)&&txt($r['source']??null,2000)&&in_array($r['evidence']??null,['hypothesis','quote','measured'],true));
  }
  require_valid(is_array($a['scores']??null));
  foreach($p['criteria'] as $c){$s=$a['scores'][$c['id']]??null;
   require_valid(is_array($s)&&num($s['score']??null,1,5,true)&&txt($s['source']??null,3000)&&in_array($s['admissibility']??null,['pending','ok','blocked'],true)&&in_array($s['evidence']??null,['hypothesis','quote','measured'],true));
  }
 }
}

function valid_exploration_date(mixed $v): bool {
 if(!is_string($v))return false;
 if($v==='')return true;
 if(preg_match('/^(\d{4})-(\d{2})-(\d{2})$/D',$v,$m)!==1)return false;
 return checkdate((int)$m[2],(int)$m[3],(int)$m[1]);
}
function valid_exploration_url(mixed $v): bool {
 if(!is_string($v)||strlen($v)>12000||!filter_var($v,FILTER_VALIDATE_URL))return false;
 $u=parse_url($v);return is_array($u)&&in_array($u['scheme']??'', ['http','https'],true)&&!empty($u['host'])&&!isset($u['user'])&&!isset($u['pass']);
}
function validate_exploration(array $e): void {
 if(isset($e['approach']))require_valid(in_array($e['approach'],['undecided','internal','external','compare'],true));
 if(isset($e['approachNotes']))require_valid(txt($e['approachNotes']));
 if(isset($e['sourceMaterial'])){require_valid(is_array($e['sourceMaterial'])&&txt($e['sourceMaterial']['reference']??null,1000)&&txt($e['sourceMaterial']['excerpt']??null,96000)&&mb_strlen($e['sourceMaterial']['excerpt'],'UTF-8')<=24000);}
 if(isset($e['frictionAnalysis'])){
  $a=$e['frictionAnalysis'];require_valid(is_array($a));
  foreach(['generatedAt','provider','model','methodVersion','contextHash'] as $k)require_valid(txt($a[$k]??null,300));
  require_valid(preg_match('/^[a-f0-9]{64}$/D',$a['contextHash'])===1&&rows($a['references']??null,10));
  foreach($a['references'] as $r){require_valid(is_array($r));foreach(['id','title','source'] as $k)require_valid(txt($r[$k]??null,2000));}
  require_once __DIR__.'/friction_ai.php';
  try{friction_ai_report($a['report']??null);}catch(FrictionAiException){require_valid(false);}
 }
 foreach(['friction','strategy','baseline','users','methodLog'] as $k)require_valid(txt($e[$k]??null));
 require_valid(rows($e['cases']??null,20));$ids=[];
 foreach($e['cases'] as $c){
  require_valid(is_array($c)&&txt($c['id']??null,80)&&preg_match('/^[a-zA-Z0-9_-]+$/D',$c['id'])===1&&!isset($ids[$c['id']]));$ids[$c['id']]=true;
  foreach(['title','organisation','sector','sourceUrl','sourceDate','checkedOn','sourceNotes','mechanism','transfer','limits','test','metrics','decisionDate','reason','reviewSignal','reviewDate','validator','aiNotes'] as $k)require_valid(txt($c[$k]??null,in_array($k,['title','organisation','sector','validator'],true)?300:12000));
  foreach(['sourceDate','checkedOn','decisionDate','reviewDate'] as $k)require_valid(valid_exploration_date($c[$k]));
  if(array_key_exists('benchmarkType',$c))require_valid(in_array($c['benchmarkType'],['','functional','generic'],true));
  if(array_key_exists('analysisDate',$c))require_valid(valid_exploration_date($c['analysisDate']));
  require_valid($c['sourceUrl']===''||valid_exploration_url($c['sourceUrl']));
  require_valid(txt($c['secondaryDomain']??null,20));
  $domains=['analytical','perceptive','generative','agentic'];
  require_valid((($c['domain']??null)===''||in_array($c['domain']??null,$domains,true))&&($c['secondaryDomain']===''||in_array($c['secondaryDomain']??null,$domains,true))&&(($c['circle']??null)===''||in_array($c['circle']??null,['efficiency','service','ecosystem','innovation'],true))&&in_array($c['decision']??null,['draft','adopt','watch','discard'],true)&&in_array($c['proof']??null,['unverified','announcement','pilot','experience','measured','historical'],true));
  require_valid(is_array($c['dependencies']??null)&&is_array($c['evaluation']??null));
  foreach(['data','systems','skills','regulation'] as $k)require_valid(txt($c['dependencies'][$k]??null));
  foreach(['maturity','relevance','entryCost','reversibility','horizon'] as $k)require_valid(txt($c['evaluation'][$k]??null));
  if(in_array($c['decision'],['watch','discard','adopt'],true)){foreach(['reason','decisionDate','validator'] as $k)require_valid(trim($c[$k])!=='');}
  if($c['decision']==='watch')require_valid(trim($c['reviewSignal'])!=='');
  if($c['decision']==='adopt'){
   require_valid(in_array($c['domain'],$domains,true)&&in_array($c['circle'],['efficiency','service','ecosystem','innovation'],true));
   foreach(['friction','strategy','baseline','users'] as $k)require_valid(trim($e[$k])!=='');
   foreach(['title','organisation','sector','sourceDate','checkedOn','sourceNotes','mechanism','transfer','limits','test','metrics'] as $k)require_valid(trim($c[$k])!=='');
   require_valid(valid_exploration_url($c['sourceUrl'])&&in_array($c['proof'],['announcement','pilot','experience','measured','historical'],true));
   if(in_array($c['proof'],['announcement','pilot'],true))require_valid(trim($c['reviewSignal'])!=='');
   foreach($c['dependencies'] as $value)require_valid(is_string($value)&&trim($value)!=='');
   foreach($c['evaluation'] as $value)require_valid(is_string($value)&&trim($value)!=='');
  }
 }
}

function validate_portfolio(mixed $v): void {
 require_valid(is_array($v)&&!array_is_list($v)&&in_array($v['state']??null,['active','discarded','closed'],true)&&txt($v['reason']??null,8000)&&mb_strlen($v['reason'],'UTF-8')<=2000&&is_string($v['date']??null));
 $date=DateTimeImmutable::createFromFormat('!Y-m-d',$v['date']);require_valid($date!==false&&$date->format('Y-m-d')===$v['date']);
 require_valid($v['state']==='active'||trim($v['reason'])!=='');
 if(isset($v['priority']))require_valid(is_int($v['priority'])&&$v['priority']>=1&&$v['priority']<=100);
}
