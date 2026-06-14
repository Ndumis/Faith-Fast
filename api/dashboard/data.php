<?php
require_once '../config.php';
require_once '../CRUD.php';

header('Content-Type: application/json');

// Percentage change between two counts, handling the zero-baseline case.
function calcPercentChange($current, $previous) {
    if ($previous == 0) {
        return $current > 0 ? 100 : 0;
    }
    return (int) round((($current - $previous) / $previous) * 100);
}

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
    $year = $input['year'] ?? 'all';
    $month = $input['month'] ?? 'all';
    $fastType = $input['fastType'] ?? 'all';
    
    $db = Database::getInstance()->getConnection();

    // Auto-complete fasts whose end date has already passed but are still
    // marked active, so stats below reflect reality.
    autoCompleteExpiredFasts($db, $user_id);

    // Build WHERE conditions for filters
    $whereConditions = ["uf.user_id = ?"];
    $params = [$user_id];
    $paramTypes = "i";
    
    // Apply year filter
    if ($year !== 'all') {
        $whereConditions[] = "YEAR(uf.start_date) = ?";
        $params[] = $year;
        $paramTypes .= "i";
    }
    
    // Apply month filter
    if ($month !== 'all') {
        $whereConditions[] = "MONTH(uf.start_date) = ?";
        $params[] = $month;
        $paramTypes .= "i";
    }
    
    // Apply fast type filter using plan name
    if ($fastType !== 'all') {
        $whereConditions[] = "fp.name LIKE ?";
        $params[] = '%' . $fastType . '%';
        $paramTypes .= "s";
    }
    
    $whereClause = implode(" AND ", $whereConditions);
    
    // Get total fasts count WITH FILTERS
    $sql = "SELECT COUNT(*) as total_fasts 
            FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE $whereClause";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    if (count($params) > 0) {
        $stmt->bind_param($paramTypes, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $totalFasts = $result->fetch_assoc()['total_fasts'];
    $stmt->close();
    
    // Get total hours fasted (completed fasts only) WITH FILTERS
    $sql = "SELECT SUM(TIMESTAMPDIFF(HOUR, uf.start_date, uf.end_date)) as total_hours 
            FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE $whereClause AND uf.status = 'completed'";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    if (count($params) > 0) {
        $stmt->bind_param($paramTypes, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $totalHours = $result->fetch_assoc()['total_hours'] ?? 0;
    $stmt->close();
    
    // Get prayers count
    $prayerCrud = new CRUD('prayer_requests');
    $prayerConditions = ['user_id' => $user_id];
    
    if ($year !== 'all') {
        $prayerConditions['YEAR(created_at)'] = $year;
    }
    
    $prayersCount = count($prayerCrud->readAll($prayerConditions));
    
    // Get journal entries count
    $journalCrud = new CRUD('journal_entries');
    $journalConditions = ['user_id' => $user_id];
    
    if ($year !== 'all') {
        $journalConditions['YEAR(created_at)'] = $year;
    }
    
    $journalEntries = count($journalCrud->readAll($journalConditions));
    
    // Get active fasts with progress calculation WITH FILTERS
    $sql = "SELECT uf.*, fp.name as plan_name 
            FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE $whereClause AND uf.status = 'active' 
            ORDER BY uf.start_date DESC";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    if (count($params) > 0) {
        $stmt->bind_param($paramTypes, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $activeFasts = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    // Calculate progress for active fasts
    foreach ($activeFasts as &$fast) {
        $start = new DateTime($fast['start_date']);
        $end = new DateTime($fast['end_date']);
        $now = new DateTime();
        
        $totalDuration = $end->getTimestamp() - $start->getTimestamp();
        $elapsed = $now->getTimestamp() - $start->getTimestamp();
        
        if ($totalDuration > 0) {
            $progress = min(100, ($elapsed / $totalDuration) * 100);
            $fast['progress_percent'] = round($progress);
        } else {
            $fast['progress_percent'] = 100;
        }
    }
    
    // Current streak: consecutive days, ending today, covered by an active
    // or completed fast's date range.
    $sql = "SELECT start_date, end_date FROM user_fasts WHERE user_id = ? AND status IN ('active', 'completed')";
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }

    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $fastRanges = [];
    while ($row = $result->fetch_assoc()) {
        $fastRanges[] = [strtotime($row['start_date']), strtotime($row['end_date'])];
    }
    $stmt->close();

    $currentStreak = 0;
    $dayStart = strtotime('today');
    while ($currentStreak < 3650) {
        $dayEnd = $dayStart + 86400;
        $covered = false;
        foreach ($fastRanges as $range) {
            if ($range[0] < $dayEnd && $range[1] > $dayStart) {
                $covered = true;
                break;
            }
        }
        if (!$covered) {
            break;
        }
        $currentStreak++;
        $dayStart -= 86400;
    }
    
    // Fasts this month (current month/year, ignoring filters)
    $currentYear = date('Y');
    $currentMonth = date('n');
    $sql = "SELECT COUNT(*) as fasts_this_month 
            FROM user_fasts 
            WHERE user_id = ? AND YEAR(start_date) = ? AND MONTH(start_date) = ?";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    $stmt->bind_param('iii', $user_id, $currentYear, $currentMonth);
    $stmt->execute();
    $result = $stmt->get_result();
    $fastsThisMonth = $result->fetch_assoc()['fasts_this_month'] ?? 0;
    $stmt->close();

    // Previous month/year, for month-over-month comparisons below
    $prevMonth = (int)$currentMonth - 1;
    $prevYear = (int)$currentYear;
    if ($prevMonth < 1) {
        $prevMonth = 12;
        $prevYear--;
    }

    // Fasts started this month vs last month
    $sql = "SELECT
                SUM(CASE WHEN YEAR(start_date) = ? AND MONTH(start_date) = ? THEN 1 ELSE 0 END) as current_count,
                SUM(CASE WHEN YEAR(start_date) = ? AND MONTH(start_date) = ? THEN 1 ELSE 0 END) as prev_count
            FROM user_fasts WHERE user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('iiiii', $currentYear, $currentMonth, $prevYear, $prevMonth, $user_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $fastsChange = calcPercentChange((int)$row['current_count'], (int)$row['prev_count']);
    $stmt->close();

    // Hours fasted (completed fasts) ending this month vs last month
    $sql = "SELECT
                SUM(CASE WHEN status = 'completed' AND YEAR(end_date) = ? AND MONTH(end_date) = ? THEN TIMESTAMPDIFF(HOUR, start_date, end_date) ELSE 0 END) as current_hours,
                SUM(CASE WHEN status = 'completed' AND YEAR(end_date) = ? AND MONTH(end_date) = ? THEN TIMESTAMPDIFF(HOUR, start_date, end_date) ELSE 0 END) as prev_hours
            FROM user_fasts WHERE user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('iiiii', $currentYear, $currentMonth, $prevYear, $prevMonth, $user_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $hoursChange = calcPercentChange((int)($row['current_hours'] ?? 0), (int)($row['prev_hours'] ?? 0));
    $stmt->close();

    // Prayers added this month vs last month
    $sql = "SELECT
                SUM(CASE WHEN YEAR(created_at) = ? AND MONTH(created_at) = ? THEN 1 ELSE 0 END) as current_count,
                SUM(CASE WHEN YEAR(created_at) = ? AND MONTH(created_at) = ? THEN 1 ELSE 0 END) as prev_count
            FROM prayer_requests WHERE user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('iiiii', $currentYear, $currentMonth, $prevYear, $prevMonth, $user_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $prayersChange = calcPercentChange((int)$row['current_count'], (int)$row['prev_count']);
    $stmt->close();

    // Journal entries added this month vs last month
    $sql = "SELECT
                SUM(CASE WHEN YEAR(created_at) = ? AND MONTH(created_at) = ? THEN 1 ELSE 0 END) as current_count,
                SUM(CASE WHEN YEAR(created_at) = ? AND MONTH(created_at) = ? THEN 1 ELSE 0 END) as prev_count
            FROM journal_entries WHERE user_id = ?";
    $stmt = $db->prepare($sql);
    $stmt->bind_param('iiiii', $currentYear, $currentMonth, $prevYear, $prevMonth, $user_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $journalChange = calcPercentChange((int)$row['current_count'], (int)$row['prev_count']);
    $stmt->close();

    // Get active fasts count WITH FILTERS
    $sql = "SELECT COUNT(*) as active_count FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE $whereClause AND uf.status = 'active'";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    if (count($params) > 0) {
        $stmt->bind_param($paramTypes, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $activeFastsCount = $result->fetch_assoc()['active_count'] ?? 0;
    $stmt->close();

    // Get completed fasts count WITH FILTERS
    $sql = "SELECT COUNT(*) as completed_count FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE $whereClause AND uf.status = 'completed'";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    if (count($params) > 0) {
        $stmt->bind_param($paramTypes, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $completedFastsCount = $result->fetch_assoc()['completed_count'] ?? 0;
    $stmt->close();

    // Get total fasts count WITH FILTERS
    $sql = "SELECT COUNT(*) as total_count FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE $whereClause";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    if (count($params) > 0) {
        $stmt->bind_param($paramTypes, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $totalFastsCount = $result->fetch_assoc()['total_count'] ?? 0;
    $stmt->close();

    // Get upcoming fasts (starting in the future) - no filters applied
    $sql = "SELECT uf.*, fp.name as plan_name, fp.duration_days 
            FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE uf.user_id = ? AND uf.status = 'active' AND uf.start_date > NOW()
            ORDER BY uf.start_date ASC 
            LIMIT 5";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        throw new Exception("SQL prepare failed: " . $db->error);
    }
    
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $upcomingFasts = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Get upcoming fasts count
    $upcomingFastsCount = count($upcomingFasts);
    
    // Get calendar data for the current month/year
    $calendarYear = $input['calendarYear'] ?? date('Y');
    $calendarMonth = $input['calendarMonth'] ?? date('n');
    
    $sql = "SELECT 
                DATE(start_date) as date,
                COUNT(*) as fast_count,
                GROUP_CONCAT(DISTINCT uf.status) as statuses,  -- Fixed ambiguous status
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
    
    $stmt->bind_param('iii', $user_id, $calendarYear, $calendarMonth);
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

    // Get recent activities (TOP 5 most recent across all types)
    $recentActivities = [];
    
    // Use simpler individual queries
    $limit = 2;
    
    // Recent fasts
    $sql = "SELECT 
                'fast' as type,
                'Started fasting' as action,
                fp.name as title,
                uf.start_date as date,
                uf.status
            FROM user_fasts uf 
            LEFT JOIN fasting_plans fp ON uf.plan_id = fp.id 
            WHERE uf.user_id = ?
            ORDER BY uf.start_date DESC 
            LIMIT ?";
    
    $stmt = $db->prepare($sql);
    if ($stmt) {
        $stmt->bind_param('ii', $user_id, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $recentActivities[] = $row;
        }
        $stmt->close();
    }
    
    // Recent journal entries
    $sql = "SELECT 
                'journal' as type,
                'Wrote journal' as action,
                title,
                created_at as date,
                'completed' as status
            FROM journal_entries 
            WHERE user_id = ?
            ORDER BY created_at DESC 
            LIMIT ?";
    
    $stmt = $db->prepare($sql);
    if ($stmt) {
        $stmt->bind_param('ii', $user_id, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $recentActivities[] = $row;
        }
        $stmt->close();
    }
    
    // Recent prayers
    $sql = "SELECT 
                'prayer' as type,
                'Added prayer' as action,
                title,
                created_at as date,
                status
            FROM prayer_requests 
            WHERE user_id = ?
            ORDER BY created_at DESC 
            LIMIT ?";
    
    $stmt = $db->prepare($sql);
    if ($stmt) {
        $stmt->bind_param('ii', $user_id, $limit);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $recentActivities[] = $row;
        }
        $stmt->close();
    }

    // Sort by date and take top 5
    usort($recentActivities, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });
    $recentActivities = array_slice($recentActivities, 0, 5);

    // Get fasting plan names for the filter dropdown
    $sql = "SELECT DISTINCT name FROM fasting_plans ORDER BY name";
    $stmt = $db->prepare($sql);
    $fastPlanNames = [];
    if ($stmt) {
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $fastPlanNames[] = $row['name'];
        }
        $stmt->close();
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'totalFasts' => $totalFasts,
            'totalHours' => $totalHours,
            'prayersCount' => $prayersCount,
            'journalEntries' => $journalEntries,
            'fastsChange' => $fastsChange,
            'hoursChange' => $hoursChange,
            'prayersChange' => $prayersChange,
            'journalChange' => $journalChange,
            'currentStreak' => $currentStreak,
            'fastsThisMonth' => $fastsThisMonth,
            'activeFasts' => $activeFasts,
            'activeFastsCount' => $activeFastsCount,
            'completedFastsCount' => $completedFastsCount,
            'totalFastsCount' => $totalFastsCount,
            'upcomingFastsCount' => $upcomingFastsCount,
            'upcomingFasts' => $upcomingFasts,
            'calendarData' => $calendarData,
            'recentActivities' => $recentActivities,
            'fastPlanNames' => $fastPlanNames // Add plan names for the filter
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching dashboard data: ' . $e->getMessage()
    ]);
}
?>