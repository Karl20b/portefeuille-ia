<?php
declare(strict_types=1);
require __DIR__.'/../src/source_import.php';
function ok(bool $v,string $s):void{if(!$v)throw new RuntimeException($s);echo 'OK '.$s.PHP_EOL;}
function no(callable $f,string $s):void{try{$f();}catch(SourceImportException){ok(true,$s);return;}throw new RuntimeException('Expected rejection: '.$s);}
$tmp=sys_get_temp_dir().'/bf-import-test-'.bin2hex(random_bytes(6));mkdir($tmp,0700);$paths=[];
$zip=static function(string $name,array $entries)use($tmp,&$paths):string{$p=$tmp.'/'.$name;$z=new ZipArchive();$z->open($p,ZipArchive::CREATE);foreach($entries as $f=>$data)$z->addFromString($f,$data);$z->close();$paths[]=$p;return $p;};
try{
 $p=$tmp.'/source.txt';file_put_contents($p,"\xEF\xBB\xBFDIT : Je cherche la procédure.\r\nFAIT : ouvre deux dossiers.");$paths[]=$p;
 $r=source_import_extract($p,'source.txt');ok(str_contains($r['text'],'Je cherche la procédure.')&&!str_contains($r['text'],"\r"),'Texte UTF-8, accents et lignes normalisés');
 no(fn()=>source_import_extract($p,'source.php'),'Extension exécutable refusée');no(fn()=>source_import_extract($p,'faux.pptx'),'Fausse extension Office refusée');
 no(fn()=>source_import_xml('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>'),'Entités XML externes refusées');
 $a='http://schemas.openxmlformats.org/drawingml/2006/main';$slide=static fn($text,$hidden=false)=>'<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="'.$a.'"'.($hidden?' show="0"':'').'><p:cSld><p:spTree><a:p><a:r><a:t>'.$text.'</a:t></a:r></a:p></p:spTree></p:cSld></p:sld>';
 $entries=['[Content_Types].xml'=>'<Types/>','ppt/presentation.xml'=>'<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="r2"/><p:sldId id="257" r:id="r1"/><p:sldId id="258" r:id="r3"/></p:sldIdLst></p:presentation>','ppt/_rels/presentation.xml.rels'=>'<Relationships><Relationship Id="r1" Target="slides/slide1.xml"/><Relationship Id="r2" Target="slides/slide2.xml"/><Relationship Id="r3" Target="slides/slide3.xml"/></Relationships>','ppt/slides/slide1.xml'=>$slide('Deuxième visible'),'ppt/slides/slide2.xml'=>$slide('Première visible'),'ppt/slides/slide3.xml'=>$slide('Texte masqué',true),'ppt/notesSlides/notesSlide1.xml'=>'Note privée à ne pas extraire'];
 $p=$zip('carte.pptx',$entries);$r=source_import_extract($p,'carte.pptx');ok(count($r['parts'])===2&&str_contains($r['parts'][0]['text'],'Première visible'),'Ordre réel des diapositives conservé');ok(!str_contains($r['text'],'masqué')&&!str_contains($r['text'],'Note privée'),'Diapositives masquées et notes exclues');
 $doc=$zip('document.docx',['[Content_Types].xml'=>'<Types/>','word/document.xml'=>'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Entretien</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Procédure difficile à retrouver</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>','word/comments.xml'=>'Commentaire privé']);$r=source_import_extract($doc,'document.docx');ok(str_contains($r['text'],'Procédure difficile')&&!str_contains($r['text'],'Commentaire privé'),'Paragraphes et tableaux Word, sans commentaires');
 $bad=$zip('vide.pptx',array_replace($entries,['ppt/slides/slide1.xml'=>$slide(''),'ppt/slides/slide2.xml'=>$slide('')]));no(fn()=>source_import_extract($bad,'vide.pptx'),'Document sans texte signalé, pas de contenu inventé');
 $bad=$zip('gros.docx',['[Content_Types].xml'=>'<Types/>','word/document.xml'=>str_repeat('A',2097153)]);no(fn()=>source_import_extract($bad,'gros.docx'),'Partie XML trop volumineuse refusée');
 ok(strlen($r['sha256'])===64,'Empreinte du document calculée');
 echo 'Extraction Office et texte contrôlée sans IA ni base de données.'.PHP_EOL;
}finally{foreach($paths as $p)if(is_file($p))unlink($p);rmdir($tmp);}
