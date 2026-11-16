<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/prompts.php';
try {
    $password = secret('Mot de passe (14 caractères minimum)');
    if (strlen($password) < 14 || !hash_equals($password, secret('Confirmer'))) throw new RuntimeException('Mot de passe trop court ou confirmation différente.');
    echo password_hash($password, PASSWORD_DEFAULT), "\n";
} catch (Throwable $e) { fwrite(STDERR, $e->getMessage()."\n"); exit(1); }
