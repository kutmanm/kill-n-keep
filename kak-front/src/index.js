import Phaser from 'phaser';
import './styles/index.css';

// API helper
const API = {
  baseUrl: 'http://localhost:8081/api',
  isOnline: true,
  
  async call(endpoint, method = 'GET', data = null) {
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
        return { success: false, message: 'Offline mode' };
    }
  },
  
  // Game API endpoints
  startGame(nickname) {
    return this.call('/game/start', 'POST', { nickname });
  },
  
  getNextWave(wave) {
    return this.call(`/waves/next?wave=${wave}`);
  },
  
  playerAction(action) {
    return this.call('/player/action', 'POST', action);
  },
  
  completeSession(sessionData) {
    return this.call('/session/complete', 'POST', sessionData);
  },
  
  getLeaderboard(type = 'score', limit = 10) {
    return this.call(`/leaderboard/${type}?limit=${limit}`);
  }
};

// Game State
window.GameState = {
  // Player info
  nickname: null,
  sessionId: null,
  selectedClass: 'knight',
  
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

// Preloader Scene
class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload() {
    this.load.image('logo', 'assets/logo.png');
  }

  create() {
    this.add.text(400, 200, 'Loading...', { fontSize: '32px', fill: '#ffffff' });
    
    this.time.delayedCall(1000, () => {
      this.scene.start('MenuScene');
    });
  }
}

// Login Scene
class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    console.log('LoginScene created');
    
    // Background
    this.add.rectangle(600, 300, 1200, 600, 0x1a252f);
    
    // Check if already logged in
    const savedAuth = localStorage.getItem('killnkeep_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        window.GameState.isLoggedIn = true;
        window.GameState.playerId = authData.playerId;
        window.GameState.username = authData.username;
        window.GameState.playerLevel = authData.level;
        window.GameState.bestScore = authData.bestScore;
        
        this.showWelcomeScreen();
        return;
      } catch (e) {
        localStorage.removeItem('killnkeep_auth');
      }
    }

    this.showAuthForm();
  }

  showAuthForm() {
    // Show HTML auth form
    const authForm = document.getElementById('auth-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const messageDiv = document.getElementById('auth-message');
    
    authForm.style.display = 'block';
    
    // Clear previous values
    usernameInput.value = '';
    passwordInput.value = '';
    messageDiv.textContent = '';
    
    // Focus on username field
    setTimeout(() => {
      usernameInput.focus();
    }, 100);
    
    // Handle Enter key
    const handleEnter = (event) => {
      if (event.key === 'Enter') {
        this.login();
      }
    };
    
    usernameInput.addEventListener('keydown', handleEnter);
    passwordInput.addEventListener('keydown', handleEnter);
    
    // Button handlers
    loginBtn.onclick = () => this.login();
    registerBtn.onclick = () => this.register();
    
    // Store references for cleanup
    this.authElements = {
      authForm,
      usernameInput,
      passwordInput,
      loginBtn,
      registerBtn,
      messageDiv,
      handleEnter
    };
  }

  hideAuthForm() {
    if (this.authElements) {
      this.authElements.authForm.style.display = 'none';
      
      // Clean up event listeners
      this.authElements.usernameInput.removeEventListener('keydown', this.authElements.handleEnter);
      this.authElements.passwordInput.removeEventListener('keydown', this.authElements.handleEnter);
      this.authElements.loginBtn.onclick = null;
      this.authElements.registerBtn.onclick = null;
    }
  }

  showMessage(text, isSuccess = false) {
    if (this.authElements && this.authElements.messageDiv) {
      this.authElements.messageDiv.textContent = text;
      this.authElements.messageDiv.className = isSuccess ? 'auth-message success' : 'auth-message';
    }
  }

  login() {
    const username = this.authElements.usernameInput.value.trim();
    const password = this.authElements.passwordInput.value;
    
    if (!username || !password) {
      this.showMessage('Please enter username and password');
      return;
    }

    // Disable buttons during request
    this.authElements.loginBtn.disabled = true;
    this.authElements.registerBtn.disabled = true;
    this.showMessage('Logging in...');

    API.call('/auth/login', 'POST', {
      username: username,
      password: password
    }).then(response => {
      this.authElements.loginBtn.disabled = false;
      this.authElements.registerBtn.disabled = false;
      
      if (response.success) {
        // Save auth data
        localStorage.setItem('killnkeep_auth', JSON.stringify({
          playerId: response.playerId,
          username: response.username,
          level: response.level,
          bestScore: response.bestScore,
          bestWave: response.bestWave
        }));

        // Update game state
        window.GameState.isLoggedIn = true;
        window.GameState.playerId = response.playerId;
        window.GameState.username = response.username;
        window.GameState.playerLevel = response.level;
        window.GameState.bestScore = response.bestScore;

        this.hideAuthForm();
        this.showWelcomeScreen();
      } else {
        this.showMessage(response.message || 'Login failed');
      }
    }).catch(error => {
      this.authElements.loginBtn.disabled = false;
      this.authElements.registerBtn.disabled = false;
      this.showMessage('Network error. Please try again.');
      console.error('Login error:', error);
    });
  }

  register() {
    const username = this.authElements.usernameInput.value.trim();
    const password = this.authElements.passwordInput.value;
    
    if (!username || !password) {
      this.showMessage('Please enter username and password');
      return;
    }

    if (username.length < 3) {
      this.showMessage('Username must be at least 3 characters');
      return;
    }

    if (password.length < 3) {
      this.showMessage('Password must be at least 3 characters');
      return;
    }

    // Disable buttons during request
    this.authElements.loginBtn.disabled = true;
    this.authElements.registerBtn.disabled = true;
    this.showMessage('Creating account...');

    API.call('/auth/register', 'POST', {
      username: username,
      password: password,
      email: `${username}@killnkeep.com`
    }).then(response => {
      this.authElements.loginBtn.disabled = false;
      this.authElements.registerBtn.disabled = false;
      
      if (response.success) {
        this.showMessage('Registration successful! Please login.', true);
        // Clear password field
        this.authElements.passwordInput.value = '';
        this.authElements.passwordInput.focus();
      } else {
        this.showMessage(response.message || 'Registration failed');
      }
    }).catch(error => {
      this.authElements.loginBtn.disabled = false;
      this.authElements.registerBtn.disabled = false;
      this.showMessage('Network error. Please try again.');
      console.error('Register error:', error);
    });
  }

  showWelcomeScreen() {
    // Clear the scene
    this.children.removeAll();

    // Background
    this.add.rectangle(600, 300, 1200, 600, 0x1a252f);
    
    // Welcome message
    this.add.text(600, 150, `Welcome back, ${window.GameState.username}!`, {
      fontSize: '32px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.add.text(600, 200, `Level: ${window.GameState.playerLevel} | Best Score: ${window.GameState.bestScore}`, {
      fontSize: '18px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Start Game button
    const startButton = this.add.rectangle(600, 280, 200, 50, 0x27ae60);
    this.add.text(600, 280, 'START GAME', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    startButton.setInteractive();
    startButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Leaderboard button
    const leaderboardButton = this.add.rectangle(600, 350, 200, 50, 0x3498db);
    this.add.text(600, 350, 'LEADERBOARD', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    leaderboardButton.setInteractive();
    leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });

    // Logout button
    const logoutButton = this.add.rectangle(600, 420, 200, 50, 0xe74c3c);
    this.add.text(600, 420, 'LOGOUT', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    logoutButton.setInteractive();
    logoutButton.on('pointerdown', () => {
      localStorage.removeItem('killnkeep_auth');
      window.GameState.isLoggedIn = false;
      this.scene.restart();
    });
  }

  shutdown() {
    // Clean up when scene is destroyed
    this.hideAuthForm();
  }
}

// Leaderboard Scene
class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create() {
    console.log('LeaderboardScene created');
    
    // Background
    this.add.rectangle(600, 300, 1200, 600, 0x1a252f);
    
    // Title
    this.add.text(600, 80, 'LEADERBOARD', {
      fontSize: '36px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Tab buttons
    this.createTabButtons();
    
    // Load default leaderboard
    this.loadLeaderboard('score');

    // Back button
    const backButton = this.add.rectangle(100, 550, 120, 40, 0x95a5a6);
    this.add.text(100, 550, 'BACK', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    backButton.setInteractive();
    backButton.on('pointerdown', () => {
      this.scene.start('LoginScene');
    });
  }

  createTabButtons() {
    // Score tab
    this.scoreTab = this.add.rectangle(500, 130, 150, 40, 0x3498db);
    this.add.text(500, 130, 'TOP SCORES', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.scoreTab.setInteractive();
    this.scoreTab.on('pointerdown', () => {
      this.loadLeaderboard('score');
      this.updateTabHighlight('score');
    });

    // Wave tab
    this.waveTab = this.add.rectangle(700, 130, 150, 40, 0x2c3e50);
    this.add.text(700, 130, 'TOP WAVES', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.waveTab.setInteractive();
    this.waveTab.on('pointerdown', () => {
      this.loadLeaderboard('wave');
      this.updateTabHighlight('wave');
    });

    this.currentTab = 'score';
  }

  updateTabHighlight(activeTab) {
    this.scoreTab.setFillStyle(activeTab === 'score' ? 0x3498db : 0x2c3e50);
    this.waveTab.setFillStyle(activeTab === 'wave' ? 0x3498db : 0x2c3e50);
    this.currentTab = activeTab;
  }

  loadLeaderboard(type) {
    // Clear existing leaderboard
    if (this.leaderboardGroup) {
      this.leaderboardGroup.clear(true, true);
    }
    this.leaderboardGroup = this.add.group();

    // Show loading
    const loadingText = this.add.text(600, 300, 'Loading...', {
      fontSize: '20px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Fetch leaderboard data
    API.getLeaderboard(type, 10).then(response => {
      loadingText.destroy();

      if (response && Array.isArray(response)) {
        this.displayLeaderboard(response, type);
      } else {
        this.add.text(600, 300, 'Failed to load leaderboard', {
          fontSize: '20px',
          fill: '#e74c3c',
          fontFamily: 'Courier New'
        }).setOrigin(0.5);
      }
    });
  }

  displayLeaderboard(data, type) {
    const startY = 180;
    const lineHeight = 35;

    // Header
    const headerText = type === 'score' ? 'RANK  |  USERNAME  |  BEST SCORE  |  LEVEL' : 'RANK  |  USERNAME  |  BEST WAVE  |  LEVEL';
    const header = this.add.text(600, startY, headerText, {
      fontSize: '16px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    this.leaderboardGroup.add(header);

    // Entries
    data.forEach((entry, index) => {
      const y = startY + 40 + (index * lineHeight);
      
      const rankColor = index < 3 ? ['#FFD700', '#C0C0C0', '#CD7F32'][index] : '#ffffff';
      const mainValue = type === 'score' ? entry.bestScore : entry.bestWave;
      
      const entryText = `${entry.rank.toString().padStart(2, ' ')}    |  ${entry.username.padEnd(12, ' ')}  |  ${mainValue.toString().padStart(8, ' ')}  |  ${entry.level}`;
      
      const entryDisplay = this.add.text(600, y, entryText, {
        fontSize: '14px',
        fill: rankColor,
        fontFamily: 'Courier New'
      }).setOrigin(0.5);
      
      this.leaderboardGroup.add(entryDisplay);

      // Highlight current player
      if (entry.username === window.GameState.username) {
        const highlight = this.add.rectangle(600, y, 500, 25, 0x2c3e50, 0.5);
        this.leaderboardGroup.add(highlight);
        entryDisplay.setDepth(1);
      }
    });
  }
}

// Menu Scene
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    console.log('MenuScene created');
    
    // Background
    this.add.rectangle(600, 300, 1200, 600, 0x1a252f);
    
    // Title
    this.add.text(600, 80, 'KILL N\' KEEP', {
      fontSize: '48px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    this.add.text(600, 120, 'Defend the Treasure!', {
      fontSize: '20px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.createClassSelection();
    this.createButtons();
  }

  createClassSelection() {
    this.add.text(600, 200, 'Choose Your Class:', {
      fontSize: '24px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.classButtons = [];
    this.createClassButton(200, 300, 'KNIGHT', 'knight', 0xe74c3c, 
      'Tank Fighter\nMelee Combat\nHigh Health');
    this.createClassButton(600, 300, 'ARCHER', 'archer', 0x27ae60,
      'Ranged DPS\nBow Shooting\nHigh Speed');
    this.createClassButton(1000, 300, 'MAGE', 'mage', 0x3498db,
      'Magic DPS\nFireball Magic\nHigh Damage');

    this.add.text(600, 380, 'Controls: WASD = Move, Mouse Click = Attack, SPACE = Special Skill', {
      fontSize: '14px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
  }

  createClassButton(x, y, name, className, color, description) {
    const button = this.add.rectangle(x, y, 160, 100, color);
    const text = this.add.text(x, y - 25, name, {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    const desc = this.add.text(x, y + 10, description, {
      fontSize: '10px',
      fill: '#ffffff',
      fontFamily: 'Courier New',
      align: 'center'
    }).setOrigin(0.5);

    button.setInteractive({ useHandCursor: true });
    
    button.on('pointerdown', () => {
      window.GameState.selectedClass = className;
      
      this.classButtons.forEach(btn => btn.setStrokeStyle(0));
      button.setStrokeStyle(3, 0xffffff);
      
      console.log('Selected class:', className);
    });

    this.classButtons.push(button);
    
    if (className === 'knight') {
      button.setStrokeStyle(3, 0xffffff);
    }
  }

  createButtons() {
    const startButton = this.add.rectangle(600, 450, 200, 50, 0x2ecc71);
    this.add.text(600, 450, 'START GAME', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    startButton.setInteractive({ useHandCursor: true });
    startButton.on('pointerdown', () => this.startGame());

    const leaderboardButton = this.add.rectangle(400, 450, 150, 40, 0x3498db);
    this.add.text(400, 450, 'LEADERBOARD', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    leaderboardButton.setInteractive({ useHandCursor: true });
    leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });
  }

  startGame() {
    // Prevent multiple clicks
    if (this.isStarting) return;
    this.isStarting = true;
    
    // Generate a simple nickname
    window.GameState.nickname = 'Player' + Math.floor(Math.random() * 1000);
    
    console.log('Starting game with class:', window.GameState.selectedClass);
    console.log('Player nickname:', window.GameState.nickname);
    
    // Show loading message
    const loadingText = this.add.text(600, 500, 'Starting game...', {
      fontSize: '16px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Start game immediately without API call for now
    this.time.delayedCall(500, () => {
      window.GameState.sessionId = 'local-' + Date.now();
      window.GameState.isOfflineMode = true;
      
      // Reset game state
      window.GameState.score = 0;
      window.GameState.currentWave = 1;
      window.GameState.treasureHealth = 100;
      
      loadingText.destroy();
      
      // Start game scenes
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    });
  }

  shutdown() {
    this.isStarting = false;
  }
}

// Game Scene
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('GameScene created with class:', window.GameState.selectedClass);
    
    // Ensure we have a selected class
    if (!window.GameState.selectedClass) {
      window.GameState.selectedClass = 'knight';
    }
    
    // Reset game state
    window.GameState.score = 0;
    window.GameState.currentWave = 1;
    window.GameState.treasureHealth = 100;
    
    this.input.enabled = true;
    
    this.createSprites();
    this.createWorld();
    this.createPlayer();
    this.createTreasure();
    this.setupControls();
    
    this.enemies = this.add.group();
    this.projectiles = this.add.group();
    this.effects = this.add.group();
    
    this.playerCooldowns = {
      attack: 0,
      skill: 0
    };
    
    // Start enemy spawning after a short delay
    this.time.delayedCall(2000, () => {
      this.enemySpawnTimer = this.time.addEvent({
        delay: 3000,
        callback: this.spawnEnemy,
        callbackScope: this,
        loop: true
      });
    });
    
    console.log('Game scene setup complete');
  }

  createSprites() {
    const graphics = this.add.graphics();
    
    // Knight (redesigned with better armor and shield)
    graphics.fillStyle(0x2c3e50); // Dark blue base
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0x3498db); // Bright blue armor
    graphics.fillRect(2, 2, 28, 28);
    graphics.fillStyle(0xbdc3c7); // Silver armor plates
    graphics.fillRect(4, 4, 24, 24);
    graphics.fillStyle(0xf39c12); // Golden trim
    graphics.fillRect(0, 0, 32, 3);
    graphics.fillRect(0, 29, 32, 3);
    graphics.fillRect(0, 0, 3, 32);
    graphics.fillRect(29, 0, 3, 32);
    // Shield
    graphics.fillStyle(0x95a5a6); // Silver shield
    graphics.fillCircle(8, 16, 6);
    graphics.fillStyle(0xe74c3c); // Red cross on shield
    graphics.fillRect(6, 14, 4, 4);
    graphics.fillRect(7, 13, 2, 6);
    // Sword
    graphics.fillStyle(0xbdc3c7); // Silver sword
    graphics.fillRect(24, 6, 2, 20);
    graphics.fillRect(22, 4, 6, 4); // Crossguard
    graphics.generateTexture('knight', 32, 32);
    
    // Archer (green with bow)
    graphics.clear();
    graphics.fillStyle(0x27ae60); // Green body
    graphics.fillCircle(16, 16, 16);
    graphics.fillStyle(0x2d5a3d); // Dark green
    graphics.fillCircle(16, 16, 12);
    graphics.fillStyle(0x8b4513); // Brown bow
    graphics.fillRect(6, 14, 20, 4);
    graphics.fillRect(14, 6, 4, 20);
    graphics.fillStyle(0xf1c40f); // Yellow arrow
    graphics.fillTriangle(16, 8, 14, 12, 18, 12);
    graphics.generateTexture('archer', 32, 32);
    
    // Mage (purple with diamond)
    graphics.clear();
    graphics.fillStyle(0x9b59b6); // Purple robe
    graphics.fillTriangle(16, 2, 4, 30, 28, 30);
    graphics.fillStyle(0x6c3483); // Dark purple
    graphics.fillTriangle(16, 6, 8, 26, 24, 26);
    graphics.fillStyle(0xf1c40f); // Golden diamond
    graphics.fillTriangle(16, 8, 12, 16, 16, 24);
    graphics.fillTriangle(16, 8, 20, 16, 16, 24);
    graphics.fillStyle(0xe74c3c); // Red orb
    graphics.fillCircle(16, 10, 3);
    graphics.generateTexture('mage', 32, 32);
    
    // Enemy (detailed orc)
    graphics.clear();
    graphics.fillStyle(0x8b4513); // Brown body
    graphics.fillCircle(12, 12, 12);
    graphics.fillStyle(0xe74c3c); // Red eyes
    graphics.fillCircle(8, 8, 2);
    graphics.fillCircle(16, 8, 2);
    graphics.fillStyle(0x2c3e50); // Dark weapon
    graphics.fillRect(4, 16, 16, 4);
    graphics.fillTriangle(20, 18, 24, 16, 24, 20);
    graphics.generateTexture('enemy', 24, 24);
    
    // Treasure (detailed chest)
    graphics.clear();
    graphics.fillStyle(0x8b4513); // Brown wood
    graphics.fillRect(0, 16, 64, 32);
    graphics.fillStyle(0xf1c40f); // Gold
    graphics.fillRect(4, 20, 56, 24);
    graphics.fillStyle(0xd4af37); // Dark gold trim
    graphics.fillRect(0, 16, 64, 4);
    graphics.fillRect(0, 44, 64, 4);
    graphics.fillRect(28, 24, 8, 8); // Lock
    graphics.generateTexture('treasure', 64, 64);
    
    // Projectiles
    // Arrow
    graphics.clear();
    graphics.fillStyle(0x8b4513); // Brown shaft
    graphics.fillRect(0, 6, 20, 4);
    graphics.fillStyle(0xc0c0c0); // Silver tip
    graphics.fillTriangle(20, 8, 24, 6, 24, 10);
    graphics.fillStyle(0x228b22); // Green feathers
    graphics.fillTriangle(0, 8, 4, 6, 4, 10);
    graphics.generateTexture('arrow', 24, 16);
    
    // Fireball
    graphics.clear();
    graphics.fillStyle(0xff4500); // Orange fire
    graphics.fillCircle(12, 12, 12);
    graphics.fillStyle(0xffd700); // Yellow core
    graphics.fillCircle(12, 12, 8);
    graphics.fillStyle(0xff6347); // Red-orange middle
    graphics.fillCircle(12, 12, 4);
    graphics.generateTexture('fireball', 24, 24);
    
    graphics.destroy();
  }

  createWorld() {
    this.add.rectangle(600, 300, 1200, 600, 0x228b22);
    this.physics.world.gravity.y = 0;
  }

  createPlayer() {
    const className = window.GameState.selectedClass;
    this.player = this.physics.add.sprite(300, 300, className); // Start away from treasure
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(300);
    
    this.setPlayerStats();
  }

  setPlayerStats() {
    const className = window.GameState.selectedClass;
    switch(className) {
      case 'knight':
        this.player.health = 150;
        this.player.maxHealth = 150;
        this.player.speed = 200;
        this.player.damage = 35; // Increased damage
        this.player.attackRange = 100; // Increased range
        this.player.skillCooldown = 5000; // Longer cooldown for powerful skill
        break;
      case 'archer':
        this.player.health = 100;
        this.player.maxHealth = 100;
        this.player.speed = 250;
        this.player.damage = 25;
        this.player.attackRange = 300;
        this.player.skillCooldown = 2000;
        break;
      case 'mage':
        this.player.health = 80;
        this.player.maxHealth = 80;
        this.player.speed = 180;
        this.player.damage = 35;
        this.player.attackRange = 200;
        this.player.skillCooldown = 4000;
        break;
    }
    window.GameState.playerHealth = this.player.health;
  }

  createTreasure() {
    this.treasure = this.physics.add.sprite(600, 300, 'treasure');
    this.treasure.setImmovable(true);
    this.treasure.health = 100;
    window.GameState.treasureHealth = this.treasure.health;
  }

  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    this.input.on('pointerdown', (pointer) => {
      if (this.playerCooldowns.attack <= 0) {
        this.mouseX = pointer.x;
        this.mouseY = pointer.y;
        this.playerAttack();
        this.playerCooldowns.attack = 300; // Faster attack speed
      }
    });
  }

  spawnEnemy() {
    const edge = Phaser.Math.Between(0, 3);
    let x, y;
    
    switch(edge) {
      case 0: x = Phaser.Math.Between(50, 1150); y = 25; break;
      case 1: x = 1175; y = Phaser.Math.Between(50, 550); break;
      case 2: x = Phaser.Math.Between(50, 1150); y = 575; break;
      case 3: x = 25; y = Phaser.Math.Between(50, 550); break;
    }
    
    const enemy = this.physics.add.sprite(x, y, 'enemy');
    enemy.setCollideWorldBounds(true);
    enemy.health = 40;
    enemy.speed = 60;
    enemy.setDrag(100);
    
    this.enemies.add(enemy);
  }

  update() {
    if (!this.player) return;
    
    this.playerCooldowns.attack = Math.max(0, this.playerCooldowns.attack - this.game.loop.delta);
    this.playerCooldowns.skill = Math.max(0, this.playerCooldowns.skill - this.game.loop.delta);
    
    this.handlePlayerMovement();
    this.handlePlayerActions();
    this.updateEnemies();
    this.updateProjectiles();
    this.updateAllyKnights();
  }

  handlePlayerMovement() {
    let velocityX = 0;
    let velocityY = 0;
    
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -this.player.speed;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = this.player.speed;
    }
    
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -this.player.speed;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = this.player.speed;
    }
    
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }
    
    this.player.setVelocity(velocityX, velocityY);
  }

  handlePlayerActions() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.playerCooldowns.skill <= 0) {
      this.playerSkill();
      this.playerCooldowns.skill = this.player.skillCooldown;
    }
  }

  playerAttack() {
    const className = window.GameState.selectedClass;
    
    switch(className) {
      case 'knight':
        this.knightMeleeAttack();
        break;
      case 'archer':
        this.archerRangedAttack();
        break;
      case 'mage':
        this.mageSpellAttack();
        break;
    }
  }

  knightMeleeAttack() {
    const attackRange = this.player.attackRange;
    const mouseAngle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    const arcAngle = Math.PI / 1.5; // Wider attack arc
    
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      const distanceToEnemy = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      
      if (distanceToEnemy <= attackRange) {
        const enemyAngle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );
        
        let angleDiff = enemyAngle - mouseAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        if (Math.abs(angleDiff) <= arcAngle / 2) {
          this.damageEnemy(enemy, this.player.damage);
        }
      }
    });
    
    // Enhanced visual effect
    this.drawSwordSlash(this.player.x, this.player.y, attackRange, mouseAngle, arcAngle);
  }

  drawSwordSlash(x, y, radius, mouseAngle, arcAngle) {
    const graphics = this.add.graphics();
    
    // Main sword arc
    graphics.lineStyle(8, 0xffffff, 0.9);
    graphics.beginPath();
    graphics.arc(x, y, radius, mouseAngle - arcAngle / 2, mouseAngle + arcAngle / 2);
    graphics.strokePath();
    
    // Add sparkle effects
    for (let i = 0; i < 5; i++) {
      const sparkleAngle = mouseAngle - arcAngle / 2 + (arcAngle / 4) * i;
      const sparkleX = x + (radius * 0.8) * Math.cos(sparkleAngle);
      const sparkleY = y + (radius * 0.8) * Math.sin(sparkleAngle);
      
      const sparkle = this.add.circle(sparkleX, sparkleY, 3, 0xffff00, 0.8);
      this.time.delayedCall(150, () => sparkle.destroy());
    }
    
    this.time.delayedCall(200, () => {
      if (graphics && graphics.scene) {
        graphics.destroy();
      }
    });
  }

  archerRangedAttack() {
    console.log('Archer shoots arrow!');
    
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
    arrow.damage = this.player.damage;
    arrow.rotation = angle;
    arrow.setVelocity(
      400 * Math.cos(angle),
      400 * Math.sin(angle)
    );
    
    this.projectiles.add(arrow);
  }

  mageSpellAttack() {
    console.log('Mage casts fireball!');
    
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    const fireball = this.physics.add.sprite(this.player.x, this.player.y, 'fireball');
    fireball.damage = this.player.damage;
    fireball.setVelocity(
      300 * Math.cos(angle),
      300 * Math.sin(angle)
    );
    
    this.projectiles.add(fireball);
  }

  playerSkill() {
    const className = window.GameState.selectedClass;
    console.log(`${className} uses ultimate skill!`);
    
    switch(className) {
      case 'knight':
        this.knightShieldBash();
        break;
      case 'archer':
        this.archerArrowStorm();
        break;
      case 'mage':
        this.mageFrostNova();
        break;
    }
  }

  knightShieldBash() {
    console.log('Knight summons ally knights!');
    
    // Create 3 ally knights around the player
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const distance = 80;
      const knightX = this.player.x + distance * Math.cos(angle);
      const knightY = this.player.y + distance * Math.sin(angle);
      
      // Create ally knight sprite
      const allyKnight = this.physics.add.sprite(knightX, knightY, 'knight');
      allyKnight.setTint(0x00ff00); // Green tint to show it's an ally
      allyKnight.setScale(0.8); // Slightly smaller
      allyKnight.health = 50;
      allyKnight.damage = 20;
      allyKnight.attackRange = 60;
      allyKnight.isAlly = true;
      
      // Store ally knights for updates
      if (!this.allyKnights) {
        this.allyKnights = this.add.group();
      }
      this.allyKnights.add(allyKnight);
      
      // Remove ally after 10 seconds
      this.time.delayedCall(10000, () => {
        if (allyKnight && allyKnight.active) {
          // Fade out effect
          this.tweens.add({
            targets: allyKnight,
            alpha: 0,
            duration: 500,
            onComplete: () => allyKnight.destroy()
          });
        }
      });
    }
    
    // Visual effect
    const effect = this.add.circle(this.player.x, this.player.y, 120, 0x3498db, 0.3);
    this.time.delayedCall(500, () => effect.destroy());
  }

  archerArrowStorm() {
    console.log('Archer uses Arrow Storm!');
    
    // Shoot 8 arrows in all directions
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
      arrow.damage = this.player.damage;
      arrow.rotation = angle;
      arrow.setVelocity(
        350 * Math.cos(angle),
        350 * Math.sin(angle)
      );
      
      this.projectiles.add(arrow);
    }
  }

  mageFrostNova() {
    console.log('Mage uses Frost Nova!');
    const novaRange = 150;
    
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      
      if (distance <= novaRange) {
        this.damageEnemy(enemy, this.player.damage * 1.5);
        
        // Freeze effect
        enemy.setTint(0x00bfff);
        enemy.originalSpeed = enemy.speed;
        enemy.speed = enemy.speed * 0.3;
        
        this.time.delayedCall(3000, () => {
          if (enemy && enemy.active) {
            enemy.clearTint();
            enemy.speed = enemy.originalSpeed || 60;
          }
        });
      }
    });
    
    // Visual effect
    const effect = this.add.circle(this.player.x, this.player.y, novaRange, 0x00bfff, 0.3);
    this.time.delayedCall(500, () => effect.destroy());
  }

  update() {
    if (!this.player) return;
    
    this.playerCooldowns.attack = Math.max(0, this.playerCooldowns.attack - this.game.loop.delta);
    this.playerCooldowns.skill = Math.max(0, this.playerCooldowns.skill - this.game.loop.delta);
    
    this.handlePlayerMovement();
    this.handlePlayerActions();
    this.updateEnemies();
    this.updateProjectiles();
    this.updateAllyKnights();
  }

  updateAllyKnights() {
    if (!this.allyKnights) return;
    
    this.allyKnights.children.entries.forEach(allyKnight => {
      if (!allyKnight || !allyKnight.active) return;
      
      // Find nearest enemy
      let nearestEnemy = null;
      let nearestDistance = Infinity;
      
      this.enemies.children.entries.forEach(enemy => {
        if (!enemy || !enemy.active) return;
        
        const distance = Phaser.Math.Distance.Between(
          allyKnight.x, allyKnight.y,
          enemy.x, enemy.y
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = enemy;
        }
      });
      
      if (nearestEnemy && nearestDistance < 200) {
        // Move towards enemy
        const angle = Phaser.Math.Angle.Between(
          allyKnight.x, allyKnight.y,
          nearestEnemy.x, nearestEnemy.y
        );
        
        allyKnight.setVelocity(
          120 * Math.cos(angle),
          120 * Math.sin(angle)
        );
        
        // Attack if close enough
        if (nearestDistance < allyKnight.attackRange) {
          // Attack cooldown check (store on sprite)
          if (!allyKnight.lastAttack || this.time.now - allyKnight.lastAttack > 1000) {
            this.damageEnemy(nearestEnemy, allyKnight.damage);
            allyKnight.lastAttack = this.time.now;
            
            // Visual attack effect
            const line = this.add.line(0, 0, allyKnight.x, allyKnight.y, nearestEnemy.x, nearestEnemy.y, 0xffffff);
            line.setLineWidth(3);
            this.time.delayedCall(100, () => line.destroy());
          }
        }
      } else {
        // No enemy nearby, follow player
        const distanceToPlayer = Phaser.Math.Distance.Between(
          allyKnight.x, allyKnight.y,
          this.player.x, this.player.y
        );
        
        if (distanceToPlayer > 100) {
          const angle = Phaser.Math.Angle.Between(
            allyKnight.x, allyKnight.y,
            this.player.x, this.player.y
          );
          
          allyKnight.setVelocity(
            80 * Math.cos(angle),
            80 * Math.sin(angle)
          );
        } else {
          allyKnight.setVelocity(0, 0);
        }
      }
    });
  }

  updateEnemies() {
    const enemiesList = [...this.enemies.children.entries];
    
    enemiesList.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      // Move towards treasure
      const treasureAngle = Phaser.Math.Angle.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      enemy.setVelocity(
        enemy.speed * Math.cos(treasureAngle),
        enemy.speed * Math.sin(treasureAngle)
      );
      
      // Check collision with treasure
      const treasureDistance = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      if (treasureDistance < 40) {
        this.treasure.health -= 15;
        enemy.destroy();
        window.GameState.treasureHealth = this.treasure.health;
        
        if (this.treasure.health <= 0) {
          this.gameOver();
        }
      }
      
      // Check collision with player
      const playerDistance = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.player.x, this.player.y
      );
      
      if (playerDistance < 30) {
        this.damagePlayer(10);
        enemy.destroy();
      }
    });
  }

  updateProjectiles() {
    const projectilesList = [...this.projectiles.children.entries];
    
    projectilesList.forEach(projectile => {
      if (!projectile || !projectile.active) return;
      
      // Check collision with enemies
      this.enemies.children.entries.forEach(enemy => {
        if (!enemy || !enemy.active) return;
        
        const distance = Phaser.Math.Distance.Between(
          projectile.x, projectile.y,
          enemy.x, enemy.y
        );
        
        if (distance < 20) {
          this.damageEnemy(enemy, projectile.damage);
          projectile.destroy();
        }
      });
      
      // Remove projectiles that are off-screen
      if (projectile.x < -50 || projectile.x > 1250 || 
          projectile.y < -50 || projectile.y > 650) {
        projectile.destroy();
      }
    });
  }

  damageEnemy(enemy, damage) {
    if (!enemy || !enemy.active) return;
    
    enemy.health -= damage;
    enemy.setTint(0xff0000);
    
    this.time.delayedCall(100, () => {
      if (enemy && enemy.active) {
        enemy.clearTint();
      }
    });
    
    if (enemy.health <= 0) {
      enemy.destroy();
      window.GameState.score += 10;
    }
  }

  damagePlayer(damage) {
    this.player.health -= damage;
    window.GameState.playerHealth = this.player.health;
    
    // Visual damage effect
    this.player.setTint(0xff0000);
    this.time.delayedCall(200, () => {
      if (this.player && this.player.active) {
        this.player.clearTint();
      }
    });
    
    if (this.player.health <= 0) {
      this.gameOver();
    }
  }

  gameOver() {
    console.log('Game Over triggered');
    
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.destroy();
      this.enemySpawnTimer = null;
    }
    
    // Clean up ally knights
    if (this.allyKnights) {
      this.allyKnights.clear(true, true);
    }
    
    this.input.enabled = false;
    this.physics.pause();

    // Save score locally
    const scores = JSON.parse(localStorage.getItem('kak_offline_scores') || '[]');
    scores.push({
      score: window.GameState.score,
      wave: window.GameState.currentWave,
      date: new Date().toISOString(),
      nickname: window.GameState.nickname
    });
    localStorage.setItem('kak_offline_scores', JSON.stringify(scores));
    
    const overlay = this.add.rectangle(600, 300, 1200, 600, 0x000000, 0.8);
    
    this.add.text(600, 200, 'GAME OVER', {
      fontSize: '48px',
      fill: '#ff0000',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    this.add.text(600, 270, `Final Score: ${window.GameState.score}`, {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.add.text(600, 310, 'Score saved locally', {
      fontSize: '14px',
      fill: '#f39c12',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    const restartButton = this.add.rectangle(600, 420, 200, 50, 0x2ecc71);
    const restartText = this.add.text(600, 420, 'PLAY AGAIN', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on('pointerdown', () => {
      console.log('Restarting game');
      
      // Reset game state properly
      window.GameState.score = 0;
      window.GameState.currentWave = 1;
      window.GameState.treasureHealth = 100;
      
      this.scene.stop('UIScene');
      this.scene.restart();
      this.scene.launch('UIScene');
    });

    const menuButton = this.add.rectangle(600, 480, 200, 50, 0x3498db);
    const menuText = this.add.text(600, 480, 'MAIN MENU', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    menuButton.setInteractive({ useHandCursor: true });
    menuButton.on('pointerdown', () => {
      console.log('Going to main menu');
      
      // Reset game state
      window.GameState.score = 0;
      window.GameState.currentWave = 1;
      window.GameState.treasureHealth = 100;
      
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });
  }
}

// UI Scene
class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.healthText = this.add.text(20, 20, 'Health: 100', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    });

    this.treasureHealthText = this.add.text(20, 45, 'Treasure: 100', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    });

    this.waveText = this.add.text(20, 70, 'Wave: 1', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    });

    this.scoreText = this.add.text(20, 95, 'Score: 0', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    });

    // Show offline mode indicator
    if (window.GameState.isOfflineMode) {
      this.offlineText = this.add.text(20, 120, 'OFFLINE MODE', {
        fontSize: '12px',
        fill: '#f39c12',
        fontFamily: 'Courier New'
      });
    }
  }

  update() {
    if (this.healthText) {
      this.healthText.setText(`Health: ${window.GameState.playerHealth}`);
    }
    if (this.treasureHealthText) {
      this.treasureHealthText.setText(`Treasure: ${window.GameState.treasureHealth}`);
    }
    if (this.waveText) {
      this.waveText.setText(`Wave: ${window.GameState.currentWave}`);
    }
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${window.GameState.score}`);
    }
  }
}

// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 1200,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2c3e50',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [PreloaderScene, LoginScene, LeaderboardScene, MenuScene, GameScene, UIScene]
};

window.game = new Phaser.Game(config);
console.log('Kill-n-Keep game initialized!');
