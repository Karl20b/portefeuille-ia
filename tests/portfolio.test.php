<?php
declare(strict_types=1);
require __DIR__.'/../src/validation.php';
function ok(bool $b):void{if(!$b)throw new RuntimeException('Contrôle portefeuille échoué');}
$p=json_decode(file_get_contents(__DIR__.'/portfolio-fixture.json'),true,32,JSON_THROW_ON_ERROR);validate_project($p);
foreach(['active','discarded','closed'] as $state){$p['portfolio']=['state'=>$state,'reason'=>'Choix humain documenté','date'=>'2026-11-18','priority'=>1];validate_project($p);}
foreach([['state'=>'discarded','reason'=>'','date'=>'2026-11-18'],['state'=>'active','reason'=>'','date'=>'2026-02-30'],['state'=>'other','reason'=>'Motif','date'=>'2026-11-18']] as $bad){$p['portfolio']=$bad;try{validate_project($p);throw new RuntimeException('Statut invalide accepté');}catch(InvalidArgumentException){}}
unset($p['portfolio']);$p['exploration']=['friction'=>'','strategy'=>'','baseline'=>'','users'=>'','methodLog'=>'','cases'=>[],'approach'=>'internal','approachNotes'=>'Prototype à évaluer'];validate_project($p);
echo "Projet ancien, motifs, dates et zéro cas externe valides ; statuts invalides refusés.\n";
