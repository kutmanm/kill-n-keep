package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GameController {
    
    private Map<String, Object> sessions = new HashMap<>();
    private List<Map<String, Object>> leaderboard = new ArrayList<>();
    
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
            sessions.put(sessionId, Map.of(
                "nickname", nickname,
                "startTime", System.currentTimeMillis(),
                "score", 0,
                "wave", 1
            ));
            
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
