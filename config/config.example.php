<?php
return [
    'origin' => 'https://benchmark.exemple.ch',
    'dsn' => 'mysql:host=HOST;dbname=BASE_DEDIEE;charset=utf8mb4',
    'user' => 'UTILISATEUR_DEDIE',
    'password' => '',
    // Generate with php bin/password.php. No account is active by default.
    'accounts' => [
        'redacteur' => ['hash' => '', 'role' => 'editor'],
        // 'lecture' => ['hash' => '', 'role' => 'reader'],
    ],
    'throttle_dir' => __DIR__ . '/../var',
];
