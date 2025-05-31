export const API = {
  baseUrl: 'http://localhost:8081/api',
  isOnline: true,
  
  async call(endpoint, method = 'GET', data = null) {
    // If we're already in offline mode, don't try API calls
    if (!this.isOnline && !endpoint.includes('/auth/')) {
      return this.getMockResponse(endpoint, method, data);
    }
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      this.isOnline = true;
      return result;
    } catch (error) {
      console.error('API call failed:', error);
      this.isOnline = false;
      
      // Return mock responses for offline mode
      return this.getMockResponse(endpoint, method, data);
    }
  },
  
  getMockResponse(endpoint, method, data) {
    console.log('🔌 Backend unavailable - using offline mode');
    
    switch(endpoint) {
      case '/game/start':
        return { 
          success: true, 
          sessionId: 'offline-' + Date.now(),
          message: 'Playing in offline mode' 
        };
      case '/wave/start':
        // Mock wave data generation
        const waveNumber = data.currentWave || 1;
        const baseEnemies = 3;
        const enemyCount = baseEnemies + (waveNumber - 1) * 2;
        const hasBoss = waveNumber % 5 === 0;
        
        const enemies = [];
        // Generate regular enemies
        for (let i = 0; i < enemyCount; i++) {
          enemies.push({
            type: 'enemy',
            health: 20 + (waveNumber * 5),
            speed: 50 + (waveNumber * 5),
            damage: 15,
            spawnDelay: i * 1000
          });
        }
        
        // Add boss if needed
        if (hasBoss) {
          enemies.push({
            type: 'boss',
            health: 200 + (waveNumber * 50),
            speed: 40 + (waveNumber * 3),
            damage: 30 + (waveNumber * 5),
            spawnDelay: enemyCount * 1000 + 2000
          });
        }
        
        return {
          success: true,
          waveInfo: {
            waveNumber: waveNumber,
            enemyCount: enemyCount,
            spawnDelay: Math.max(800, 2000 - (waveNumber * 100)),
            hasBoss: hasBoss,
            preparationTime: 3000,
            enemies: enemies
          }
        };
      case '/wave/enemy-spawned':
        return { success: true, enemiesSpawned: 1 };
      case '/wave/enemy-killed':
        const scoreGain = data.enemyType === 'boss' ? 200 + (data.currentWave * 20) : 10 + data.currentWave;
        return { success: true, scoreGain: scoreGain, enemiesKilled: 1 };
      case '/wave/complete':
        const waveBonus = data.waveNumber * 50;
        return { 
          success: true, 
          waveBonus: waveBonus,
          nextWave: data.waveNumber + 1,
          totalScore: (window.GameState.score || 0) + waveBonus
        };
      case '/session/complete':
        // Save score to localStorage
        const scores = JSON.parse(localStorage.getItem('kak_offline_scores') || '[]');
        scores.push({
          score: data.finalScore,
          wave: data.finalWave,
          date: new Date().toISOString(),
          nickname: window.GameState.nickname
        });
        localStorage.setItem('kak_offline_scores', JSON.stringify(scores));
        return { success: true };
      default:
        if (endpoint.includes('/leaderboard/')) {
          const scores = JSON.parse(localStorage.getItem('kak_offline_scores') || '[]');
          const sortedScores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
          return sortedScores.map((score, index) => ({
            rank: index + 1,
            username: score.nickname,
            bestScore: score.score,
            bestWave: score.wave,
            level: 1
          }));
        }
        if (endpoint.includes('/session/') && endpoint.includes('/status')) {
          return {
            success: true,
            session: {
              nickname: window.GameState.nickname,
              score: window.GameState.score,
              wave: window.GameState.currentWave
            },
            wave: {
              currentWave: window.GameState.currentWave,
              waveActive: false,
              enemiesSpawned: 0,
              enemiesKilled: 0
            }
          };
        }
        return { success: false, message: 'Offline mode' };
    }
  },
  
  // Game API endpoints
  startGame(nickname) {
    return this.call('/game/start', 'POST', { nickname });
  },
  
  startWave(sessionId, currentWave) {
    return this.call('/wave/start', 'POST', { sessionId, currentWave });
  },
  
  enemySpawned(sessionId) {
    return this.call('/wave/enemy-spawned', 'POST', { sessionId });
  },
  
  enemyKilled(sessionId, enemyType, currentWave) {
    return this.call('/wave/enemy-killed', 'POST', { sessionId, enemyType, currentWave });
  },
  
  completeWave(sessionId, waveNumber) {
    return this.call('/wave/complete', 'POST', { sessionId, waveNumber });
  },
  
  getSessionStatus(sessionId) {
    return this.call(`/session/${sessionId}/status`);
  },
  
  completeSession(sessionData) {
    return this.call('/session/complete', 'POST', sessionData);
  },
  
  getLeaderboard(type = 'score', limit = 10) {
    return this.call(`/leaderboard/${type}?limit=${limit}`);
  }
};
