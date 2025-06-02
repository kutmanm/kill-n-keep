import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GameController {
    
    private Map<String, Map<String, Object>> sessions = new HashMap<>();
    private List<Map<String, Object>> leaderboard = new ArrayList<>();
    private Map<String, Map<String, Object>> waveData = new HashMap<>();
    
    @PostMapping("/game/start")
    public ResponseEntity<?> startGame(@RequestBody Map<String, String> request) {
        try {
            String nickname = request.get("nickname");
            if (nickname == null || nickname.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Nickname is required"
                ));
            }
            
            String sessionId = "session_" + System.currentTimeMillis();
            Map<String, Object> sessionData = new HashMap<>();
            sessionData.put("nickname", nickname);
            sessionData.put("startTime", System.currentTimeMillis());
            sessionData.put("score", 0);
            sessionData.put("wave", 1);
            sessionData.put("treasureHealth", 100);
            sessionData.put("playerHealth", 150);
            sessions.put(sessionId, sessionData);
            
            // Initialize wave data for this session
            Map<String, Object> waveInfo = new HashMap<>();
            waveInfo.put("currentWave", 1);
            waveInfo.put("waveActive", false);
            waveInfo.put("enemiesSpawned", 0);
            waveInfo.put("enemiesKilled", 0);
            waveInfo.put("waveStartTime", 0L);
            waveData.put(sessionId, waveInfo);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "sessionId", sessionId,
                "message", "Game started successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    @PostMapping("/wave/start")
    public ResponseEntity<?> startWave(@RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            Integer currentWave = (Integer) request.get("currentWave");
            
            if (sessionId == null || !sessions.containsKey(sessionId)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid session"
                ));
            }
            
            // Calculate wave parameters
            int waveNumber = currentWave != null ? currentWave : 1;
            int baseEnemies = 3;
            int enemyCount = baseEnemies + (waveNumber - 1) * 2;
            int spawnDelay = Math.max(800, 2000 - (waveNumber * 100));
            boolean hasBoss = waveNumber % 5 == 0;
            
            Map<String, Object> waveInfo = Map.of(
                "waveNumber", waveNumber,
                "enemyCount", enemyCount,
                "spawnDelay", spawnDelay,
                "hasBoss", hasBoss,
                "preparationTime", 3000,
                "enemies", generateEnemyList(waveNumber, enemyCount, hasBoss)
            );
            
            // Update wave data
            Map<String, Object> currentWaveData = new HashMap<>();
            Map<String, Object> existingWaveData = waveData.get(sessionId);
            if (existingWaveData != null) {
                currentWaveData.putAll(existingWaveData);
            }
            currentWaveData.put("currentWave", waveNumber);
            currentWaveData.put("waveActive", true);
            currentWaveData.put("enemiesSpawned", 0);
            currentWaveData.put("enemiesKilled", 0);
            currentWaveData.put("waveStartTime", System.currentTimeMillis());
            waveData.put(sessionId, currentWaveData);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "waveInfo", waveInfo
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    @PostMapping("/wave/enemy-spawned")
    public ResponseEntity<?> enemySpawned(@RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            
            if (sessionId == null || !waveData.containsKey(sessionId)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid session"
                ));
            }
            
            Map<String, Object> currentWaveData = new HashMap<>();
            Map<String, Object> existingWaveData = waveData.get(sessionId);
            if (existingWaveData != null) {
                currentWaveData.putAll(existingWaveData);
            }
            int enemiesSpawned = (Integer) currentWaveData.get("enemiesSpawned");
            currentWaveData.put("enemiesSpawned", enemiesSpawned + 1);
            waveData.put(sessionId, currentWaveData);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "enemiesSpawned", enemiesSpawned + 1
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    @PostMapping("/wave/enemy-killed")
    public ResponseEntity<?> enemyKilled(@RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            String enemyType = (String) request.get("enemyType");
            Integer currentWave = (Integer) request.get("currentWave");
            
            if (sessionId == null || !waveData.containsKey(sessionId)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid session"
                ));
            }
            
            // Calculate score based on enemy type and wave
            int scoreGain = calculateScoreForEnemy(enemyType, currentWave);
            
            Map<String, Object> currentWaveData = new HashMap<>();
            Map<String, Object> existingWaveData = waveData.get(sessionId);
            if (existingWaveData != null) {
                currentWaveData.putAll(existingWaveData);
            }
            int enemiesKilled = (Integer) currentWaveData.get("enemiesKilled");
            currentWaveData.put("enemiesKilled", enemiesKilled + 1);
            waveData.put(sessionId, currentWaveData);
            
            // Update session score
            Map<String, Object> session = new HashMap<>();
            Map<String, Object> existingSession = sessions.get(sessionId);
            if (existingSession != null) {
                session.putAll(existingSession);
            }
            int currentScore = (Integer) session.get("score");
            session.put("score", currentScore + scoreGain);
            sessions.put(sessionId, session);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "scoreGain", scoreGain,
                "enemiesKilled", enemiesKilled + 1
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    @PostMapping("/wave/complete")
    public ResponseEntity<?> completeWave(@RequestBody Map<String, Object> request) {
        try {
            String sessionId = (String) request.get("sessionId");
            Integer waveNumber = (Integer) request.get("waveNumber");
            
            if (sessionId == null || !sessions.containsKey(sessionId)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid session"
                ));
            }
            
            // Calculate wave completion bonus
            int waveBonus = waveNumber * 50;
            
            // Update session
            Map<String, Object> session = new HashMap<>();
            Map<String, Object> existingSession = sessions.get(sessionId);
            if (existingSession != null) {
                session.putAll(existingSession);
            }
            int currentScore = (Integer) session.get("score");
            session.put("score", currentScore + waveBonus);
            session.put("wave", waveNumber + 1);
            sessions.put(sessionId, session);
            
            // Update wave data
            Map<String, Object> currentWaveData = new HashMap<>();
            Map<String, Object> existingWaveData = waveData.get(sessionId);
            if (existingWaveData != null) {
                currentWaveData.putAll(existingWaveData);
            }
            currentWaveData.put("waveActive", false);
            currentWaveData.put("currentWave", waveNumber + 1);
            waveData.put(sessionId, currentWaveData);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "waveBonus", waveBonus,
                "nextWave", waveNumber + 1,
                "totalScore", currentScore + waveBonus
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    @GetMapping("/session/{sessionId}/status")
    public ResponseEntity<?> getSessionStatus(@PathVariable String sessionId) {
        try {
            if (!sessions.containsKey(sessionId)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Session not found"
                ));
            }
            
            Map<String, Object> session = sessions.get(sessionId);
            Map<String, Object> wave = waveData.get(sessionId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "session", session,
                "wave", wave != null ? wave : Map.of()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    private List<Map<String, Object>> generateEnemyList(int waveNumber, int enemyCount, boolean hasBoss) {
        List<Map<String, Object>> enemies = new ArrayList<>();
        
        // Generate regular enemies
        for (int i = 0; i < enemyCount; i++) {
            enemies.add(Map.of(
                "type", "enemy",
                "health", 20 + (waveNumber * 5),
                "speed", 50 + (waveNumber * 5),
                "damage", 15,
                "spawnDelay", i * 1000 // Spawn every second
            ));
        }
        
        // Add boss if this is a boss wave
        if (hasBoss) {
            enemies.add(Map.of(
                "type", "boss",
                "health", 200 + (waveNumber * 50),
                "speed", 40 + (waveNumber * 3),
                "damage", 30 + (waveNumber * 5),
                "spawnDelay", enemyCount * 1000 + 2000 // Spawn boss after regular enemies
            ));
        }
        
        return enemies;
    }
    
    private int calculateScoreForEnemy(String enemyType, int waveNumber) {
        switch (enemyType) {
            case "boss":
                return 200 + (waveNumber * 20);
            case "enemy":
            default:
                return 10 + waveNumber;
        }
    }

    @PostMapping("/session/complete")
    public ResponseEntity<?> completeSession(@RequestBody Map<String, Object> request) {
        try {
            Integer finalScore = (Integer) request.get("finalScore");
            Integer finalWave = (Integer) request.get("finalWave");
            String playerId = (String) request.get("playerId");
            
            if (finalScore != null && finalWave != null) {
                // Add to leaderboard
                leaderboard.add(Map.of(
                    "score", finalScore,
                    "wave", finalWave,
                    "playerId", playerId != null ? playerId : "anonymous",
                    "timestamp", System.currentTimeMillis()
                ));
                
                // Sort leaderboard by score
                leaderboard.sort((a, b) -> 
                    Integer.compare((Integer) b.get("score"), (Integer) a.get("score"))
                );
                
                // Keep only top 100
                if (leaderboard.size() > 100) {
                    leaderboard = leaderboard.subList(0, 100);
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Session completed"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    @GetMapping("/leaderboard/{type}")
    public ResponseEntity<?> getLeaderboard(@PathVariable String type, @RequestParam(defaultValue = "10") int limit) {
        try {
            List<Map<String, Object>> result = new ArrayList<>();
            
            for (int i = 0; i < Math.min(leaderboard.size(), limit); i++) {
                Map<String, Object> entry = leaderboard.get(i);
                result.add(Map.of(
                    "rank", i + 1,
                    "username", "Player" + (i + 1),
                    "bestScore", entry.get("score"),
                    "bestWave", entry.get("wave"),
                    "level", 1
                ));
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Internal server error: " + e.getMessage()
            ));
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
            "status", "OK",
            "timestamp", System.currentTimeMillis(),
            "version", "1.0.0"
        ));
    }
}
