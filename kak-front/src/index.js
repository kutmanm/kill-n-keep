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
    // Don't try to load logo that doesn't exist
    // this.load.image('logo', 'assets/logo.png');
  }

  create() {
    // Create sprites programmatically without loading screen
    this.createAllSprites();
    
    // Go directly to MenuScene
    this.scene.start('MenuScene');
  }
  
  createAllSprites() {
    const graphics = this.add.graphics();
    
    // Create detailed KNIGHT sprites
    graphics.fillStyle(0x95a5a6); // Silver armor
    graphics.fillRect(48, 16, 32, 80); // Body
    graphics.fillRect(40, 24, 48, 16); // Shoulders
    
    graphics.fillStyle(0xf4d03f); // Gold trim
    graphics.fillRect(46, 32, 36, 4); // Chest plate trim
    graphics.fillRect(58, 20, 12, 8); // Helmet trim
    
    graphics.fillStyle(0x2c3e50); // Dark visor
    graphics.fillRect(60, 24, 8, 4);
    
    graphics.fillStyle(0x8b4513); // Brown handle
    graphics.fillRect(16, 32, 4, 32); // Sword handle
    graphics.fillStyle(0xc0c0c0); // Silver blade
    graphics.fillRect(12, 16, 12, 24); // Sword blade
    
    graphics.fillStyle(0xe74c3c); // Red cape
    graphics.fillTriangle(80, 24, 96, 32, 80, 64);
    
    graphics.generateTexture('knight-idle', 128, 128);
    
    // Knight running pose
    graphics.clear();
    graphics.fillStyle(0x95a5a6);
    graphics.fillRect(52, 16, 32, 80); // Body leaning forward
    graphics.fillRect(44, 24, 48, 16); // Shoulders
    
    graphics.fillStyle(0xf4d03f);
    graphics.fillRect(50, 32, 36, 4);
    graphics.fillRect(62, 20, 12, 8);
    
    graphics.fillStyle(0x2c3e50);
    graphics.fillRect(64, 24, 8, 4);
    
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(20, 28, 4, 32); // Sword angled
    graphics.fillStyle(0xc0c0c0);
    graphics.fillRect(16, 12, 12, 24);
    
    graphics.fillStyle(0xe74c3c);
    graphics.fillTriangle(84, 20, 100, 28, 84, 60); // Cape flowing
    
    graphics.generateTexture('knight-run', 128, 128);
    
    // Create other knight animation frames
    graphics.generateTexture('knight-walk', 128, 128);
    graphics.generateTexture('knight-jump', 128, 128);
    graphics.generateTexture('knight-attack1', 128, 128);
    graphics.generateTexture('knight-attack2', 128, 128);
    graphics.generateTexture('knight-attack3', 128, 128);
    graphics.generateTexture('knight-hurt', 128, 128);
    graphics.generateTexture('knight-dead', 128, 128);
    graphics.generateTexture('knight-runattack', 128, 128);
    graphics.generateTexture('knight-protect', 128, 128);
    
    // Create detailed ARCHER sprites
    graphics.clear();
    
    // Archer idle pose
    graphics.fillStyle(0x27ae60); // Green leather armor
    graphics.fillRect(48, 20, 32, 76); // Body
    graphics.fillRect(44, 24, 40, 12); // Shoulders
    
    graphics.fillStyle(0x2d5a3d); // Dark green trim
    graphics.fillRect(46, 28, 36, 4); // Chest trim
    graphics.fillRect(46, 36, 36, 4); // Belt
    
    graphics.fillStyle(0x8b4513); // Brown hood
    graphics.fillCircle(64, 20, 14); // Hood
    graphics.fillStyle(0xfdbcb4); // Skin tone
    graphics.fillCircle(64, 24, 6); // Face
    
    graphics.fillStyle(0x2c3e50); // Dark eyes
    graphics.fillRect(62, 22, 2, 2);
    graphics.fillRect(66, 22, 2, 2);
    
    // Bow (remove the strokeLineStyle call that was causing error)
    graphics.fillStyle(0x8b4513); // Brown bow
    graphics.fillRect(24, 16, 4, 48); // Bow staff
    
    // Quiver
    graphics.fillStyle(0x654321); // Brown quiver
    graphics.fillRect(84, 28, 8, 24);
    graphics.fillStyle(0xf1c40f); // Yellow arrows
    graphics.fillRect(86, 30, 4, 16);
    
    graphics.generateTexture('archer-idle', 128, 128);
    
    // Archer running pose
    graphics.clear();
    graphics.fillStyle(0x27ae60);
    graphics.fillRect(52, 20, 32, 76); // Body leaning forward
    graphics.fillRect(48, 24, 40, 12);
    
    graphics.fillStyle(0x2d5a3d);
    graphics.fillRect(50, 28, 36, 4);
    graphics.fillRect(50, 36, 36, 4);
    
    graphics.fillStyle(0x8b4513);
    graphics.fillCircle(68, 18, 14); // Hood leaning
    graphics.fillStyle(0xfdbcb4);
    graphics.fillCircle(68, 22, 6);
    
    graphics.fillStyle(0x2c3e50);
    graphics.fillRect(66, 20, 2, 2);
    graphics.fillRect(70, 20, 2, 2);
    
    // Bow in running position
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(20, 20, 4, 44); // Bow angled
    
    // Quiver
    graphics.fillStyle(0x654321);
    graphics.fillRect(88, 28, 8, 24);
    graphics.fillStyle(0xf1c40f);
    graphics.fillRect(90, 30, 4, 16);
    
    graphics.generateTexture('archer-run', 128, 128);
    
    // Generate other archer animations
    graphics.generateTexture('archer-walk', 128, 128);
    graphics.generateTexture('archer-jump', 128, 128);
    graphics.generateTexture('archer-attack1', 128, 128);
    graphics.generateTexture('archer-attack2', 128, 128);
    graphics.generateTexture('archer-attack3', 128, 128);
    graphics.generateTexture('archer-hurt', 128, 128);
    graphics.generateTexture('archer-dead', 128, 128);
    graphics.generateTexture('archer-skill', 128, 128);
    
    // Create detailed MAGE sprites - updated to use blue colors
    graphics.clear();
    
    // Mage idle pose - blue theme
    graphics.fillStyle(0x3498db); // Blue robes instead of purple
    graphics.fillTriangle(64, 12, 40, 96, 88, 96); // Robe body
    graphics.fillStyle(0x2980b9); // Dark blue trim instead of dark purple
    graphics.fillTriangle(64, 16, 44, 92, 84, 92); // Inner robe
    
    // Hood and face
    graphics.fillStyle(0x2c3e50); // Dark blue hood
    graphics.fillCircle(64, 20, 16); // Hood
    graphics.fillStyle(0xfdbcb4); // Skin
    graphics.fillCircle(64, 24, 8); // Face
    
    graphics.fillStyle(0x2c3e50); // Eyes
    graphics.fillRect(61, 22, 2, 2);
    graphics.fillRect(65, 22, 2, 2);
    
    // Staff - enhanced blue theme
    graphics.fillStyle(0x8b4513); // Brown staff
    graphics.fillRect(20, 12, 4, 64); // Staff shaft
    graphics.fillStyle(0x1abc9c); // Cyan crystal instead of blue
    graphics.fillCircle(22, 16, 6); // Crystal orb
    graphics.fillStyle(0x85e6ff); // Light cyan glow
    graphics.fillCircle(22, 16, 4);
    
    // Spell book
    graphics.fillStyle(0x2c3e50); // Dark blue book instead of brown
    graphics.fillRect(84, 32, 12, 16);
    graphics.fillStyle(0x3498db); // Blue clasp instead of gold
    graphics.fillRect(88, 36, 4, 2);
    
    graphics.generateTexture('mage-idle', 128, 128);
    
    // Mage running pose - blue theme
    graphics.clear();
    graphics.fillStyle(0x3498db);
    graphics.fillTriangle(68, 12, 44, 96, 92, 96); // Robe flowing
    graphics.fillStyle(0x2980b9);
    graphics.fillTriangle(68, 16, 48, 92, 88, 92);
    
    graphics.fillStyle(0x2c3e50);
    graphics.fillCircle(68, 18, 16); // Hood moving
    graphics.fillStyle(0xfdbcb4);
    graphics.fillCircle(68, 22, 8);
    
    graphics.fillStyle(0x2c3e50);
    graphics.fillRect(65, 20, 2, 2);
    graphics.fillRect(69, 20, 2, 2);
    
    // Staff in motion
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(16, 16, 4, 60); // Staff angled
    graphics.fillStyle(0x1abc9c);
    graphics.fillCircle(18, 20, 6);
    graphics.fillStyle(0x85e6ff);
    graphics.fillCircle(18, 20, 4);
    
    // Book swaying
    graphics.fillStyle(0x2c3e50);
    graphics.fillRect(88, 36, 12, 16);
    graphics.fillStyle(0x3498db);
    graphics.fillRect(92, 40, 4, 2);
    
    graphics.generateTexture('mage-run', 128, 128);
    
    // Generate other mage animations
    graphics.generateTexture('mage-walk', 128, 128);
    graphics.generateTexture('mage-jump', 128, 128);
    graphics.generateTexture('mage-attack1', 128, 128);
    graphics.generateTexture('mage-attack2', 128, 128);
    graphics.generateTexture('mage-attack3', 128, 128);
    graphics.generateTexture('mage-hurt', 128, 128);
    graphics.generateTexture('mage-dead', 128, 128);
    graphics.generateTexture('mage-skill', 128, 128);
    
    graphics.destroy();
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
          fill: '#e74c3e',
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
    
    // Show nickname input dialog
    this.showNicknameDialog();
  }

  showNicknameDialog() {
    // Create overlay
    const overlay = this.add.rectangle(600, 300, 1200, 600, 0x000000, 0.7);
    overlay.setDepth(1000);
    
    // Create dialog box
    const dialog = this.add.rectangle(600, 300, 400, 250, 0x2c3e50);
    dialog.setStrokeStyle(2, 0x95a5a6);
    dialog.setDepth(1001);
    
    // Title
    this.add.text(600, 220, 'Enter Your Nickname', {
      fontSize: '24px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1002);
    
    // Input field representation
    const inputBg = this.add.rectangle(600, 280, 300, 40, 0x34495e);
    inputBg.setStrokeStyle(2, 0x3498db); // Blue border to show it's active
    inputBg.setDepth(1002);
    
    // Default nickname
    let currentNickname = 'Player' + Math.floor(Math.random() * 1000);
    
    const nicknameText = this.add.text(600, 280, currentNickname, {
      fontSize: '18px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1003);
    
    // Cursor indicator
    const cursor = this.add.text(600 + (currentNickname.length * 5), 280, '|', {
      fontSize: '18px',
      fill: '#f39c12',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1003);
    
    // Blinking cursor animation
    this.tweens.add({
      targets: cursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
    
    // Instructions
    this.add.text(600, 320, 'Type your nickname (max 12 chars) | Enter to start | Esc to cancel', {
      fontSize: '12px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1002);
    
    // Buttons
    const startButton = this.add.rectangle(520, 370, 120, 40, 0x27ae60);
    startButton.setDepth(1002);
    startButton.setInteractive({ useHandCursor: true });
    
    const startButtonText = this.add.text(520, 370, 'START GAME', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1003);
    
    const cancelButton = this.add.rectangle(680, 370, 120, 40, 0xe74c3c);
    cancelButton.setDepth(1002);
    cancelButton.setInteractive({ useHandCursor: true });
    
    const cancelButtonText = this.add.text(680, 370, 'CANCEL', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1003);
    
    // Function to update cursor position
    const updateCursor = () => {
      const textWidth = nicknameText.displayWidth;
      const textX = nicknameText.x;
      cursor.x = textX + (textWidth / 2) + 5;
    };
    
    // Keyboard input handling with better event management
    const handleKeyInput = (event) => {
      // Prevent default browser behavior
      event.preventDefault();
      event.stopPropagation();
      
      if (event.key === 'Enter') {
        // Start game
        this.cleanupNicknameDialog();
        this.startGameWithNickname(currentNickname);
        return;
      }
      
      if (event.key === 'Escape') {
        // Cancel
        this.cleanupNicknameDialog();
        return;
      }
      
      if (event.key === 'Backspace') {
        // Remove last character
        if (currentNickname.length > 0) {
          currentNickname = currentNickname.slice(0, -1);
          nicknameText.setText(currentNickname);
          updateCursor();
        }
        return;
      }
      
      // Add character if it's valid and nickname isn't too long
      if (event.key.length === 1 && currentNickname.length < 12) {
        const char = event.key;
        // Allow letters, numbers, underscore and dash
        if (/[a-zA-Z0-9_\-]/.test(char)) {
          currentNickname += char;
          nicknameText.setText(currentNickname);
          updateCursor();
        }
      }
    };
    
    // Clear any existing keyboard listeners to prevent conflicts
    this.input.keyboard.removeAllListeners('keydown');
    
    // Add DOM event listener for better key handling
    document.addEventListener('keydown', handleKeyInput);
    
    // Also add Phaser keyboard listener as backup
    this.input.keyboard.on('keydown', handleKeyInput);
    
    // Button handlers
    startButton.on('pointerdown', () => {
      this.cleanupNicknameDialog();
      this.startGameWithNickname(currentNickname);
    });
    
    cancelButton.on('pointerdown', () => {
      this.cleanupNicknameDialog();
    });
    
    // Hover effects
    startButton.on('pointerover', () => {
      startButton.setFillStyle(0x2ecc71);
    });
    
    startButton.on('pointerout', () => {
      startButton.setFillStyle(0x27ae60);
    });
    
    cancelButton.on('pointerover', () => {
      cancelButton.setFillStyle(0xc0392b);
    });
    
    cancelButton.on('pointerout', () => {
      cancelButton.setFillStyle(0xe74c3c);
    });
    
    // Store references for cleanup
    this.nicknameDialog = {
      overlay,
      dialog,
      inputBg,
      nicknameText,
      cursor,
      startButton,
      cancelButton,
      handleKeyInput,
      elements: [overlay, dialog, inputBg, nicknameText, cursor, startButton, startButtonText, cancelButton, cancelButtonText]
    };
    
    // Add instruction texts to cleanup list
    this.children.list.forEach(child => {
      if (child.depth >= 1002 && !this.nicknameDialog.elements.includes(child)) {
        this.nicknameDialog.elements.push(child);
      }
    });
    
    // Initial cursor position
    updateCursor();
    
    console.log('Nickname dialog created. You can now type your nickname.');
  }
  
  cleanupNicknameDialog() {
    if (this.nicknameDialog) {
      // Remove DOM event listener
      document.removeEventListener('keydown', this.nicknameDialog.handleKeyInput);
      
      // Remove Phaser keyboard listener
      this.input.keyboard.off('keydown', this.nicknameDialog.handleKeyInput);
      
      // Stop cursor animation
      if (this.nicknameDialog.cursor) {
        this.tweens.killTweensOf(this.nicknameDialog.cursor);
      }
      
      // Remove all dialog elements
      this.nicknameDialog.elements.forEach(element => {
        if (element && element.destroy) {
          element.destroy();
        }
      });
      
      this.nicknameDialog = null;
    }
    
    this.isStarting = false;
  }
  
  startGameWithNickname(nickname) {
    // Set the nickname
    window.GameState.nickname = nickname || 'Player' + Math.floor(Math.random() * 1000);
    
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
    // Clean up nickname dialog if it exists
    this.cleanupNicknameDialog();
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
    this.createKnightAnimations();
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

  createKnightAnimations() {
    // Only create animations if they don't already exist
    const animsManager = this.anims;
    
    // KNIGHT animations
    if (!animsManager.exists('knight-idle-anim')) {
      this.anims.create({
        key: 'knight-idle-anim',
        frames: [{ key: 'knight-idle', frame: 0 }],
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('knight-walk-anim')) {
      this.anims.create({
        key: 'knight-walk-anim',
        frames: [{ key: 'knight-walk', frame: 0 }],
        frameRate: 10,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('knight-run-anim')) {
      this.anims.create({
        key: 'knight-run-anim',
        frames: [{ key: 'knight-run', frame: 0 }],
        frameRate: 12,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('knight-attack1-anim')) {
      this.anims.create({
        key: 'knight-attack1-anim',
        frames: [{ key: 'knight-attack1', frame: 0 }],
        frameRate: 12,
        repeat: 0
      });
    }
    
    if (!animsManager.exists('knight-attack2-anim')) {
      this.anims.create({
        key: 'knight-attack2-anim',
        frames: [{ key: 'knight-attack2', frame: 0 }],
        frameRate: 12,
        repeat: 0
      });
    }
    
    if (!animsManager.exists('knight-attack3-anim')) {
      this.anims.create({
        key: 'knight-attack3-anim',
        frames: [{ key: 'knight-attack3', frame: 0 }],
        frameRate: 12,
        repeat: 0
      });
    }
    
    // ARCHER animations
    if (!animsManager.exists('archer-idle-anim')) {
      this.anims.create({
        key: 'archer-idle-anim',
        frames: [{ key: 'archer-idle', frame: 0 }],
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('archer-walk-anim')) {
      this.anims.create({
        key: 'archer-walk-anim',
        frames: [{ key: 'archer-walk', frame: 0 }],
        frameRate: 10,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('archer-run-anim')) {
      this.anims.create({
        key: 'archer-run-anim',
        frames: [{ key: 'archer-run', frame: 0 }],
        frameRate: 12,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('archer-attack1-anim')) {
      this.anims.create({
        key: 'archer-attack1-anim',
        frames: [{ key: 'archer-attack1', frame: 0 }],
        frameRate: 12,
        repeat: 0
      });
    }
    
    if (!animsManager.exists('archer-skill-anim')) {
      this.anims.create({
        key: 'archer-skill-anim',
        frames: [{ key: 'archer-skill', frame: 0 }],
        frameRate: 10,
        repeat: 0
      });
    }
    
    // MAGE animations
    if (!animsManager.exists('mage-idle-anim')) {
      this.anims.create({
        key: 'mage-idle-anim',
        frames: [{ key: 'mage-idle', frame: 0 }],
        frameRate: 8,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('mage-walk-anim')) {
      this.anims.create({
        key: 'mage-walk-anim',
        frames: [{ key: 'mage-walk', frame: 0 }],
        frameRate: 10,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('mage-run-anim')) {
      this.anims.create({
        key: 'mage-run-anim',
        frames: [{ key: 'mage-run', frame: 0 }],
        frameRate: 12,
        repeat: -1
      });
    }
    
    if (!animsManager.exists('mage-attack1-anim')) {
      this.anims.create({
        key: 'mage-attack1-anim',
        frames: [{ key: 'mage-attack1', frame: 0 }],
        frameRate: 12,
        repeat: 0
      });
    }
    
    if (!animsManager.exists('mage-skill-anim')) {
      this.anims.create({
        key: 'mage-skill-anim',
        frames: [{ key: 'mage-skill', frame: 0 }],
        frameRate: 10,
        repeat: 0
      });
    }
  }

  createSprites() {
    const graphics = this.add.graphics();
    
    // For archer and mage, keep the existing generated sprites
    // Archer (green with bow)
    graphics.fillStyle(0x27ae60);
    graphics.fillCircle(16, 16, 16);
    graphics.fillStyle(0x2d5a3d);
    graphics.fillCircle(16, 16, 12);
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(6, 14, 20, 4);
    graphics.fillRect(14, 6, 4, 20);
    graphics.fillStyle(0xf1c40f);
    graphics.fillTriangle(16, 8, 14, 12, 18, 12);
    graphics.generateTexture('archer', 32, 32);
    
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
    
    // Fireball - updated to purple theme for attacks
    graphics.clear();
    graphics.fillStyle(0x9b59b6); // Purple fire
    graphics.fillCircle(12, 12, 12);
    graphics.fillStyle(0xe74c3c); // Red-orange core for contrast
    graphics.fillCircle(12, 12, 8);
    graphics.fillStyle(0x8e44ad); // Dark purple middle
    graphics.fillCircle(12, 12, 4);
    graphics.generateTexture('fireball', 24, 24);
    
    // Create purple magic particles for enhanced effects
    graphics.clear();
    graphics.fillStyle(0xd63031); // Bright purple particle
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('magic-particle', 8, 8);
    
    // Create purple energy orb for ultimate
    graphics.clear();
    graphics.fillStyle(0x6c5ce7); // Bright purple
    graphics.fillCircle(16, 16, 16);
    graphics.fillStyle(0xa29bfe); // Light purple
    graphics.fillCircle(16, 16, 12);
    graphics.fillStyle(0xfd79a8); // Pink core
    graphics.fillCircle(16, 16, 8);
    graphics.generateTexture('energy-orb', 32, 32);
    
    graphics.destroy();
  }

  createPlayer() {
    const className = window.GameState.selectedClass;
    
    if (className === 'knight') {
      this.player = this.physics.add.sprite(300, 300, 'knight-idle');
      this.player.setScale(0.5);
      this.player.setCollideWorldBounds(true);
      this.player.setDrag(300);
      this.player.body.setSize(60, 80);
      this.player.body.setOffset(34, 40);
      this.player.anims.play('knight-idle-anim');
      this.player.currentState = 'idle';
      this.player.attackCombo = 0;
    } else if (className === 'archer') {
      this.player = this.physics.add.sprite(300, 300, 'archer-idle');
      this.player.setScale(0.5);
      this.player.setCollideWorldBounds(true);
      this.player.setDrag(300);
      this.player.body.setSize(60, 80);
      this.player.body.setOffset(34, 40);
      this.player.anims.play('archer-idle-anim');
      this.player.currentState = 'idle';
    } else if (className === 'mage') {
      this.player = this.physics.add.sprite(300, 300, 'mage-idle');
      this.player.setScale(0.5);
      this.player.setCollideWorldBounds(true);
      this.player.setDrag(300);
      this.player.body.setSize(60, 80);
      this.player.body.setOffset(34, 40);
      this.player.anims.play('mage-idle-anim');
      this.player.currentState = 'idle';
    }
    
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

  createWorld() {
    this.add.rectangle(600, 300, 1200, 600, 0x228b22);
    this.physics.world.gravity.y = 0;
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
    
    // Handle animations for all classes
    const className = window.GameState.selectedClass;
    this.updatePlayerAnimations(velocityX, velocityY, className);
  }

  updatePlayerAnimations(velocityX, velocityY, className) {
    const isMoving = velocityX !== 0 || velocityY !== 0;
    const currentAnim = this.player.anims.currentAnim;
    
    // Don't interrupt attack animations
    if (currentAnim && currentAnim.key.includes('attack') && this.player.anims.isPlaying) {
      return;
    }
    
    // Flip sprite based on movement direction
    if (velocityX < 0) {
      this.player.setFlipX(true);
    } else if (velocityX > 0) {
      this.player.setFlipX(false);
    }
    
    if (isMoving && this.player.currentState !== 'moving') {
      this.player.currentState = 'moving';
      this.player.anims.play(`${className}-run-anim`, true);
    } else if (!isMoving && this.player.currentState !== 'idle') {
      this.player.currentState = 'idle';
      this.player.anims.play(`${className}-idle-anim`, true);
    }
  }

  handlePlayerActions() {
    if (this.spaceKey.isDown && this.playerCooldowns.skill <= 0) {
      this.playerSpecialSkill();
      this.playerCooldowns.skill = this.player.skillCooldown;
    }
  }

  playerSpecialSkill() {
    const className = window.GameState.selectedClass;
    
    switch(className) {
      case 'knight':
        this.knightSpecialSkill();
        break;
      case 'archer':
        this.archerSpecialSkill();
        break;
      case 'mage':
        this.mageSpecialSkill();
        break;
    }
  }

  knightSpecialSkill() {
    // Summon ally knights
    if (!this.allyKnights) {
      this.allyKnights = this.add.group();
    }
    
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const x = this.player.x + 80 * Math.cos(angle);
      const y = this.player.y + 80 * Math.sin(angle);
      
      const allyKnight = this.physics.add.sprite(x, y, 'knight-idle');
      allyKnight.setScale(0.4);
      allyKnight.setTint(0x3498db);
      allyKnight.health = 50;
      allyKnight.damage = 20;
      allyKnight.attackRange = 60;
      allyKnight.setCollideWorldBounds(true);
      
      this.allyKnights.add(allyKnight);
      
      // Remove ally after 10 seconds
      this.time.delayedCall(10000, () => {
        if (allyKnight && allyKnight.active) {
          allyKnight.destroy();
        }
      });
    }
  }

  archerSpecialSkill() {
    // Multi-shot
    for (let i = -2; i <= 2; i++) {
      const baseAngle = Phaser.Math.Angle.Between(
        this.player.x, this.player.y,
        this.mouseX, this.mouseY
      );
      const angle = baseAngle + (i * Math.PI / 8);
      
      const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
      arrow.damage = this.player.damage * 0.8;
      arrow.setRotation(angle);
      arrow.setVelocity(
        500 * Math.cos(angle),
        500 * Math.sin(angle)
      );
      
      this.projectiles.add(arrow);
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
    // Cycle through different attack animations for combo
    this.player.attackCombo = (this.player.attackCombo + 1) % 3;
    const attackAnim = `knight-attack${this.player.attackCombo + 1}-anim`;
    
    this.player.anims.play(attackAnim);
    this.player.currentState = 'attacking';
    
    // Reset to idle when animation completes
    this.player.once('animationcomplete', () => {
      this.player.currentState = 'idle';
      this.player.anims.play('knight-idle-anim');
    });
    
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
    graphics.arc(x, y, radius, mouseAngle - arcAngle/2, mouseAngle + arcAngle/2, false);
    graphics.strokePath();
    
    // Secondary effect
    graphics.lineStyle(4, 0xf1c40f, 0.7);
    graphics.arc(x, y, radius * 0.8, mouseAngle - arcAngle/3, mouseAngle + arcAngle/3, false);
    graphics.strokePath();
    
    // Fade out effect
    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 200,
      onComplete: () => graphics.destroy()
    });
  }

  archerRangedAttack() {
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
    arrow.damage = this.player.damage;
    arrow.setRotation(angle);
    arrow.setVelocity(
      400 * Math.cos(angle),
      400 * Math.sin(angle)
    );
    
    this.projectiles.add(arrow);
  }

  mageSpellAttack() {
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    // Create main fireball with simplified effects
    const fireball = this.physics.add.sprite(this.player.x, this.player.y, 'fireball');
    fireball.damage = this.player.damage;
    fireball.setTint(0x9b59b6); // Purple tint
    fireball.setVelocity(
      300 * Math.cos(angle),
      300 * Math.sin(angle)
    );
    
    // Removed the pulsing effect and particle trail
    this.projectiles.add(fireball);
    
    // Removed the magic circle effect
  }

  createMagicTrail(projectile, color) {
    // Simplified trail - just a few particles, no continuous trail
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 100, () => {
        if (projectile && projectile.active) {
          const particle = this.add.sprite(projectile.x, projectile.y, 'magic-particle');
          particle.setTint(color);
          particle.setAlpha(0.5);
          particle.setScale(0.5);
          
          this.tweens.add({
            targets: particle,
            alpha: 0,
            duration: 200,
            onComplete: () => particle.destroy()
          });
        }
      });
    }
  }

  mageSpecialSkill() {
    // Simplified meteor shower
    console.log('Mage Ultimate: Meteor Storm!');
    
    // Removed the complex cast effect
    
    for (let i = 0; i < 8; i++) { // Reduced from 12 to 8 meteors
      this.time.delayedCall(i * 200, () => {
        const targetX = Phaser.Math.Between(100, 1100);
        const targetY = Phaser.Math.Between(100, 500);
        
        // Simplified warning indicator
        this.createMeteorWarning(targetX, targetY);
        
        this.time.delayedCall(300, () => { // Reduced delay
          const meteor = this.physics.add.sprite(targetX, -50, 'energy-orb');
          meteor.damage = this.player.damage * 1.8;
          meteor.setVelocity(0, 300); // Faster fall
          meteor.setScale(1.0); // Smaller scale
          meteor.setTint(0x6c5ce7);
          
          // Removed rotation and pulsing effects
          
          this.projectiles.add(meteor);
          
          // Simplified ground hit detection
          const originalUpdate = meteor.preUpdate;
          meteor.preUpdate = (time, delta) => {
            if (originalUpdate) originalUpdate.call(meteor, time, delta);
            
            if (meteor.y > 550) {
              this.createSimpleMeteorExplosion(meteor.x, meteor.y);
              meteor.destroy();
            }
          };
        });
      });
    }
  }

  createMeteorWarning(x, y) {
    // Simplified warning circle
    const warning = this.add.graphics();
    warning.fillStyle(0xff4757, 0.2);
    warning.fillCircle(x, y, 25);
    warning.lineStyle(2, 0xff3742, 0.6);
    warning.strokeCircle(x, y, 25);
    
    // Simple fade out
    this.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 300,
      onComplete: () => warning.destroy()
    });
  }

  createSimpleMeteorExplosion(x, y) {
    // Much simpler explosion
    const explosion = this.add.graphics();
    
    explosion.fillStyle(0x9b59b6, 0.4);
    explosion.fillCircle(x, y, 20);
    explosion.lineStyle(3, 0x6c5ce7, 0.6);
    explosion.strokeCircle(x, y, 25);
    
    this.tweens.add({
      targets: explosion,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy()
    });
    
    // No flying particles
  }

  createMagicExplosion(x, y) {
    // Simplified magic explosion
    const graphics = this.add.graphics();
    
    graphics.fillStyle(0x9b59b6, 0.5);
    graphics.fillCircle(x, y, 12);
    graphics.lineStyle(2, 0x8e44ad, 0.6);
    graphics.strokeCircle(x, y, 15);
    
    this.tweens.add({
      targets: graphics,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => graphics.destroy()
    });
    
    // No particles
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
          // Special explosion effect for mage projectiles
          if (projectile.texture.key === 'fireball' || projectile.texture.key === 'energy-orb') {
            this.createMagicExplosion(projectile.x, projectile.y);
          }
          
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

  createMagicExplosion(x, y) {
    // Simplified magic explosion
    const graphics = this.add.graphics();
    
    graphics.fillStyle(0x9b59b6, 0.5);
    graphics.fillCircle(x, y, 12);
    graphics.lineStyle(2, 0x8e44ad, 0.6);
    graphics.strokeCircle(x, y, 15);
    
    this.tweens.add({
      targets: graphics,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => graphics.destroy()
    });
    
    // No particles
  }

  updateAllyKnights() {
    if (!this.allyKnights || !this.allyKnights.children) return;
    
    const allyKnightsList = [...this.allyKnights.children.entries];
    
    allyKnightsList.forEach(allyKnight => {
      if (!allyKnight || !allyKnight.active) return;
      
      // Find nearest enemy
      let nearestEnemy = null;
      let nearestDistance = Infinity;
      
      if (this.enemies && this.enemies.children) {
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
      }
      
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
    
    // Disable game input but keep scene input enabled for buttons
    this.cursors.left.enabled = false;
    this.cursors.right.enabled = false;
    this.cursors.up.enabled = false;
    this.cursors.down.enabled = false;
    if (this.wasd) {
      Object.values(this.wasd).forEach(key => key.enabled = false);
    }
    if (this.spaceKey) {
      this.spaceKey.enabled = false;
    }
    
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
    overlay.setDepth(1000);
    
    this.add.text(600, 200, 'GAME OVER', {
      fontSize: '48px',
      fill: '#ff0000',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1001);
    
    this.add.text(600, 270, `Final Score: ${window.GameState.score}`, {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1001);

    this.add.text(600, 310, 'Score saved locally', {
      fontSize: '14px',
      fill: '#f39c12',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1001);
    
    const restartButton = this.add.rectangle(600, 420, 200, 50, 0x2ecc71);
    restartButton.setDepth(1001);
    restartButton.setInteractive({ useHandCursor: true });
    
    const restartText = this.add.text(600, 420, 'PLAY AGAIN', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1002);
    
    let isRestarting = false;
    restartButton.on('pointerdown', () => {
      if (isRestarting) return;
      isRestarting = true;
      
      console.log('Restarting game...');
      
      // Clear any existing timers
      this.time.removeAllEvents();
      
      // Reset game state properly
      window.GameState.score = 0;
      window.GameState.currentWave = 1;
      window.GameState.treasureHealth = 100;
      
      // Stop and restart scenes
      this.scene.stop('UIScene');
      this.scene.restart();
      this.scene.launch('UIScene');
    });

    const menuButton = this.add.rectangle(600, 480, 200, 50, 0x3498db);
    menuButton.setDepth(1001);
    menuButton.setInteractive({ useHandCursor: true });
    
    const menuText = this.add.text(600, 480, 'MAIN MENU', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1002);
    
    let isGoingToMenu = false;
    menuButton.on('pointerdown', () => {
      if (isGoingToMenu) return;
      isGoingToMenu = true;
      
      console.log('Going to main menu...');
      
      // Clear any existing timers
      this.time.removeAllEvents();
      
      // Reset game state
      window.GameState.score = 0;
      window.GameState.currentWave = 1;
      window.GameState.treasureHealth = 100;
      
      // Stop scenes and go to menu
      this.scene.stop('UIScene');
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });

    // Add hover effects for better feedback
    restartButton.on('pointerover', () => {
      restartButton.setFillStyle(0x27ae60);
    });
    
    restartButton.on('pointerout', () => {
      restartButton.setFillStyle(0x2ecc71);
    });
    
    menuButton.on('pointerover', () => {
      menuButton.setFillStyle(0x2980b9);
    });
    
    menuButton.on('pointerout', () => {
      menuButton.setFillStyle(0x3498db);
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

    // Show player nickname
    this.nicknameText = this.add.text(20, 120, `Player: ${window.GameState.nickname || 'Unknown'}`, {
      fontSize: '14px',
      fill: '#f39c12',
      fontFamily: 'Courier New'
    });

    // Show offline mode indicator
    if (window.GameState.isOfflineMode) {
      this.offlineText = this.add.text(20, 140, 'OFFLINE MODE', {
        fontSize: '12px',
        fill: '#e74c3c',
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
    
    // Update nickname text if it changes
    if (this.nicknameText && window.GameState.nickname) {
      this.nicknameText.setText(`Player: ${window.GameState.nickname}`);
    }
    
    // Show or hide offline mode indicator
    if (this.offlineText) {
      this.offlineText.setVisible(window.GameState.isOfflineMode);
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
