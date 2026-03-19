<?php

return [
    /*
     * Rutas donde se aplica CORS — /api/* cubre toda la API
     */
    'paths' => ['api/*'],

    /*
     * Métodos HTTP permitidos desde el frontend
     */
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
     * Orígenes permitidos.
     * En desarrollo: * (cualquiera) es suficiente.
     * En producción cambia esto por la URL exacta del frontend.
     */
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    /*
     * Cabeceras que puede enviar el frontend
     */
    'allowed_headers' => ['Content-Type', 'X-Requested-With', 'Authorization', 'Accept'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,
];
