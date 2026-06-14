<?php
require_once '../config.php';
require_once '../Database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

try {
    $authUser = getAuthUser();
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Authentication required']);
        exit;
    }

    $user_id = $authUser['user_id'];
    $year = (int)($input['year'] ?? date('Y'));
    $month = (int)($input['month'] ?? date('n'));

    $db = Database::getInstance()->getConnection();

    $sql = "SELECT
                DATE(start_date) as date,
                COUNT(*) as fast_count,
                GROUP_CONCAT(DISTINCT uf.status) as statuses,
                GROUP_CONCAT(DISTINCT fp.name) as plan_names
            FROM user_fasts uf
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id
            WHERE uf.user_id = ?
                AND YEAR(start_date) = ?
                AND MONTH(start_date) = ?
            GROUP BY DATE(start_date)
            ORDER BY date";

    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }

    $stmt->bind_param('iii', $user_id, $year, $month);
    $stmt->execute();
    $result = $stmt->get_result();
    $calendarData = [];
    while ($row = $result->fetch_assoc()) {
        $calendarData[$row['date']] = [
            'fasting' => true,
            'fast_count' => $row['fast_count'],
            'statuses' => explode(',', $row['statuses']),
            'plan_names' => explode(',', $row['plan_names'])
        ];
    }
    $stmt->close();

    echo json_encode([
        'success' => true,
        'data' => $calendarData
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching calendar data: ' . $e->getMessage()
    ]);
}
?>
