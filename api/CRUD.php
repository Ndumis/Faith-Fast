<?php
require_once 'Database.php';

class CRUD {
    private $db;
    private $table;
    private $primaryKey;

    public function __construct($table, $primaryKey = 'id') {
        $this->db = Database::getInstance()->getConnection();
        $this->table = $this->escapeTableName($table);
        $this->primaryKey = $primaryKey;
    }

    // Escape table name if it contains reserved keywords
    private function escapeTableName($tableName) {
        // Remove existing backticks if any
        $tableName = trim($tableName, '`');
        
        // List of common MySQL reserved words that might be used as table names
        $reservedWords = [
            'groups', 'user', 'order', 'select', 'insert', 'update', 'delete', 
            'where', 'from', 'table', 'database', 'index', 'key', 'primary'
        ];
        
        // Check if table name is a reserved word (case-insensitive)
        if (in_array(strtolower($tableName), array_map('strtolower', $reservedWords))) {
            return "`$tableName`";
        }
        
        return $tableName;
    }

    // Create with duplicate checking
    public function create($data, $uniqueColumns = []) {
        // Check for duplicates if unique columns are specified
        if (!empty($uniqueColumns)) {
            if ($this->checkDuplicate($data, $uniqueColumns)) {
                throw new Exception("Duplicate entry found for unique columns: " . implode(', ', $uniqueColumns));
            }
        }

        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        $values = array_values($data);
        
        $sql = "INSERT INTO {$this->table} ($columns) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->db->error);
        }
        
        $types = $this->getBindTypes($values);
        $stmt->bind_param($types, ...$values);
        
        if ($stmt->execute()) {
            return $this->db->insert_id;
        } else {
            // Check if it's a duplicate entry error
            if ($stmt->errno == 1062) { // MySQL duplicate entry error code
                throw new Exception("Duplicate entry: " . $stmt->error);
            }
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }

    // Update with change detection to avoid unnecessary updates
    public function update($id, $data, $uniqueColumns = []) {
        // Get current data
        $currentData = $this->read($id);
        if (!$currentData) {
            throw new Exception("Record not found with ID: $id");
        }

        // Filter out unchanged values
        $changedData = [];
        foreach ($data as $key => $value) {
            if (!array_key_exists($key, $currentData) || $currentData[$key] != $value) {
                $changedData[$key] = $value;
            }
        }

        // If no changes, return success without updating
        if (empty($changedData)) {
            return true;
        }

        // Check for duplicates if unique columns are specified
        if (!empty($uniqueColumns)) {
            $checkData = array_merge($currentData, $changedData);
            unset($checkData[$this->primaryKey]); // Remove primary key for duplicate check
            
            if ($this->checkDuplicate($checkData, $uniqueColumns, $id)) {
                throw new Exception("Duplicate entry would be created for unique columns: " . implode(', ', $uniqueColumns));
            }
        }

        $setClause = [];
        $values = [];
        
        foreach ($changedData as $column => $value) {
            $setClause[] = "$column = ?";
            $values[] = $value;
        }
        $values[] = $id;
        
        $sql = "UPDATE {$this->table} SET " . implode(', ', $setClause) . " WHERE {$this->primaryKey} = ?";
        $stmt = $this->db->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->db->error);
        }
        
        $types = $this->getBindTypes($values);
        $stmt->bind_param($types, ...$values);
        
        if ($stmt->execute()) {
            return true;
        } else {
            if ($stmt->errno == 1062) {
                throw new Exception("Duplicate entry: " . $stmt->error);
            }
            throw new Exception("Execute failed: " . $stmt->error);
        }
    }

    // Check for duplicate entries
    private function checkDuplicate($data, $uniqueColumns, $excludeId = null) {
        $conditions = [];
        $params = [];
        
        foreach ($uniqueColumns as $column) {
            if (isset($data[$column])) {
                $conditions[] = "$column = ?";
                $params[] = $data[$column];
            }
        }
        
        if (empty($conditions)) {
            return false;
        }
        
        $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE " . implode(' AND ', $conditions);
        
        if ($excludeId !== null) {
            $sql .= " AND {$this->primaryKey} != ?";
            $params[] = $excludeId;
        }
        
        $stmt = $this->db->prepare($sql);
        $types = $this->getBindTypes($params);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        return $row['count'] > 0;
    }

    // Read (single) - unchanged
    public function read($id) {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?";
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->db->error);
        }
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_assoc();
    }

    // Read all with optional conditions - improved
    public function readAll($conditions = [], $orderBy = '', $limit = '', $distinct = false) {
        $select = $distinct ? "SELECT DISTINCT *" : "SELECT *";
        $sql = "{$select} FROM {$this->table}";
        $params = [];
        
        if (!empty($conditions)) {
            $whereClause = [];
            foreach ($conditions as $column => $value) {
                $whereClause[] = "$column = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
        }
        
        if (!empty($orderBy)) {
            // Only allow "column [ASC|DESC]" lists - guards against SQL
            // injection if a caller ever passes user input through here.
            if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*(\s+(ASC|DESC))?(\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*(\s+(ASC|DESC))?)*$/i', $orderBy)) {
                throw new Exception('Invalid order by clause');
            }
            $sql .= " ORDER BY $orderBy";
        }

        if (!empty($limit)) {
            // Only allow "count" or "offset, count" - guards against SQL
            // injection via the limit parameter.
            if (is_numeric($limit)) {
                $limit = (int)$limit;
            } elseif (preg_match('/^\s*(\d+)\s*,\s*(\d+)\s*$/', $limit, $m)) {
                $limit = (int)$m[1] . ', ' . (int)$m[2];
            } else {
                throw new Exception('Invalid limit clause');
            }
            $sql .= " LIMIT $limit";
        }
        
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->db->error);
        }
        
        if (!empty($params)) {
            $types = $this->getBindTypes($params);
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        return $result->fetch_all(MYSQLI_ASSOC);
    }

    // Delete - unchanged
    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?";
        $stmt = $this->db->prepare($sql);
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->db->error);
        }
        $stmt->bind_param('i', $id);
        return $stmt->execute();
    }

    // Improved bind type detection
    private function getBindTypes($values) {
        $types = '';
        foreach ($values as $value) {
            if (is_int($value)) {
                $types .= 'i';
            } elseif (is_float($value)) {
                $types .= 'd';
            } else {
                $types .= 's';
            }
        }
        return $types;
    }

    // Transaction support
    public function beginTransaction() {
        $this->db->begin_transaction();
    }

    public function commit() {
        $this->db->commit();
    }

    public function rollback() {
        $this->db->rollback();
    }

    // Check if record exists
    public function exists($conditions) {
        $whereClause = [];
        $params = [];
        
        foreach ($conditions as $column => $value) {
            $whereClause[] = "$column = ?";
            $params[] = $value;
        }
        
        $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE " . implode(' AND ', $whereClause);
        $stmt = $this->db->prepare($sql);
        $types = $this->getBindTypes($params);
        $stmt->bind_param($types, ...$params);
        $stmt->execute();
        $result = $stmt->get_result();
        $row = $result->fetch_assoc();
        
        return $row['count'] > 0;
    }
}
?>