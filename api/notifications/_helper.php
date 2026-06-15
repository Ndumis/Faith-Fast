<?php
// Shared helper to insert notification rows. Include after config.php/CRUD.php.
if (!function_exists('createNotification')) {
    function createNotification($user_id, $type, $title, $message = null, $link_tab = null, $link_id = null) {
        try {
            $crud = new CRUD('notifications');
            $crud->create([
                'user_id'    => (int)$user_id,
                'type'       => $type,
                'title'      => $title,
                'message'    => $message,
                'link_tab'   => $link_tab,
                'link_id'    => $link_id !== null ? (int)$link_id : null,
                'is_read'    => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (Exception $e) {
            // Notifications are best-effort - never fail the parent request.
            error_log('createNotification failed: ' . $e->getMessage());
        }
    }
}
?>
