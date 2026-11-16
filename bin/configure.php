<?php
declare(strict_types=1);
// Configuration uniquement en terminal ; aucun secret en argument de commande.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/prompts.php';
try {
    $target = __DIR__ . '/../config/config.local.php';
    if (file_exists($target)) throw new RuntimeException('Configuration existante : aucune modification.');
    $origin = ask('URL HTTPS du site, sans slash final');
    $url = parse_url($origin);
    if (!$url || ($url['scheme'] ?? '') !== 'https' || empty($url['host']) || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment']) || !empty($url['path'])) {
        throw new RuntimeException('Utiliser une origine HTTPS, par exemple https://projets.exemple.ch, sans chemin.');
    }
    $host = ask('Serveur MariaDB');
    $database = ask('Nom de la base dédiée');
    if (!preg_match('/^[a-zA-Z0-9._-]+$/D', $host) || !preg_match('/^[a-zA-Z0-9_-]+$/D', $database)) throw new RuntimeException('Serveur ou nom de base invalide.');
    $dbuser = ask('Utilisateur MariaDB dédié');
    $dbpassword = secret('Mot de passe MariaDB');
    $username = ask('Identifiant applicatif à créer');
    if (!preg_match('/^[a-zA-Z0-9._-]{1,80}$/D', $username)) throw new RuntimeException('Identifiant invalide.');
    $password = secret('Nouveau mot de passe applicatif (14 caractères minimum)');
    if (strlen($password) < 14 || !hash_equals($password, secret('Confirmer le mot de passe applicatif'))) throw new RuntimeException('Mot de passe trop court ou confirmation différente.');
    $config = ['origin'=>$origin,'dsn'=>'mysql:host='.$host.';dbname='.$database.';charset=utf8mb4','user'=>$dbuser,'password'=>$dbpassword,'accounts'=>[$username=>['hash'=>password_hash($password,PASSWORD_DEFAULT),'role'=>'editor']]];
    // Vérification sans création ni modification de table.
    $db = new PDO($config['dsn'], $dbuser, $dbpassword, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $db->query('SELECT id, version, document, updated_at FROM bf_projects LIMIT 0');
    $db->query('SELECT id, project_id, author, version, document, created_at FROM bf_events LIMIT 0');
    umask(0077);
    $file = fopen($target, 'x');
    if (!$file) throw new RuntimeException('Création du fichier impossible.');
    $content = "<?php\nreturn " . var_export($config,true) . " + ['throttle_dir' => __DIR__ . '/../var'];\n";
    $written = fwrite($file, $content);
    fclose($file);
    if ($written !== strlen($content)) { unlink($target); throw new RuntimeException('Écriture incomplète.'); }
    echo "Configuration créée. Ouvrir le site et se connecter. Aucun exemple importé automatiquement.\n";
} catch (Throwable $e) {
    // Une exception PDO peut contenir des identifiants : ne pas la reproduire.
    fwrite(STDERR, $e instanceof PDOException ? "Connexion ou tables indisponibles. Vérifier la base et ses droits.\n" : $e->getMessage()."\n");
    exit(1);
}
