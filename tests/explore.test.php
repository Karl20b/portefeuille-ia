<?php
declare(strict_types=1);
require __DIR__.'/../src/validation.php';
set_error_handler(function(int $severity,string $message): never {throw new RuntimeException($message);});
$fixtures=json_decode(file_get_contents(__DIR__.'/explore-fixtures.json'),true,32,JSON_THROW_ON_ERROR);
$count=0;
foreach($fixtures as $f){
 $accepted=true;
 try {validate_project($f['project']);}catch(InvalidArgumentException){$accepted=false;}
 if($accepted!==$f['valid'])throw new RuntimeException('Échec : '.$f['name']);
 echo 'OK '.$f['name']."\n";$count++;
}
echo "$count contrôles PHP d’exploration réussis.\n";
