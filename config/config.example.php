<?php
return [
    'origin' => 'https://benchmark.exemple.ch',
    'dsn' => 'mysql:host=HOST;dbname=BASE_DEDIEE;charset=utf8mb4',
    'user' => 'UTILISATEUR_DEDIE',
    'password' => '',
    // Generate with php bin/password.php. No account is active by default.
    'accounts' => [
        'redaction' => ['hash' => '', 'role' => 'editor'],
        // 'lecture' => ['hash' => '', 'role' => 'reader'],
    ],
    'throttle_dir' => __DIR__ . '/../var',
    // Optional. Keep the real key only in this private server configuration.
    'friction_ai' => [
        'enabled' => false,
        'endpoint' => 'https://api.infomaniak.com/2/ai/PRODUCT_ID/openai/v1/chat/completions',
        'api_key' => '',
        'model' => '',
    ],
];
