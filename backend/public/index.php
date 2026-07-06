<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Talking ABC - API front controller
|--------------------------------------------------------------------------
| Single entry point for the PHP built-in server. A PSR-4 style autoloader
| maps the "App\" namespace to backend/app, then the kernel handles the
| request through the MVC stack (Router -> Controller -> Model -> JSON view).
|
| Run:  php -S 0.0.0.0:5000 backend/public/index.php
*/

use App\Core\App;

const APP_BASE_PATH = __DIR__ . '/..';

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = APP_BASE_PATH . '/app/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require $file;
    }
});

(new App(APP_BASE_PATH))->run();
