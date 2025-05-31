export const GameState = {
  // Player info
  nickname: null,
  sessionId: null,
  selectedClass: 'knight',
  selectedMap: 'grassland',
  
  // Game state
  currentWave: 1,
  score: 0,
  playerHealth: 100,
  treasureHealth: 100,
  enemiesKilled: 0,
  
  // Wave system
  waveInProgress: false,
  waveTimer: 0,
  difficulty: 1.0,
  waveEnemies: [],
  
  // Game settings
  showEffects: true,
  soundEnabled: true,
  
  // Session tracking
  sessionStartTime: null
};

// Make it available globally
window.GameState = GameState;
