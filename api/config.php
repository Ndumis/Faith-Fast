<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'faith_fast');
define('DB_CHARSET', 'utf8mb4');
// SMTP
define('SMTP_HOST', 'fyre.aserv.co.za');
define('SMTP_USER', 'mail@thekconsult.co.za');
define('SMTP_PASS', '8GAzt_-NK=#7}SE]');
define('SMTP_PORT', 465);

// Mail addresses
define('MAIL_FROM',       'no-reply@thekconsult.co.za');
define('MAIL_ADMIN_ADDR', 'info@thekconsult.co.za');
define('MAIL_ADMIN_NAME', 'Faith Fast Admin');

// Base URL of the app (used to build links in emails, e.g. password reset).
// Derived from the current request so it works in both local dev (e.g.
// http://localhost:8090/development/Faith-Fast) and production (e.g.
// https://example.com) without hardcoding a path.
function appUrl() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    // API scripts live two levels below the app root: api/<module>/<file>.php
    $appRoot = rtrim(dirname(dirname(dirname($_SERVER['SCRIPT_NAME']))), '/');
    return $protocol . '://' . $host . $appRoot;
}

// JWT Secret for authentication
define('JWT_SECRET', 'faith_fast_secret_2024');

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// JWT functions
function generateJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode($payload);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($token) {
    try {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return false;
        
        list($header, $payload, $signature) = $parts;
        
        $validSignature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
        $base64UrlValidSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($validSignature));
        
        if ($base64UrlValidSignature !== $signature) return false;
        
        $decodedPayload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        
        // Check if token is expired
        if (isset($decodedPayload['exp']) && $decodedPayload['exp'] < time()) {
            return false;
        }
        
        return $decodedPayload;
    } catch (Exception $e) {
        return false;
    }
}

function getAuthUser() {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        return false;
    }
    
    $authHeader = $headers['Authorization'];
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        return verifyJWT($token);
    }
    
    return false;
}

function escapeTableName($tableName) {
    $reservedKeywords = ['groups', 'order', 'select', 'insert', 'update', 'delete', 'where', 'table'];
    
    if (in_array(strtolower($tableName), $reservedKeywords)) {
        return "`$tableName`";
    }
    
    return $tableName;
}
?>