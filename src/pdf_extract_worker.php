<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
// Private CLI worker: no public route, credentials, uploads or model calls here.
if(PHP_SAPI!=='cli')exit(1);
ini_set('display_errors','0');ini_set('log_errors','0');ini_set('memory_limit','192M');set_time_limit(15);
require __DIR__.'/source_import.php';
try{
 $file=$argv[1]??'';
 if(!is_file($file)||filesize($file)<5||filesize($file)>SOURCE_IMPORT_MAX_BYTES||file_get_contents($file,false,null,0,5)!=='%PDF-')throw new SourceImportException('PDF invalide.');
 require __DIR__.'/pdf_reader.php';
 $result=source_import_pdf_parse($file);
 echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit(0);
}catch(SourceImportException $e){echo json_encode(['error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);exit(2);}
catch(Throwable){echo json_encode(['error'=>'PDF illisible, protégé ou trop complexe. Utilise une version non protégée contenant du texte.'],JSON_UNESCAPED_UNICODE);exit(2);}
