<?php
declare(strict_types=1);
final class SourceImportException extends RuntimeException {}
const SOURCE_IMPORT_MAX_BYTES=8388608;
function source_import_pdf_binary(): ?string {
 foreach(['/usr/bin/pdftotext','/usr/local/bin/pdftotext'] as $p)if(is_executable($p))return $p;
 return null;
}
function source_import_php_binary(): ?string {
 foreach([PHP_BINDIR.'/php','/usr/bin/php','/usr/local/bin/php'] as $p)if(is_executable($p))return $p;
 return null;
}
function source_import_pdf_reader_ready(): bool {
 return is_file(__DIR__.'/../vendor-pdf/autoload.php')&&is_file(__DIR__.'/pdf_reader.php');
}
function source_import_capabilities(): array {
 $formats=['txt'];if(class_exists(ZipArchive::class)&&class_exists(DOMDocument::class))$formats=['pptx','docx','txt'];
 if(source_import_pdf_reader_ready()||(source_import_pdf_binary()&&function_exists('proc_open')))$formats[]='pdf';
 return ['formats'=>$formats,'maxBytes'=>SOURCE_IMPORT_MAX_BYTES,'maxTextCharacters'=>100000,'sourceCharacters'=>24000,'ocr'=>is_file(__DIR__.'/../public/assets/vendor-ocr-v1/manifest.json')&&is_file(__DIR__.'/../public/assets/ocr-source.mjs')];
}
function source_import_clean(string $text): string {
 if(!mb_check_encoding($text,'UTF-8'))throw new SourceImportException('Le texte doit être encodé en UTF-8.');
 $text=str_replace(["\r\n","\r","\xEF\xBB\xBF"],["\n","\n",''],$text);
 $text=preg_replace('/[\x00-\x08\x0B\x0E-\x1F\x7F]/u','',$text);
 $text=preg_replace('/[ \t]+\n/u',"\n",$text);return trim(preg_replace('/\n{3,}/u',"\n\n",$text));
}
function source_import_xml(string $xml): DOMDocument {
 if(strlen($xml)>2097152||preg_match('/<!DOCTYPE|<!ENTITY/i',$xml))throw new SourceImportException('Structure XML non prise en charge.');
 $previous=libxml_use_internal_errors(true);$dom=new DOMDocument();
 try{if(!$dom->loadXML($xml,LIBXML_NONET|LIBXML_COMPACT))throw new SourceImportException('Le document contient un XML illisible.');}
 finally{libxml_clear_errors();libxml_use_internal_errors($previous);}
 return $dom;
}
function source_import_paragraphs(DOMDocument $dom,string $namespace,string $prefix): string {
 $xp=new DOMXPath($dom);$xp->registerNamespace($prefix,$namespace);$lines=[];
 foreach($xp->query('//'.$prefix.':p') as $p){
  $text='';foreach($xp->query('.//'.$prefix.':t | .//'.$prefix.':br | .//'.$prefix.':tab',$p) as $n)$text.=$n->localName==='t'?$n->textContent:($n->localName==='br'?"\n":"\t");
  if(trim($text)!=='')$lines[]=trim($text);
 }
 return source_import_clean(implode("\n",$lines));
}
function source_import_office(string $path,string $ext): array {
 if(!class_exists(ZipArchive::class)||!class_exists(DOMDocument::class))throw new SourceImportException('L’extraction Office n’est pas disponible sur ce serveur.');
 $zip=new ZipArchive();if($zip->open($path,ZipArchive::RDONLY)!==true)throw new SourceImportException('Document Office illisible, chiffré ou invalide.');
 try{
  if($zip->numFiles>2500)throw new SourceImportException('Archive Office trop complexe.');
  $total=0;for($i=0;$i<$zip->numFiles;$i++){$s=$zip->statIndex($i);$total+=(int)$s['size'];if($total>67108864)throw new SourceImportException('Archive Office décompressée trop volumineuse.');}
  $read=static function(string $entry)use($zip):string{
   $s=$zip->statName($entry);if(!$s||$s['size']>2097152||($s['encryption_method']??0)!==0)throw new SourceImportException('Partie Office absente, chiffrée ou trop volumineuse.');
   $v=$zip->getFromName($entry,2097153);if(!is_string($v)||strlen($v)>2097152)throw new SourceImportException('Partie Office illisible.');return $v;
  };
  if($zip->locateName('[Content_Types].xml')===false)throw new SourceImportException('Ce fichier n’est pas un document Office valide.');
  if($ext==='docx'){
   $text=source_import_paragraphs(source_import_xml($read('word/document.xml')),'http://schemas.openxmlformats.org/wordprocessingml/2006/main','w');
   return [['label'=>'Corps du document','text'=>$text]];
  }
  $presentation=source_import_xml($read('ppt/presentation.xml'));$relations=source_import_xml($read('ppt/_rels/presentation.xml.rels'));
  $map=[];foreach($relations->getElementsByTagName('Relationship') as $r){
   if($r->getAttribute('TargetMode')==='External')continue;
   $target=$r->getAttribute('Target');
   if(preg_match('~^(?:/ppt/)?slides/slide[0-9]+\.xml$~D',$target))$map[$r->getAttribute('Id')]=str_starts_with($target,'/')?substr($target,1):'ppt/'.$target;
  }
  $parts=[];$number=0;$characters=0;foreach($presentation->getElementsByTagNameNS('http://schemas.openxmlformats.org/presentationml/2006/main','sldId') as $id){
   $number++;if($number>100)throw new SourceImportException('Le PowerPoint dépasse 100 diapositives. Importe un document plus court.');
   $rid=$id->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
   if(!isset($map[$rid]))throw new SourceImportException('Relation de diapositive non prise en charge.');
   $dom=source_import_xml($read($map[$rid]));if($dom->documentElement->getAttribute('show')==='0')continue;
   $text=source_import_paragraphs($dom,'http://schemas.openxmlformats.org/drawingml/2006/main','a');
   $characters+=mb_strlen($text,'UTF-8');if($characters>100000)throw new SourceImportException('Le texte dépasse 100 000 caractères. Importe un document plus court.');
   if($text!=='')$parts[]=['label'=>'Diapositive '.$number,'text'=>$text];
  }
  return $parts;
 }finally{$zip->close();}
}
function source_import_pdf_system(string $path): array {
 $binary=source_import_pdf_binary();if(!$binary||!function_exists('proc_open'))throw new SourceImportException('Le PDF n’est pas pris en charge sur ce serveur. Utilise un fichier PowerPoint, Word ou TXT.');
 $pipes=[];$p=proc_open([$binary,'-layout','-enc','UTF-8','-f','1','-l','40',$path,'-'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 if(!is_resource($p))throw new SourceImportException('Extraction PDF indisponible.');
 fclose($pipes[0]);stream_set_blocking($pipes[1],false);stream_set_blocking($pipes[2],false);$raw='';$error='';$start=microtime(true);$exit=-1;
 try{
  do{$raw.=stream_get_contents($pipes[1]);$error.=stream_get_contents($pipes[2]);$state=proc_get_status($p);
   if(strlen($raw)>500000||strlen($error)>16000||microtime(true)-$start>12){proc_terminate($p,9);throw new SourceImportException('PDF trop long ou trop complexe pour une extraction rapide.');}
   if(!$state['running']){$exit=$state['exitcode'];break;}usleep(20000);
  }while(true);
  $raw.=stream_get_contents($pipes[1]);
 }finally{fclose($pipes[1]);fclose($pipes[2]);proc_close($p);}
 if($exit!==0)throw new SourceImportException('PDF illisible ou protégé. Déverrouille-le ou utilise une version texte.');
 $parts=[];foreach(explode("\f",$raw) as $i=>$text){$text=source_import_clean($text);if($text!=='')$parts[]=['label'=>'Page '.($i+1),'text'=>$text];}return $parts;
}
function source_import_pdf(string $path): array {
 if(!source_import_pdf_reader_ready())return ['parts'=>source_import_pdf_system($path),'totalPages'=>null,'limited'=>true,'emptyPages'=>[]];
 if(!function_exists('proc_open')||source_import_php_binary()===null){require_once __DIR__.'/pdf_reader.php';return source_import_pdf_parse($path);}
 $pipes=[];$p=proc_open([source_import_php_binary(),'-d','memory_limit=192M','-d','display_errors=0',__DIR__.'/pdf_extract_worker.php',$path],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 if(!is_resource($p))throw new SourceImportException('Extraction PDF indisponible.');
 fclose($pipes[0]);stream_set_blocking($pipes[1],false);stream_set_blocking($pipes[2],false);$raw='';$start=microtime(true);$exit=-1;
 try{
  do{
   $raw.=stream_get_contents($pipes[1]);stream_get_contents($pipes[2]);$state=proc_get_status($p);
   if(strlen($raw)>500000||microtime(true)-$start>20){proc_terminate($p,9);throw new SourceImportException('PDF trop long ou complexe pour l’extraction. Importe les pages utiles dans un fichier plus court.');}
   if(!$state['running']){$exit=$state['exitcode'];break;}usleep(20000);
  }while(true);
  $raw.=stream_get_contents($pipes[1]);
 }finally{fclose($pipes[1]);fclose($pipes[2]);proc_close($p);}
 if(strlen($raw)>500000)throw new SourceImportException('Texte PDF trop volumineux.');
 $data=json_decode($raw,true,32);
 if(!is_array($data))throw new SourceImportException('PDF trop complexe ou extraction interrompue. Importe un fichier plus court.');
 if(isset($data['error']))throw new SourceImportException((string)$data['error']);
 if($exit!==0||!isset($data['parts'],$data['totalPages'],$data['emptyPages'])||!is_array($data['parts'])||!is_array($data['emptyPages']))throw new SourceImportException('Extraction PDF incomplète.');
 return $data;
}
function source_import_extract(string $path,string $filename): array {
 if(!is_file($path)||filesize($path)<1||filesize($path)>SOURCE_IMPORT_MAX_BYTES)throw new SourceImportException('Choisis un document non vide de 8 Mo maximum.');
 $filename=basename(str_replace('\\','/',$filename));$filename=preg_replace('/[\x00-\x1F\x7F]/u','',$filename)??'';$filename=mb_substr($filename,0,180,'UTF-8');
 $ext=strtolower(pathinfo($filename,PATHINFO_EXTENSION));
 if(!in_array($ext,source_import_capabilities()['formats'],true))throw new SourceImportException('Format non pris en charge. Utilise un PowerPoint .pptx, Word .docx ou texte .txt (PDF si disponible).');
 $magic=file_get_contents($path,false,null,0,5);
 if(in_array($ext,['pptx','docx'],true)&&!str_starts_with($magic,"PK\x03\x04"))throw new SourceImportException('Le contenu ne correspond pas à un document Office.');
 if($ext==='pdf'&&!str_starts_with($magic,'%PDF-'))throw new SourceImportException('Le contenu ne correspond pas à un PDF.');
 $pdfInfo=$ext==='pdf'?source_import_pdf($path):null;
 $parts=match($ext){'pptx','docx'=>source_import_office($path,$ext),'pdf'=>$pdfInfo['parts'],default=>[['label'=>'Texte','text'=>source_import_clean(file_get_contents($path))]]};
 $parts=array_values(array_filter($parts,fn($r)=>$r['text']!==''));$total=0;
 foreach($parts as $r){$total+=mb_strlen($r['text'],'UTF-8');if($total>100000)throw new SourceImportException('Le texte dépasse 100 000 caractères. Importe un extrait plus court du document.');}
 if(!$parts)throw new SourceImportException('Aucun texte exploitable trouvé. Utilise la lecture OCR pour les images et documents scannés.');
 $text=implode("\n\n",array_map(fn($r)=>'['.$r['label']."]\n".$r['text'],$parts));
 $warnings=['Vérifie l’ordre de lecture et les titres : une disposition en colonnes peut être extraite dans un autre ordre. Les images et schémas ne sont pas interprétés.'];
 if($ext==='pptx')$warnings[]='Seul le texte des diapositives visibles est extrait ; notes du présentateur, commentaires et diapositives masquées sont exclus.';
 if($ext==='docx')$warnings[]='Seul le corps du document est extrait ; commentaires, en-têtes et pieds de page sont exclus. Les annotations de révision peuvent apparaître : vérifie le texte.';
 if($ext==='pdf'){
  $warnings[]='Vérifie le texte extrait : les colonnes, tableaux et encadrés peuvent être lus dans un ordre différent de celui de la page. Les images ne sont pas interprétées.';
  if($pdfInfo['limited'])$warnings[]='Extraction limitée aux 40 premières pages'.($pdfInfo['totalPages']?' sur '.$pdfInfo['totalPages']:'').' du PDF. Importe séparément les autres pages utiles.';
  if($pdfInfo['emptyPages'])$warnings[]='Pages sans texte extractible (vides ou scannées), non analysées : '.implode(', ',$pdfInfo['emptyPages']).'. Une reconnaissance OCR est nécessaire pour lire un scan.';
 }
 return ['filename'=>$filename,'format'=>$ext,'sha256'=>hash_file('sha256',$path),'parts'=>$parts,'text'=>$text,'characters'=>mb_strlen($text,'UTF-8'),'reference'=>$filename.' · '.(count($parts)===1?$parts[0]['label']:count($parts).' parties extraites'),'warnings'=>$warnings];
}
