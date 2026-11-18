<?php
declare(strict_types=1);
// Local text extraction only. No document URLs, network requests or PDF actions are executed.
function source_import_pdf_parse(string $file): array {
 require_once __DIR__.'/../vendor-pdf/autoload.php';
 $oldMemory=ini_get('memory_limit');$oldTime=(int)ini_get('max_execution_time');
 $memory=function_exists('ini_parse_quantity')?ini_parse_quantity($oldMemory):(int)$oldMemory*1048576;
 if($memory<0||$memory>201326592)ini_set('memory_limit','192M');
 if(function_exists('set_time_limit'))set_time_limit(15);
 try{
  $config=new \Smalot\PdfParser\Config();$config->setRetainImageContent(false);$config->setDecodeMemoryLimit(8388608);$config->setMaxNestingDepth(256);
  $pdf=(new \Smalot\PdfParser\Parser([],$config))->parseFile($file);$pages=$pdf->getPages();$parts=[];$empty=[];$characters=0;
  foreach(array_slice($pages,0,40) as $i=>$page){
   $text=source_import_clean($page->getText());$label='Page '.($i+1);
   $characters+=mb_strlen($text,'UTF-8');if($characters>100000)throw new SourceImportException('Le texte dépasse 100 000 caractères. Importe les pages utiles dans un fichier plus court.');
   if($text==='')$empty[]=$label;else $parts[]=['label'=>$label,'text'=>$text];
  }
  return ['parts'=>$parts,'totalPages'=>count($pages),'limited'=>count($pages)>40,'emptyPages'=>$empty];
 }catch(SourceImportException $e){throw $e;}
 catch(Throwable){throw new SourceImportException('PDF illisible, protégé ou trop complexe. Utilise une version non protégée contenant du texte.');}
 finally{if(function_exists('set_time_limit'))set_time_limit($oldTime);@ini_set('memory_limit',$oldMemory);}
}
