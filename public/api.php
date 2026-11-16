<?php
declare(strict_types=1);
require __DIR__.'/../src/validation.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
function respond(array $data,int $code=200): never {http_response_code($code);echo json_encode($data,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);exit;}
if(!is_file(__DIR__.'/../config/config.local.php'))respond(['error'=>'Installation à configurer. Aucun accès à une base.'],503);
$config=require __DIR__.'/../config/config.local.php';
if(!str_starts_with((string)($config['origin']??''),'https://'))respond(['error'=>'Origine HTTPS à configurer.'],503);
ini_set('session.use_strict_mode','1');
session_name('bf_session');
session_set_cookie_params(['httponly'=>true,'secure'=>true,'samesite'=>'Strict','path'=>'/']);
session_start();
$method=$_SERVER['REQUEST_METHOD'];
if(isset($_SESSION['last'])&&time()-$_SESSION['last']>1800){$_SESSION=[];session_regenerate_id(true);}
$_SESSION['csrf']??=bin2hex(random_bytes(32));
$action=$_GET['action']??'session';
try {
 if($method==='POST'){
  if(($_SERVER['HTTP_ORIGIN']??'')!==$config['origin'] || !hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))respond(['error'=>'Session ou origine invalide. Recharge la page.'],403);
  if((int)($_SERVER['CONTENT_LENGTH']??0)>1048576)respond(['error'=>'Document trop volumineux.'],413);
  $raw=file_get_contents('php://input',false,null,0,1048577);
  if(strlen($raw)>1048576)respond(['error'=>'Document trop volumineux.'],413);
  $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
  if(!is_array($input))respond(['error'=>'Requête invalide.'],400);
 }
 if($action==='session'&&$method==='GET')respond(['user'=>$_SESSION['user']??null,'role'=>$_SESSION['role']??null,'csrf'=>$_SESSION['csrf']]);
 if($action==='login'&&$method==='POST'){
  $user=$input['user']??'';$password=$input['password']??'';
  if(!txt($user,80)||!txt($password,1000))respond(['error'=>'Identifiants invalides.'],400);
  // A private, locked file enforces rate limiting across concurrent requests.
  $key=hash('sha256',($_SERVER['REMOTE_ADDR']??'unknown'));
  $lock=fopen($config['throttle_dir'].'/login-'.$key.'.json','c+');
  if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Throttle unavailable');
  $attempt=json_decode(stream_get_contents($lock),true)?:['start'=>time(),'count'=>0];
  if(time()-$attempt['start']>900)$attempt=['start'=>time(),'count'=>0];
  if($attempt['count']>=10){flock($lock,LOCK_UN);fclose($lock);respond(['error'=>'Trop de tentatives. Réessayer dans 15 minutes.'],429);}
  $account=$config['accounts'][$user]??null;
  // Fixed dummy hash avoids skipping the password computation for unknown accounts.
  $hash=$account['hash']??'$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';
  $ok=password_verify($password,$hash)&&$account&&in_array($account['role'],['reader','editor'],true);
  $attempt['count']=$ok?0:$attempt['count']+1;
  ftruncate($lock,0);rewind($lock);fwrite($lock,json_encode($attempt,JSON_THROW_ON_ERROR));fflush($lock);flock($lock,LOCK_UN);fclose($lock);
  if(!$ok)respond(['error'=>'Identifiant ou mot de passe incorrect.'],401);
  session_regenerate_id(true);$_SESSION=['user'=>$user,'role'=>$account['role'],'last'=>time(),'csrf'=>bin2hex(random_bytes(32))];
  respond(['user'=>$user,'role'=>$account['role'],'csrf'=>$_SESSION['csrf']]);
 }
 if(!isset($_SESSION['user']))respond(['error'=>'Connexion nécessaire.'],401);
 $_SESSION['last']=time();
 if($action==='logout'&&$method==='POST'){$_SESSION=[];session_regenerate_id(true);respond(['ok'=>true]);}
 if(!in_array($action,['projects','save'],true))respond(['error'=>'Action inconnue.'],404);
 if($action==='save'&&($method!=='POST'||$_SESSION['role']!=='editor'))respond(['error'=>'Écriture non autorisée.'],403);
 // Connection starts only after authenticated, supported requests.
 $db=new PDO($config['dsn'],$config['user'],$config['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
 if($action==='projects'&&$method==='GET'){
  $result=$db->query('SELECT id,version,document,updated_at FROM bf_projects ORDER BY updated_at DESC')->fetchAll(PDO::FETCH_ASSOC);
  respond(['projects'=>array_map(fn($r)=>['id'=>$r['id'],'version'=>(int)$r['version'],'updated_at'=>$r['updated_at'],'data'=>json_decode($r['document'],true,32,JSON_THROW_ON_ERROR)],$result)]);
 }
 if($action==='save'){
  $p=$input['data']??null;if(!is_array($p))respond(['error'=>'Projet manquant.'],422);validate_project($p);
  $id=$input['id']??null;$version=$input['version']??0;
  if(!is_int($version)||$version<0||($id!==null&&(!txt($id,32)||!preg_match('/^[a-f0-9]{32}$/D',$id))))respond(['error'=>'Version invalide.'],422);
  $json=json_encode($p,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
  $db->beginTransaction();
  if($id===null){$id=bin2hex(random_bytes(16));$newVersion=1;$q=$db->prepare('INSERT INTO bf_projects (id,version,document) VALUES (?,?,?)');$q->execute([$id,1,$json]);}
  else {$newVersion=$version+1;$q=$db->prepare('UPDATE bf_projects SET document=?,version=? WHERE id=? AND version=?');$q->execute([$json,$newVersion,$id,$version]);if($q->rowCount()!==1){$db->rollBack();respond(['error'=>'Une autre fenêtre a modifié ce projet. Exporte ta copie JSON puis recharge.'],409);}}
  $q=$db->prepare('INSERT INTO bf_events (project_id,author,version,document) VALUES (?,?,?,?)');$q->execute([$id,$_SESSION['user'],$newVersion,$json]);$db->commit();
  respond(['id'=>$id,'version'=>$newVersion]);
 }
 respond(['error'=>'Méthode non prise en charge.'],405);
} catch(InvalidArgumentException|JsonException $e){respond(['error'=>'Données invalides. Vérifier les champs.'],422);}
catch(Throwable $e){if(isset($db)&&$db->inTransaction())$db->rollBack();error_log('Benchmark finance: '.$e::class);respond(['error'=>'Service indisponible. Aucun enregistrement confirmé.'],503);}
