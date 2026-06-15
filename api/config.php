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

// CORS headers - restrict to this server's own origin. A wildcard "*"
// would let any third-party site read API responses using a stolen JWT;
// same-origin requests are unaffected since browsers don't enforce CORS
// for them anyway.
$selfOrigin = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
header('Access-Control-Allow-Origin: ' . $selfOrigin);
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

// Validates an uploaded file's extension against a whitelist and returns a
// random, safe filename - prevents path traversal, double-extension tricks
// (e.g. "shell.php.jpg") and uploading executable file types.
function safeUploadFilename($originalName, array $allowedExtensions) {
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExtensions, true)) {
        throw new Exception('File type not allowed. Allowed types: ' . implode(', ', $allowedExtensions));
    }
    return bin2hex(random_bytes(16)) . '.' . $ext;
}

function escapeTableName($tableName) {
    $reservedKeywords = ['groups', 'order', 'select', 'insert', 'update', 'delete', 'where', 'table'];

    if (in_array(strtolower($tableName), $reservedKeywords)) {
        return "`$tableName`";
    }

    return $tableName;
}

// Marks any of this user's fasts whose end_date has already passed but are
// still 'active' as 'completed' (progress 100%), so the rest of the app
// reflects reality even if the user never pressed "End Fast". Compared
// using PHP's clock for consistency with the rest of the app's date checks.
function autoCompleteExpiredFasts($db, $user_id) {
    $sql = "SELECT id, end_date FROM user_fasts WHERE user_id = ? AND status = 'active'";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $expiredFastIds = [];
    while ($row = $result->fetch_assoc()) {
        if (strtotime($row['end_date']) < time()) {
            $expiredFastIds[] = (int)$row['id'];
        }
    }
    $stmt->close();

    if (!empty($expiredFastIds)) {
        $placeholders = implode(',', array_fill(0, count($expiredFastIds), '?'));
        $types = str_repeat('i', count($expiredFastIds));
        $stmt = $db->prepare("UPDATE user_fasts SET status = 'completed', progress_percent = 100 WHERE id IN ($placeholders)");
        $stmt->bind_param($types, ...$expiredFastIds);
        $stmt->execute();
        $stmt->close();
    }
}
?>