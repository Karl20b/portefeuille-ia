<?php
declare(strict_types=1);
require __DIR__.'/../src/source_import.php';
function pdf_ok(bool $v,string $s):void{if(!$v)throw new RuntimeException($s);echo 'OK '.$s.PHP_EOL;}
function pdf_no(callable $f,string $s):void{try{$f();}catch(SourceImportException){pdf_ok(true,$s);return;}throw new RuntimeException('Expected rejection: '.$s);}
// Minimal synthetic PDF fixtures, not user documents or presentation artifacts.
function pdf_fixture(array $pages):string{
 $objects=[1=>'<< /Type /Catalog /Pages 2 0 R >>',2=>'',3=>'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];$kids=[];
 foreach($pages as $i=>$text){$id=4+$i*2;$kids[]=$id.' 0 R';$text=str_replace(['\\','(',')'],['\\\\','\\(','\\)'],$text);$stream=$text===''?'':"BT /F1 12 Tf 40 700 Td (".$text.") Tj ET";$objects[$id]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '.($id+1).' 0 R >>';$objects[$id+1]='<< /Length '.strlen($stream).">>\nstream\n".$stream."\nendstream";}
 $objects[2]='<< /Type /Pages /Count '.count($pages).' /Kids ['.implode(' ',$kids).'] >>';ksort($objects);$out="%PDF-1.4\n";$offsets=[];
 foreach($objects as $i=>$body){$offsets[$i]=strlen($out);$out.=$i." 0 obj\n".$body."\nendobj\n";}
 $start=strlen($out);$out.='xref' . "\n0 ".(count($objects)+1)."\n0000000000 65535 f \n";foreach($offsets as $offset)$out.=sprintf("%010d 00000 n \n",$offset);return $out.'trailer' . "\n<< /Size ".(count($objects)+1)." /Root 1 0 R >>\nstartxref\n".$start."\n%%EOF\n";
}
$dir=sys_get_temp_dir().'/pdf-import-'.bin2hex(random_bytes(6));mkdir($dir,0700);$paths=[];
try{
 pdf_ok(in_array('pdf',source_import_capabilities()['formats'],true),'PDF proposé sur cette installation');
 $write=static function($name,$data)use($dir,&$paths){$p=$dir.'/'.$name;file_put_contents($p,$data);$paths[]=$p;return $p;};
 $p=$write('entretien-fictif.pdf',pdf_fixture(['Interview note: I search for the current procedure in several folders.','Observation: repeated manual searches. Frequency and duration are not measured.']));
 $r=source_import_extract($p,'entretien-fictif.pdf');pdf_ok(count($r['parts'])===2&&$r['parts'][1]['label']==='Page 2','Deux pages dans le bon ordre');pdf_ok(str_contains($r['text'],'current procedure'),'Texte de la source extrait');require_once __DIR__.'/../src/pdf_reader.php';$inline=source_import_pdf_parse($p);pdf_ok(count($inline['parts'])===2,'Lecture PHP directe sans processus externe');
 $p=$write('mixte.pdf',pdf_fixture(['Text page','','Another text page']));$r=source_import_extract($p,'mixte.pdf');pdf_ok(count($r['parts'])===2&&$r['parts'][1]['label']==='Page 3','Repères originaux conservés malgré une page sans texte');pdf_ok(str_contains(implode(' ',$r['warnings']),'Page 2'),'Page non lisible en texte signalée');
 $p=$write('sans-texte.pdf',pdf_fixture(['']));pdf_no(fn()=>source_import_extract($p,'sans-texte.pdf'),'PDF sans texte refuse sans hallucination');
 $p=$write('long.pdf',pdf_fixture(array_fill(0,41,'Synthetic test page')));$r=source_import_extract($p,'long.pdf');pdf_ok(count($r['parts'])===40&&str_contains(implode(' ',$r['warnings']),'sur 41'),'Limite de 40 pages explicite');
 $p=$write('invalide.pdf','%PDF-1.4 invalid data');pdf_no(fn()=>source_import_extract($p,'invalide.pdf'),'PDF malformé refusé');
 $p=$write('fausse-extension.pdf','Not a PDF');pdf_no(fn()=>source_import_extract($p,'fausse-extension.pdf'),'Fausse extension refusée');
 echo 'PDF import tested without any AI call or database write.'.PHP_EOL;
}finally{foreach($paths as $p)if(is_file($p))unlink($p);rmdir($dir);}
