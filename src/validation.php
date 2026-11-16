<?php
declare(strict_types=1);
function txt(mixed $v,int $max=12000): bool {return is_string($v) && strlen($v)<=$max;}
function num(mixed $v,float $min=0,float $max=1e12,bool $optional=false): bool {
 return ($optional && ($v===null||$v==='')) || ((is_int($v)||is_float($v))&&is_finite((float)$v)&&$v>=$min&&$v<=$max);
}
function rows(mixed $v,int $max=100): bool {return is_array($v)&&array_is_list($v)&&count($v)<=$max;}
function require_valid(bool $ok): void {if(!$ok) throw new InvalidArgumentException('Données invalides : vérifier les nombres, les champs et les limites.');}
function validate_project(array $p): void {
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
