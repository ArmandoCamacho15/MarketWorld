<?php

return [
    /*
     * Solo permitir CORS en la API y endpoint CSRF de Sanctum.
     */
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    /*
     * Métodos HTTP permitidos desde el frontend
     */
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
     * Lista blanca de orígenes permitidos por entorno.
     * Definir CORS_ALLOWED_ORIGINS en .env separado por comas y sin espacios.
     */
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost'))),

    'allowed_origins_patterns' => [],

    /*
     * Cabeceras que puede enviar el frontend
     */
    'allowed_headers' => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-XSRF-TOKEN'],

    'exposed_headers' => [],

    // Cachear preflight por 1 hora para reducir latencia de OPTIONS.
    'max_age' => 3600,

    // Requerido para sesión por cookies con Sanctum cuando corresponda.
    'supports_credentials' => env('CORS_SUPPORTS_CREDENTIALS', false),
];
