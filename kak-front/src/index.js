import Phaser from 'phaser';
import './styles/index.css';
import { API } from './api/api.js';
import { GameState } from './game/gameState.js';
import { MapGenerator } from './game/mapGenerator.js';
import { PreloaderScene } from './scenes/PreloaderScene.js';

// Make API available globally
window.API = API;

// Game State
window.GameState = {
  // Player info
  nickname: null,
  sessionId: null,
  selectedClass: 'knight',
  selectedMap: 'grassland', // Add map selection
  
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

// Login Scene
class LoginScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoginScene' });
  }

  create() {
    console.log('LoginScene created');
    
    // Background
    this.add.rectangle(800, 450, 1600, 900, 0x1a252f);
    
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
    this.add.rectangle(800, 450, 1600, 900, 0x1a252f);
    
    // Welcome message
    this.add.text(800, 200, `Welcome back, ${window.GameState.username}!`, {
      fontSize: '32px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.add.text(800, 250, `Level: ${window.GameState.playerLevel} | Best Score: ${window.GameState.bestScore}`, {
      fontSize: '18px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Start Game button
    const startButton = this.add.rectangle(800, 350, 200, 50, 0x27ae60);
    this.add.text(800, 350, 'START GAME', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    startButton.setInteractive();
    startButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Leaderboard button
    const leaderboardButton = this.add.rectangle(800, 450, 200, 50, 0x3498db);
    this.add.text(800, 450, 'LEADERBOARD', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    leaderboardButton.setInteractive();
    leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });

    // Logout button
    const logoutButton = this.add.rectangle(800, 550, 200, 50, 0xe74c3c);
    this.add.text(800, 550, 'LOGOUT', {
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
    this.add.rectangle(800, 450, 1600, 900, 0x1a252f);
    
    // Title
    this.add.text(800, 100, 'LEADERBOARD', {
      fontSize: '36px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Tab buttons
    this.createTabButtons();
    
    // Load default leaderboard
    this.loadLeaderboard('score');

    // Back button
    const backButton = this.add.rectangle(100, 800, 120, 40, 0x95a5a6);
    this.add.text(100, 800, 'BACK', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    backButton.setInteractive();
    backButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  createTabButtons() {
    // Score tab
    this.scoreTab = this.add.rectangle(650, 150, 150, 40, 0x3498db);
    this.add.text(650, 150, 'TOP SCORES', {
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
    this.waveTab = this.add.rectangle(950, 150, 150, 40, 0x2c3e50);
    this.add.text(950, 150, 'TOP WAVES', {
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
    const loadingText = this.add.text(800, 400, 'Loading...', {
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
        this.add.text(800, 400, 'Failed to load leaderboard', {
          fontSize: '20px',
          fill: '#e74c3c',
          fontFamily: 'Courier New'
        }).setOrigin(0.5);
      }
    });
  }

  displayLeaderboard(data, type) {
    const startY = 220;
    const lineHeight = 35;

    // Header
    const headerText = type === 'score' ? 'RANK  |  USERNAME  |  BEST SCORE  |  LEVEL' : 'RANK  |  USERNAME  |  BEST WAVE  |  LEVEL';
    const header = this.add.text(800, startY, headerText, {
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
      
      const entryDisplay = this.add.text(800, y, entryText, {
        fontSize: '14px',
        fill: rankColor,
        fontFamily: 'Courier New'
      }).setOrigin(0.5);
      
      this.leaderboardGroup.add(entryDisplay);

      // Highlight current player
      if (entry.username === window.GameState.username) {
        const highlight = this.add.rectangle(800, y, 500, 25, 0x2c3e50, 0.5);
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
    this.add.rectangle(800, 450, 1600, 900, 0x1a252f);
    
    // Title
    this.add.text(800, 80, 'KILL N\' KEEP', {
      fontSize: '48px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    this.add.text(800, 120, 'Defend the Treasure!', {
      fontSize: '20px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.createMapSelection();
    this.createClassSelection();
    this.createButtons();
  }

  createMapSelection() {
    this.add.text(800, 160, 'Choose Your Map:', {
      fontSize: '20px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.mapButtons = [];
    this.createMapButton(500, 210, 'GRASSLAND', 'grassland', 0x228b22, 
      'Green Fields\nNatural terrain\nBalanced gameplay');
    this.createMapButton(800, 210, 'DESERT', 'desert', 0xdaa520,
      'Sandy Dunes\nHarsh environment\nOpen spaces');
    this.createMapButton(1100, 210, 'CASTLE', 'castle', 0x696969,
      'Stone Fortress\nMedieval setting\nDefensive walls');
  }

  createMapButton(x, y, name, mapName, color, description) {
    // Create button using graphics for better quality
    const graphics = this.add.graphics();
    graphics.fillStyle(color);
    graphics.fillRoundedRect(x - 70, y - 40, 140, 80, 8);
    graphics.lineStyle(2, 0x34495e);
    graphics.strokeRoundedRect(x - 70, y - 40, 140, 80, 8);
    
    const button = graphics;
    
    const text = this.add.text(x, y - 20, name, {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    const desc = this.add.text(x, y + 10, description, {
      fontSize: '9px',
      fill: '#ffffff',
      fontFamily: 'Courier New',
      align: 'center'
    }).setOrigin(0.5);

    // Create interactive area
    const hitArea = this.add.rectangle(x, y, 140, 80, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    
    hitArea.on('pointerdown', () => {
      window.GameState.selectedMap = mapName;
      
      this.mapButtons.forEach(btn => {
        if (btn.graphics) {
          btn.graphics.clear();
          btn.graphics.fillStyle(btn.color);
          btn.graphics.fillRoundedRect(btn.x - 70, btn.y - 40, 140, 80, 8);
          btn.graphics.lineStyle(2, 0x34495e);
          btn.graphics.strokeRoundedRect(btn.x - 70, btn.y - 40, 140, 80, 8);
        }
      });
      
      // Highlight selected button
      graphics.clear();
      graphics.fillStyle(color);
      graphics.fillRoundedRect(x - 70, y - 40, 140, 80, 8);
      graphics.lineStyle(3, 0xffffff);
      graphics.strokeRoundedRect(x - 70, y - 40, 140, 80, 8);
      
      console.log('Selected map:', mapName);
    });

    this.mapButtons.push({ graphics, x, y, color, hitArea });
    
    if (mapName === 'grassland') {
      graphics.clear();
      graphics.fillStyle(color);
      graphics.fillRoundedRect(x - 70, y - 40, 140, 80, 8);
      graphics.lineStyle(3, 0xffffff);
      graphics.strokeRoundedRect(x - 70, y - 40, 140, 80, 8);
    }
  }

  createClassSelection() {
    this.add.text(800, 300, 'Choose Your Class:', {
      fontSize: '20px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.classButtons = [];
    this.createClassButton(350, 370, 'KNIGHT', 'knight', 0xe74c3c, 
      'Tank Fighter\nMelee Combat\nHigh Health');
    this.createClassButton(800, 370, 'ARCHER', 'archer', 0x27ae60,
      'Ranged DPS\nBow Shooting\nHigh Speed');
    this.createClassButton(1250, 370, 'MAGE', 'mage', 0x3498db,
      'Magic DPS\nFireball Magic\nHigh Damage');

    this.add.text(800, 450, 'Controls: WASD = Move, Mouse Click = Attack, SPACE = Special Skill', {
      fontSize: '14px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
  }

  createClassButton(x, y, name, className, color, description) {
    // Create button using graphics for better quality
    const graphics = this.add.graphics();
    graphics.fillStyle(color);
    graphics.fillRoundedRect(x - 80, y - 50, 160, 100, 12);
    graphics.lineStyle(2, 0x34495e);
    graphics.strokeRoundedRect(x - 80, y - 50, 160, 100, 12);
    
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

    // Create interactive area
    const hitArea = this.add.rectangle(x, y, 160, 100, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    
    hitArea.on('pointerdown', () => {
      window.GameState.selectedClass = className;
      
      this.classButtons.forEach(btn => {
        if (btn.graphics) {
          btn.graphics.clear();
          btn.graphics.fillStyle(btn.color);
          btn.graphics.fillRoundedRect(btn.x - 80, btn.y - 50, 160, 100, 12);
          btn.graphics.lineStyle(2, 0x34495e);
          btn.graphics.strokeRoundedRect(btn.x - 80, btn.y - 50, 160, 100, 12);
        }
      });
      
      // Highlight selected button
      graphics.clear();
      graphics.fillStyle(color);
      graphics.fillRoundedRect(x - 80, y - 50, 160, 100, 12);
      graphics.lineStyle(4, 0xffffff);
      graphics.strokeRoundedRect(x - 80, y - 50, 160, 100, 12);
      
      console.log('Selected class:', className);
    });

    this.classButtons.push({ graphics, x, y, color, hitArea });
    
    if (className === 'knight') {
      graphics.clear();
      graphics.fillStyle(color);
      graphics.fillRoundedRect(x - 80, y - 50, 160, 100, 12);
      graphics.lineStyle(4, 0xffffff);
      graphics.strokeRoundedRect(x - 80, y - 50, 160, 100, 12);
    }
  }

  createButtons() {
    // Start Game button with graphics
    const startGraphics = this.add.graphics();
    startGraphics.fillStyle(0x2ecc71);
    startGraphics.fillRoundedRect(700, 495, 200, 50, 8);
    startGraphics.lineStyle(2, 0x27ae60);
    startGraphics.strokeRoundedRect(700, 495, 200, 50, 8);
    
    this.add.text(800, 520, 'START GAME', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    const startHitArea = this.add.rectangle(800, 520, 200, 50, 0x000000, 0);
    startHitArea.setInteractive({ useHandCursor: true });
    startHitArea.on('pointerdown', () => this.startGame());
    
    startHitArea.on('pointerover', () => {
      startGraphics.clear();
      startGraphics.fillStyle(0x27ae60);
      startGraphics.fillRoundedRect(700, 495, 200, 50, 8);
      startGraphics.lineStyle(2, 0x229954);
      startGraphics.strokeRoundedRect(700, 495, 200, 50, 8);
    });
    
    startHitArea.on('pointerout', () => {
      startGraphics.clear();
      startGraphics.fillStyle(0x2ecc71);
      startGraphics.fillRoundedRect(700, 495, 200, 50, 8);
      startGraphics.lineStyle(2, 0x27ae60);
      startGraphics.strokeRoundedRect(700, 495, 200, 50, 8);
    });

    // Leaderboard button with graphics
    const leaderGraphics = this.add.graphics();
    leaderGraphics.fillStyle(0x3498db);
    leaderGraphics.fillRoundedRect(525, 500, 150, 40, 6);
    leaderGraphics.lineStyle(2, 0x2980b9);
    leaderGraphics.strokeRoundedRect(525, 500, 150, 40, 6);
    
    this.add.text(600, 520, 'LEADERBOARD', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    const leaderHitArea = this.add.rectangle(600, 520, 150, 40, 0x000000, 0);
    leaderHitArea.setInteractive({ useHandCursor: true });
    leaderHitArea.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });
    
    leaderHitArea.on('pointerover', () => {
      leaderGraphics.clear();
      leaderGraphics.fillStyle(0x2980b9);
      leaderGraphics.fillRoundedRect(525, 500, 150, 40, 6);
      leaderGraphics.lineStyle(2, 0x21618c);
      leaderGraphics.strokeRoundedRect(525, 500, 150, 40, 6);
    });
    
    leaderHitArea.on('pointerout', () => {
      leaderGraphics.clear();
      leaderGraphics.fillStyle(0x3498db);
      leaderGraphics.fillRoundedRect(525, 500, 150, 40, 6);
      leaderGraphics.lineStyle(2, 0x2980b9);
      leaderGraphics.strokeRoundedRect(525, 500, 150, 40, 6);
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
    const overlay = this.add.rectangle(800, 450, 1600, 900, 0x000000, 0.7);
    overlay.setDepth(1000);
    
    // Create dialog box
    const dialog = this.add.rectangle(800, 450, 400, 250, 0x2c3e50);
    dialog.setStrokeStyle(2, 0x95a5a6);
    dialog.setDepth(1001);
    
    // Title
    this.add.text(800, 370, 'Enter Your Nickname', {
      fontSize: '24px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1002);
    
    // Input field representation
    const inputBg = this.add.rectangle(800, 430, 300, 40, 0x34495e);
    inputBg.setStrokeStyle(2, 0x3498db);
    inputBg.setDepth(1002);
    
    // Default nickname
    let currentNickname = 'Player' + Math.floor(Math.random() * 1000);
    
    const nicknameText = this.add.text(800, 430, currentNickname, {
      fontSize: '18px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1003);
    
    // Cursor indicator
    const cursor = this.add.text(800 + (currentNickname.length * 5), 430, '|', {
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
    this.add.text(800, 470, 'Type your nickname (max 12 chars) | Enter to start | Esc to cancel', {
      fontSize: '12px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1002);
    
    // Buttons
    const startButton = this.add.rectangle(720, 520, 120, 40, 0x27ae60);
    startButton.setDepth(1002);
    startButton.setInteractive({ useHandCursor: true });
    
    const startButtonText = this.add.text(720, 520, 'START GAME', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1003);
    
    const cancelButton = this.add.rectangle(880, 520, 120, 40, 0xe74c3c);
    cancelButton.setDepth(1002);
    cancelButton.setInteractive({ useHandCursor: true });
    
    const cancelButtonText = this.add.text(880, 520, 'CANCEL', {
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
    
    // Keyboard input handling
    const handleKeyInput = (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (event.key === 'Enter') {
        this.cleanupNicknameDialog();
        this.startGameWithNickname(currentNickname);
        return;
      }
      
      if (event.key === 'Escape') {
        this.cleanupNicknameDialog();
        return;
      }
      
      if (event.key === 'Backspace') {
        if (currentNickname.length > 0) {
          currentNickname = currentNickname.slice(0, -1);
          nicknameText.setText(currentNickname);
          updateCursor();
        }
        return;
      }
      
      if (event.key.length === 1 && currentNickname.length < 12) {
        const char = event.key;
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
    const loadingText = this.add.text(800, 520, 'Starting game...', {
      fontSize: '16px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Try to start game with backend first
    API.startGame(window.GameState.nickname).then(response => {
      if (response.success) {
        window.GameState.sessionId = response.sessionId;
        window.GameState.isOfflineMode = !API.isOnline;
      } else {
        window.GameState.sessionId = 'local-' + Date.now();
        window.GameState.isOfflineMode = true;
      }
      
      // Reset game state
      window.GameState.score = 0;
      window.GameState.currentWave = 1;
      window.GameState.treasureHealth = 100;
      
      loadingText.destroy();
      
      // Start game scenes
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    }).catch(error => {
      console.error('Failed to start game session:', error);
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
    
    // Wave system variables
    this.waveActive = false;
    this.wavePrepTime = 3000; // 3 seconds to prepare
    this.waveEnemiesRemaining = 0;
    this.waveEnemiesSpawned = 0;
    this.waveTargetEnemies = 0;
    this.currentWaveSpawnDelay = 2000;
    this.betweenWaveTime = 0;
    
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
    
    // Start first wave after a short delay
    this.time.delayedCall(2000, () => {
      this.startWave();
    });
    
    console.log('Game scene setup complete');
  }

  createSprites() {
    const graphics = this.add.graphics();
    
    // Create ENEMY sprite (red circle) - 2 HP, normal speed
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(16, 16, 12);
    graphics.generateTexture('enemy', 32, 32);
    
    // Create TRIANGLE ENEMY sprite (red triangle) - 1 HP, 2x speed
    graphics.clear();
    graphics.fillStyle(0xff4500); // Orange-red for triangle
    graphics.fillTriangle(16, 4, 4, 28, 28, 28);
    graphics.generateTexture('enemy-triangle', 32, 32);
    
    // Create SQUARE ENEMY sprite (red square) - 3 HP, 20% slower speed
    graphics.clear();
    graphics.fillStyle(0x8b0000); // Dark red for square
    graphics.fillRect(6, 6, 20, 20);
    graphics.generateTexture('enemy-square', 32, 32);
    
    // Create BOSS sprite (larger red circle with black outline)
    graphics.clear();
    graphics.fillStyle(0x000000);
    graphics.fillCircle(24, 24, 20);
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(24, 24, 18);
    graphics.generateTexture('boss', 48, 48);
    
    // Create TREASURE sprite (golden chest)
    graphics.clear();
    graphics.fillStyle(0xf1c40f); // Gold
    graphics.fillRect(8, 12, 32, 24); // Main chest body
    graphics.fillStyle(0xe67e22); // Darker gold for details
    graphics.fillRect(12, 16, 24, 16); // Inner area
    graphics.fillStyle(0x8b4513); // Brown for lock
    graphics.fillRect(22, 20, 4, 8);
    graphics.generateTexture('treasure', 48, 48);
    
    // Create KNIGHT sprites with proper attack frames
    // Knight idle pose
    graphics.clear();
    graphics.fillStyle(0x95a5a6); // Silver armor
    graphics.fillRect(48, 16, 32, 80); // Body
    graphics.fillRect(40, 24, 48, 16); // Shoulders
    graphics.fillStyle(0xf4d03f); // Gold trim
    graphics.fillRect(46, 32, 36, 4); // Chest plate trim
    graphics.fillRect(58, 20, 12, 8); // Helmet trim
    graphics.fillStyle(0x2c3e50); // Dark visor
    graphics.fillRect(60, 24, 8, 4);
    graphics.fillStyle(0x8b4513); // Brown handle
    graphics.fillRect(16, 32, 4, 32); // Sword handle - down position
    graphics.fillStyle(0xc0c0c0); // Silver blade
    graphics.fillRect(12, 16, 12, 24); // Sword blade - down position
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
    
    // Knight ATTACK1 - Sword raised up
    graphics.clear();
    graphics.fillStyle(0x95a5a6); // Silver armor
    graphics.fillRect(48, 16, 32, 80); // Body
    graphics.fillRect(40, 24, 48, 16); // Shoulders
    graphics.fillStyle(0xf4d03f); // Gold trim
    graphics.fillRect(46, 32, 36, 4);
    graphics.fillRect(58, 20, 12, 8);
    graphics.fillStyle(0x2c3e50); // Dark visor
    graphics.fillRect(60, 24, 8, 4);
    graphics.fillStyle(0x8b4513); // Brown handle - RAISED position
    graphics.fillRect(76, 8, 4, 32); // Sword handle raised up
    graphics.fillStyle(0xc0c0c0); // Silver blade - RAISED position
    graphics.fillRect(72, 4, 12, 24); // Sword blade raised up
    graphics.fillStyle(0xe74c3c); // Red cape
    graphics.fillTriangle(80, 24, 96, 32, 80, 64);
    graphics.generateTexture('knight-attack1', 128, 128);
    
    // Knight ATTACK2 - Sword mid-swing
    graphics.clear();
    graphics.fillStyle(0x95a5a6); // Silver armor
    graphics.fillRect(48, 16, 32, 80); // Body
    graphics.fillRect(40, 24, 48, 16); // Shoulders
    graphics.fillStyle(0xf4d03f); // Gold trim
    graphics.fillRect(46, 32, 36, 4);
    graphics.fillRect(58, 20, 12, 8);
    graphics.fillStyle(0x2c3e50); // Dark visor
    graphics.fillRect(60, 24, 8, 4);
    graphics.fillStyle(0x8b4513); // Brown handle - HORIZONTAL position
    graphics.fillRect(85, 24, 32, 4); // Sword handle horizontal
    graphics.fillStyle(0xc0c0c0); // Silver blade - HORIZONTAL position
    graphics.fillRect(105, 20, 24, 12); // Sword blade horizontal
    graphics.fillStyle(0xe74c3c); // Red cape
    graphics.fillTriangle(80, 24, 96, 32, 80, 64);
    graphics.generateTexture('knight-attack2', 128, 128);
    
    // Knight ATTACK3 - Sword down swing
    graphics.clear();
    graphics.fillStyle(0x95a5a6); // Silver armor
    graphics.fillRect(48, 16, 32, 80); // Body
    graphics.fillRect(40, 24, 48, 16); // Shoulders
    graphics.fillStyle(0xf4d03f); // Gold trim
    graphics.fillRect(46, 32, 36, 4);
    graphics.fillRect(58, 20, 12, 8);
    graphics.fillStyle(0x2c3e50); // Dark visor
    graphics.fillRect(60, 24, 8, 4);
    graphics.fillStyle(0x8b4513); // Brown handle - DOWN position
    graphics.fillRect(88, 48, 4, 32); // Sword handle down swing
    graphics.fillStyle(0xc0c0c0); // Silver blade - DOWN position
    graphics.fillRect(84, 72, 12, 24); // Sword blade down swing
    graphics.fillStyle(0xe74c3c); // Red cape
    graphics.fillTriangle(80, 24, 96, 32, 80, 64);
    graphics.generateTexture('knight-attack3', 128, 128);
    
    // Create ARCHER sprites
    graphics.clear();
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
    // Bow
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
    
    // Create MAGE sprites
    graphics.clear();
    graphics.fillStyle(0x3498db); // Blue robes
    graphics.fillTriangle(64, 12, 40, 96, 88, 96); // Robe body
    graphics.fillStyle(0x2980b9); // Dark blue trim
    graphics.fillTriangle(64, 16, 44, 92, 84, 92); // Inner robe
    // Hood and face
    graphics.fillStyle(0x2c3e50); // Dark blue hood
    graphics.fillCircle(64, 20, 16); // Hood
    graphics.fillStyle(0xfdbcb4); // Skin
    graphics.fillCircle(64, 24, 8); // Face
    graphics.fillStyle(0x2c3e50); // Eyes
    graphics.fillRect(61, 22, 2, 2);
    graphics.fillRect(65, 22, 2, 2);
    // Staff
    graphics.fillStyle(0x8b4513); // Brown staff
    graphics.fillRect(20, 12, 4, 64); // Staff shaft
    graphics.fillStyle(0x1abc9c); // Cyan crystal
    graphics.fillCircle(22, 16, 6); // Crystal orb
    graphics.fillStyle(0x85e6ff); // Light cyan glow
    graphics.fillCircle(22, 16, 4);
    // Spell book
    graphics.fillStyle(0x2c3e50); // Dark blue book
    graphics.fillRect(84, 32, 12, 16);
    graphics.fillStyle(0x3498db); // Blue clasp
    graphics.fillRect(88, 36, 4, 2);
    graphics.generateTexture('mage-idle', 128, 128);
    
    // Mage running pose
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
    
    // Create ARROW sprite (simple arrow shape)
    graphics.clear();
    graphics.fillStyle(0x8b4513); // Brown shaft
    graphics.fillRect(4, 14, 24, 4);
    graphics.fillStyle(0xc0c0c0); // Silver arrowhead
    graphics.fillTriangle(28, 12, 32, 16, 28, 20);
    graphics.fillStyle(0x654321); // Feathers
    graphics.fillTriangle(4, 12, 0, 14, 4, 16);
    graphics.fillTriangle(4, 16, 0, 18, 4, 20);
    graphics.generateTexture('arrow', 32, 32);
    
    // Create FIREBALL sprite (orange/red fire effect)
    graphics.clear();
    graphics.fillStyle(0xff4500); // Orange red core
    graphics.fillCircle(16, 16, 8);
    graphics.fillStyle(0xff8c00); // Darker orange outer
    graphics.fillCircle(16, 16, 12);
    graphics.fillStyle(0xffa500); // Light orange glow
    graphics.fillCircle(16, 16, 6);
    graphics.generateTexture('fireball', 32, 32);
    
    // Create ENERGY ORB sprite (magical purple orb)
    graphics.clear();
    graphics.fillStyle(0x9b59b6); // Purple
    graphics.fillCircle(16, 16, 10);
    graphics.fillStyle(0xd2b4de); // Light purple center
    graphics.fillCircle(16, 16, 6);
    graphics.fillStyle(0xffffff); // White core
    graphics.fillCircle(16, 16, 3);
    graphics.generateTexture('energy-orb', 32, 32);
    
    graphics.destroy();
    console.log('All game sprites created');
  }

  createKnightAnimations() {
    // Create animations for all classes
    ['knight', 'archer', 'mage'].forEach(className => {
      // Idle animation
      if (!this.anims.exists(`${className}-idle-anim`)) {
        this.anims.create({
          key: `${className}-idle-anim`,
          frames: [{ key: `${className}-idle` }],
          frameRate: 2,
          repeat: -1
        });
      }
      
      // Run animation
      if (!this.anims.exists(`${className}-run-anim`)) {
        this.anims.create({
          key: `${className}-run-anim`,
          frames: [{ key: `${className}-run` }],
          frameRate: 8,
          repeat: -1
        });
      }
      
      // Knight gets special multi-frame attack animation
      if (className === 'knight') {
        if (!this.anims.exists('knight-attack-anim')) {
          this.anims.create({
            key: 'knight-attack-anim',
            frames: [
              { key: 'knight-attack1' },
              { key: 'knight-attack2' },
              { key: 'knight-attack3' },
              { key: 'knight-idle' }
            ],
            frameRate: 15,
            repeat: 0
          });
        }
      } else {
        // Other classes get simple attack animations
        for (let i = 1; i <= 3; i++) {
          const animKey = `${className}-attack${i}-anim`;
          if (!this.anims.exists(animKey)) {
            this.anims.create({
              key: animKey,
              frames: [
                { key: `${className}-idle` },
                { key: `${className}-attack${i}` },
                { key: `${className}-idle` }
              ],
              frameRate: 12,
              repeat: 0,
              duration: 400
            });
          }
        }
      }
    });
    
    console.log('Character animations created');
  }

  createWorld() {
    // Initialize map generator
    this.mapGenerator = new MapGenerator(this);
    
    // Set physics world bounds to full screen
    this.physics.world.setBounds(0, 0, 1600, 900);
    
    // Create full-screen base background first
    this.createBaseBackground();
    
    // Create map background based on selected map
    const selectedMap = window.GameState.selectedMap || 'grassland';
    
    switch(selectedMap) {
      case 'grassland':
        this.createGrasslandMap();
        break;
      case 'desert':
        this.createDesertMap();
        break;
      case 'castle':
        this.createCastleMap();
        break;
      default:
        this.createGrasslandMap();
    }
    
    // Set up physics world
    this.physics.world.gravity.y = 0;
    
    // Add map borders for visual clarity
    this.createMapBorders();
  }

  createBaseBackground() {
    const selectedMap = window.GameState.selectedMap || 'grassland';
    let baseColor;
    
    switch(selectedMap) {
      case 'grassland':
        baseColor = 0x228b22; // Green
        break;
      case 'desert':
        baseColor = 0xdaa520; // Gold/Sandy
        break;
      case 'castle':
        baseColor = 0x696969; // Gray stone
        break;
      default:
        baseColor = 0x228b22;
    }
    
    // Create full-screen background rectangle
    const fullBackground = this.add.rectangle(800, 450, 1600, 900, baseColor);
    fullBackground.setDepth(-10); // Put it behind everything
  }

  createMapBorders() {
    const borderThickness = 4;
    const borderColor = 0x2c3e50;
    
    // Top border
    this.add.rectangle(800, borderThickness/2, 1600, borderThickness, borderColor).setDepth(1000);
    // Bottom border
    this.add.rectangle(800, 900 - borderThickness/2, 1600, borderThickness, borderColor).setDepth(1000);
    // Left border
    this.add.rectangle(borderThickness/2, 450, borderThickness, 900, borderColor).setDepth(1000);
    // Right border
    this.add.rectangle(1600 - borderThickness/2, 450, borderThickness, 900, borderColor).setDepth(1000);
  }

  createGrasslandMap() {
    this.mapGenerator.createGrassBackground(0, 0, 1600, 900); // Full screen background
    this.createGrasslandDecorations();
  }

  createDesertMap() {
    this.mapGenerator.createDesertBackground(0, 0, 1600, 900); // Full screen background
    this.createDesertDecorations();
  }

  createCastleMap() {
    this.mapGenerator.createCastleBackground(0, 0, 1600, 900); // Full screen background
    this.createCastleDecorations();
  }

  createGrasslandDecorations() {
    // Spread decorations across the entire map with better density
    this.mapGenerator.createBushes(0, 0, 1600, 900, 40); // More bushes everywhere
    this.mapGenerator.createRocks(0, 0, 1600, 900, 25); // More rocks scattered
    this.mapGenerator.createFlowers(0, 0, 1600, 900, 60); // Many more flowers
    this.mapGenerator.createTrees(0, 0, 1600, 900, 35); // More trees across map
    
    // Add variety with different sized grass patches across entire map
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const grassPatch = this.add.circle(x, y, Phaser.Math.Between(10, 35), 0x2d5a27, 0.25);
      grassPatch.setDepth(-2);
    }
    
    // Add more background grass layers for full coverage
    for (let i = 0; i < 25; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const grassLayer = this.add.rectangle(x, y, Phaser.Math.Between(150, 400), Phaser.Math.Between(80, 200), 0x228b22, 0.08);
      grassLayer.setDepth(-5);
    }
    
    // Add small details scattered everywhere
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      
      // Random small vegetation
      const detail = this.add.circle(x, y, Phaser.Math.Between(2, 6), 
        Phaser.Math.RND.pick([0x32cd32, 0x228b22, 0x90ee90, 0x006400]), 0.6);
      detail.setDepth(-1);
    }
  }

  createDesertDecorations() {
    // Spread desert decorations across the entire map
    this.mapGenerator.createCacti(0, 0, 1600, 900, 30); // More cacti everywhere
    this.mapGenerator.createDesertRocks(0, 0, 1600, 900, 28); // More desert rocks
    this.mapGenerator.createSandDunes(0, 0, 1600, 900, 20); // More sand dunes
    this.mapGenerator.createOasis(100, 100, 1400, 700, 4); // Small oases scattered
    
    // Add sand patches with wind effects across entire map
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const sandPatch = this.add.circle(x, y, Phaser.Math.Between(15, 45), 0xdaa520, 0.15);
      sandPatch.setDepth(-2);
    }
    
    // Add desert heat shimmer effects everywhere
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const shimmer = this.add.ellipse(x, y, Phaser.Math.Between(60, 120), Phaser.Math.Between(15, 25), 0xffd700, 0.08);
      shimmer.setDepth(-1);
    }
    
    // Add additional desert background layers for full coverage
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const sandLayer = this.add.rectangle(x, y, Phaser.Math.Between(200, 500), Phaser.Math.Between(100, 250), 0xf4a460, 0.06);
      sandLayer.setDepth(-5);
    }
    
    // Add small desert details everywhere
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      
      // Random small desert elements (sand particles, small stones)
      const detail = this.add.circle(x, y, Phaser.Math.Between(1, 4), 
        Phaser.Math.RND.pick([0xd2691e, 0xdaa520, 0xf4a460, 0xcd853f]), 0.7);
      detail.setDepth(-1);
    }
    
    // Add bone/skull decorations scattered around
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(100, 1500);
      const y = Phaser.Math.Between(100, 800);
      const bone = this.add.ellipse(x, y, 8, 12, 0xf5f5dc, 0.8);
      bone.setDepth(0);
    }
  }

  createCastleDecorations() {
    // Spread castle decorations across the entire map
    this.mapGenerator.createTorches(0, 0, 1600, 900, 25); // More torches everywhere
    this.mapGenerator.createBanners(0, 0, 1600, 900, 20); // More banners
    this.mapGenerator.createStoneBlocks(0, 0, 1600, 900, 40); // More stone blocks
    this.mapGenerator.createCastleWalls(0, 0, 1600, 900); // Castle walls
    
    // Add castle floor tiles with better coverage
    const tileSize = 64;
    for (let x = 0; x < 1600; x += tileSize) {
      for (let y = 0; y < 900; y += tileSize) {
        if (Phaser.Math.Between(0, 100) < 85) { // 85% chance for tile
          const tile = this.add.rectangle(x + tileSize/2, y + tileSize/2, tileSize-2, tileSize-2, 0x555555);
          tile.setStrokeStyle(1, 0x333333);
          tile.setDepth(-3);
        }
      }
    }
    
    // Add castle atmosphere - stone debris everywhere
    for (let i = 0; i < 35; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const debris = this.add.circle(x, y, Phaser.Math.Between(5, 18), 0x666666, 0.7);
      debris.setDepth(-1);
    }
    
    // Add additional castle background elements for full coverage
    for (let i = 0; i < 18; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const stoneLayer = this.add.rectangle(x, y, Phaser.Math.Between(150, 350), Phaser.Math.Between(80, 180), 0x696969, 0.04);
      stoneLayer.setDepth(-5);
    }
    
    // Add small castle details everywhere
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      
      // Random small castle elements (mortar bits, small stones)
      const detail = this.add.circle(x, y, Phaser.Math.Between(1, 5), 
        Phaser.Math.RND.pick([0x708090, 0x696969, 0x778899, 0x2f4f4f]), 0.6);
      detail.setDepth(-1);
    }
    
    // Add weapon/shield decorations scattered around
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(100, 1500);
      const y = Phaser.Math.Between(100, 800);
      
      // Simple sword decoration
      const sword = this.add.rectangle(x, y, 3, 15, 0xc0c0c0);
      sword.setDepth(0);
      
      // Simple shield decoration  
      const shield = this.add.circle(x + 20, y, 8, 0x8b4513);
      shield.setDepth(0);
    }
    
    // Add chains and medieval decorations
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, 1600);
      const y = Phaser.Math.Between(0, 900);
      const chain = this.add.rectangle(x, y, 2, 12, 0x404040, 0.8);
      chain.setDepth(0);
    }
  }

  createTreasure() {
    // Create the treasure chest that needs to be defended
    this.treasure = this.physics.add.sprite(800, 450, 'treasure');
    this.treasure.setImmovable(true); // Treasure doesn't move
    this.treasure.health = 100;
    this.treasure.maxHealth = 100;
    
    // Set treasure collision body
    this.treasure.body.setSize(50, 40);
    
    // Update game state
    window.GameState.treasureHealth = this.treasure.health;
    
    console.log('Treasure created at center with 100 health');
  }

  createPlayer() {
    const className = window.GameState.selectedClass;
    
    // Create player sprite based on selected class - start closer to center
    if (className === 'knight') {
      this.player = this.physics.add.sprite(600, 450, 'knight-idle');
      this.player.setScale(0.5);
      this.player.setCollideWorldBounds(true);
      this.player.setDrag(300);
      this.player.body.setSize(60, 80);
      this.player.body.setOffset(34, 40);
      this.player.anims.play('knight-idle-anim');
      this.player.currentState = 'idle';
      this.player.attackCombo = 0;
    } else if (className === 'archer') {
      this.player = this.physics.add.sprite(600, 450, 'archer-idle');
      this.player.setScale(0.5);
      this.player.setCollideWorldBounds(true);
      this.player.setDrag(300);
      this.player.body.setSize(60, 80);
      this.player.body.setOffset(34, 40);
      this.player.anims.play('archer-idle-anim');
      this.player.currentState = 'idle';
    } else if (className === 'mage') {
      this.player = this.physics.add.sprite(600, 450, 'mage-idle');
      this.player.setScale(0.5);
      this.player.setCollideWorldBounds(true);
      this.player.setDrag(300);
      this.player.body.setSize(60, 80);
      this.player.body.setOffset(34, 40);
      this.player.anims.play('mage-idle-anim');
      this.player.currentState = 'idle';
    }
    
    // Set player stats based on class
    this.setPlayerStats();
    
    console.log(`${className} player created with stats:`, {
      health: this.player.health,
      speed: this.player.speed,
      damage: this.player.damage
    });
  }

  setPlayerStats() {
    const className = window.GameState.selectedClass;
    
    switch(className) {
      case 'knight':
        this.player.health = 150;
        this.player.maxHealth = 150;
        this.player.speed = 200;
        this.player.damage = 35;
        this.player.attackRange = 100;
        this.player.skillCooldown = 5000;
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
    
    // Update global game state
    window.GameState.playerHealth = this.player.health;
  }

  setupControls() {
    // Create keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,S,A,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Mouse controls for attacking - fix coordinate conversion
    this.input.on('pointerdown', (pointer) => {
      if (this.playerCooldowns.attack <= 0) {
        // Convert screen coordinates to world coordinates
        const camera = this.cameras.main;
        this.mouseX = pointer.x + camera.scrollX;
        this.mouseY = pointer.y + camera.scrollY;
        this.playerAttack();
        this.playerCooldowns.attack = 300; // Attack cooldown
      }
    });
    
    // Space key for special ability
    this.spaceKey.on('down', () => {
      if (this.playerCooldowns.skill <= 0) {
        this.playerSpecialAbility();
        this.playerCooldowns.skill = this.player.skillCooldown;
      }
    });
    
    console.log('Controls setup complete');
  }

  startWave() {
    console.log(`Starting wave ${window.GameState.currentWave}`);
    
    // Request wave data from backend
    API.startWave(window.GameState.sessionId, window.GameState.currentWave).then(response => {
      if (response.success) {
        const waveInfo = response.waveInfo;
        
        this.waveActive = true;
        this.waveEnemiesSpawned = 0;
        this.waveEnemiesRemaining = 0;
        this.waveTargetEnemies = waveInfo.enemyCount + (waveInfo.hasBoss ? 1 : 0);
        
        // Show wave start message
        this.showWaveStartMessage(waveInfo);
        
        // Start spawning enemies based on backend data
        this.spawnEnemiesFromBackend(waveInfo);
      } else {
        console.error('Failed to start wave:', response.message);
        // Fallback to local wave generation
        this.startLocalWave();
      }
    }).catch(error => {
      console.error('Wave start error:', error);
      this.startLocalWave();
    });
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
    
    const overlay = this.add.rectangle(800, 450, 1600, 900, 0x000000, 0.8);
    overlay.setDepth(1000);
    
    this.add.text(800, 300, 'GAME OVER', {
      fontSize: '48px',
      fill: '#ff0000',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1001);
    
    this.add.text(800, 370, `Final Score: ${window.GameState.score}`, {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1001);

    this.add.text(800, 410, 'Score saved locally', {
      fontSize: '14px',
      fill: '#f39c12',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1001);
    
    const restartButton = this.add.rectangle(800, 520, 200, 50, 0x2ecc71);
    restartButton.setDepth(1001);
    restartButton.setInteractive({ useHandCursor: true });
    
    const restartButtonText = this.add.text(800, 520, 'PLAY AGAIN', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1002);
    
    const menuButton = this.add.rectangle(800, 580, 200, 50, 0x3498db);
    menuButton.setDepth(1001);
    menuButton.setInteractive({ useHandCursor: true });
    
    const menuButtonText = this.add.text(800, 580, 'MAIN MENU', {
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

  // Add placeholder methods to prevent errors
  spawnEnemiesFromBackend(waveInfo) {
    // Fallback to local wave if backend data is not available
    this.startLocalWave();
  }
  
  showWaveStartMessage(waveInfo) {
    const message = this.add.text(800, 100, `WAVE ${window.GameState.currentWave}`, {
      fontSize: '32px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1000);
    
    // Fade out after 2 seconds
    this.tweens.add({
      targets: message,
      alpha: 0,
      duration: 2000,
      onComplete: () => message.destroy()
    });
  }
  
  startLocalWave() {
    console.log(`Starting local wave ${window.GameState.currentWave}`);
    
    // Убедиться что предыдущая волна полностью завершена
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.destroy();
      this.enemySpawnTimer = null;
    }
    
    // Очистить всех врагов с предыдущей волны
    this.enemies.clear(true, true);
    
    // Сбросить переменные волны
    this.waveActive = true;
    this.waveEnemiesSpawned = 0;
    this.waveEnemiesRemaining = 0;
    
    // Calculate enemies for this wave
    const baseEnemies = 3;
    const waveMultiplier = window.GameState.currentWave;
    this.waveTargetEnemies = baseEnemies + Math.floor(waveMultiplier * 1.5);
    
    console.log(`Wave ${window.GameState.currentWave} will spawn ${this.waveTargetEnemies} enemies`);
    
    // Start spawning enemies
    this.enemySpawnTimer = this.time.addEvent({
      delay: 2000, // Spawn every 2 seconds
      callback: this.spawnEnemy,
      callbackScope: this,
      repeat: this.waveTargetEnemies - 1
    });
  }
  
  spawnEnemy() {
    if (this.waveEnemiesSpawned >= this.waveTargetEnemies) {
      return;
    }
    
    // Random spawn position at edge of screen
    const side = Phaser.Math.Between(0, 3);
    let x, y;
    
    switch(side) {
      case 0: // Top
        x = Phaser.Math.Between(50, 1550);
        y = 50;
        break;
      case 1: // Right
        x = 1550;
        y = Phaser.Math.Between(50, 850);
        break;
      case 2: // Bottom
        x = Phaser.Math.Between(50, 1550);
        y = 850;
        break;
      case 3: // Left
        x = 50;
        y = Phaser.Math.Between(50, 850);
        break;
    }
    
    // Choose enemy type based on wave
    let enemyType = 'enemy';
    if (window.GameState.currentWave >= 3 && Phaser.Math.Between(0, 100) < 30) {
      enemyType = 'enemy-triangle'; // Fast enemy
    }
    if (window.GameState.currentWave >= 5 && Phaser.Math.Between(0, 100) < 20) {
      enemyType = 'enemy-square'; // Tank enemy
    }
    
    const enemy = this.physics.add.sprite(x, y, enemyType);
    enemy.setScale(0.8);
    
    // Set enemy properties based on type
    switch(enemyType) {
      case 'enemy-triangle':
        enemy.health = 1;
        enemy.speed = 120;
        enemy.damage = 15;
        break;
      case 'enemy-square':
        enemy.health = 3;
        enemy.speed = 60;
        enemy.damage = 25;
        break;
      default: // normal enemy
        enemy.health = 2;
        enemy.speed = 80;
        enemy.damage = 20;
    }
    
    enemy.maxHealth = enemy.health;
    
    // Add to enemies group
    this.enemies.add(enemy);
    this.waveEnemiesSpawned++;
    this.waveEnemiesRemaining++;
    
    console.log(`Spawned ${enemyType} at (${x}, ${y}). Wave progress: ${this.waveEnemiesSpawned}/${this.waveTargetEnemies}`);
  }
  
  playerAttack() {
    const className = window.GameState.selectedClass;
    
    if (className === 'knight') {
      this.knightMeleeAttack();
    } else if (className === 'archer') {
      this.archerRangedAttack();
    } else if (className === 'mage') {
      this.mageSpellAttack();
    }
  }
  
  knightMeleeAttack() {
    // Play proper knight attack animation
    this.player.anims.play('knight-attack-anim');
    
    // Create visual sword slash effect
    this.createSwordSlashEffect();
    
    // Create melee attack area
    const attackRange = 80;
    
    // Check for enemies in range
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      
      if (distance < attackRange) {
        this.damageEnemy(enemy, this.player.damage);
        
        // Visual effect
        this.createHitEffect(enemy.x, enemy.y, '#ffff00');
        
        // Убрали тряску экрана при атаке
      }
    });
    
    // Return to idle after animation completes
    this.player.once('animationcomplete', () => {
      if (this.player.currentState !== 'running') {
        this.player.anims.play('knight-idle-anim');
        this.player.currentState = 'idle';
      }
    });
    
    console.log('Knight melee attack executed!');
  }

  createSwordSlashEffect() {
    // Создаем эффект взмаха меча в направлении клика мыши
    const slashX = this.player.x;
    const slashY = this.player.y - 15;
    
    // Вычисляем угол к мыши
    const angleToMouse = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    // Создаем основной длинный взмах меча
    const slash = this.add.graphics();
    slash.setDepth(50);
    
    // Создаем ШИРОКУЮ дугу взмаха (150 градусов)
    const arcWidth = Math.PI * 0.83; // 150 градусов (150/180 * PI)
    const startAngle = angleToMouse - arcWidth / 2;
    const endAngle = angleToMouse + arcWidth / 2;
    
    // Позиция центра дуги - немного впереди игрока в направлении мыши
    const arcCenterX = slashX + Math.cos(angleToMouse) * 20;
    const arcCenterY = slashY + Math.sin(angleToMouse) * 20;
    
    // Заполняем дугу множественными линиями для создания плотного эффекта
    for (let i = 0; i < 12; i++) {
      const radius = 45 + i * 4; // От 45 до 89 пикселей
      const alpha = 0.9 - i * 0.05; // Постепенно уменьшаем прозрачность
      const thickness = 8 - i * 0.5; // Уменьшаем толщину линий
      
      slash.lineStyle(Math.max(thickness, 2), 0xffffff, alpha);
      slash.beginPath();
      slash.arc(arcCenterX, arcCenterY, radius, startAngle, endAngle, false);
      slash.strokePath();
    }
    
    // Добавляем внутренние слои для полного заполнения
    for (let i = 0; i < 8; i++) {
      const radius = 35 + i * 3; // Внутренние радиусы
      slash.lineStyle(6 - i * 0.3, 0xe6e6e6, 0.7 - i * 0.05);
      slash.beginPath();
      slash.arc(arcCenterX, arcCenterY, radius, startAngle + 0.02, endAngle - 0.02, false);
      slash.strokePath();
    }
    
    // Анимация исчезновения основного взмаха
    this.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 500,
      onComplete: () => slash.destroy()
    });
    
    // Добавляем эффект "следа" меча - несколько быстрых дуг
    for (let i = 1; i <= 4; i++) {
      this.time.delayedCall(i * 25, () => {
        const trailSlash = this.add.graphics();
        trailSlash.setDepth(49 - i);
        
        const trailCenterX = arcCenterX + Math.cos(angleToMouse) * i * 2;
        const trailCenterY = arcCenterY + Math.sin(angleToMouse) * i * 2;
        
        // Создаем след с меньшим количеством линий
        for (let j = 0; j < 6; j++) {
          const radius = 40 + j * 3;
          const alpha = (0.6 - i * 0.1) - j * 0.05;
          const thickness = 6 - i - j * 0.3;
          
          trailSlash.lineStyle(Math.max(thickness, 1), 0xcccccc, Math.max(alpha, 0.1));
          trailSlash.beginPath();
          trailSlash.arc(trailCenterX, trailCenterY, radius, startAngle, endAngle, false);
          trailSlash.strokePath();
        }
        
        this.tweens.add({
          targets: trailSlash,
          alpha: 0,
          duration: 250 - i * 30,
          onComplete: () => trailSlash.destroy()
        });
      });
    }
    
    // Добавляем искры по всей широкой траектории взмаха
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(i * 10, () => {
        // Вычисляем позицию искры вдоль ШИРОКОЙ дуги взмаха
        const progress = i / 14; // от 0 до 1
        const sparkleAngle = startAngle + progress * arcWidth;
        
        // Случайный радиус в пределах заполненной области
        const sparkleRadius = Phaser.Math.Between(45, 85);
        
        const sparkleX = arcCenterX + Math.cos(sparkleAngle) * sparkleRadius;
        const sparkleY = arcCenterY + Math.sin(sparkleAngle) * sparkleRadius;
        
        const sparkle = this.add.circle(sparkleX, sparkleY, Phaser.Math.Between(2, 4), 0xffff00, 0.9);
        sparkle.setDepth(60);
        
        this.tweens.add({
          targets: sparkle,
          alpha: 0,
          scale: 0.2,
          duration: 250,
          onComplete: () => sparkle.destroy()
        });
      });
    }
    
    // Добавляем дополнительные яркие искры в центральной области удара
    const impactX = arcCenterX + Math.cos(angleToMouse) * 65;
    const impactY = arcCenterY + Math.sin(angleToMouse) * 65;
    
    for (let i = 0; i < 8; i++) {
      const offsetX = Phaser.Math.Between(-25, 25);
      const offsetY = Phaser.Math.Between(-25, 25);
      
      const brightSpark = this.add.circle(impactX + offsetX, impactY + offsetY, Phaser.Math.Between(3, 6), 0xffd700, 1);
      brightSpark.setDepth(65);
      
      this.tweens.add({
        targets: brightSpark,
        alpha: 0,
        scale: 0.1,
        duration: 300,
        delay: i * 15,
        onComplete: () => brightSpark.destroy()
      });
    }
  }

  archerRangedAttack() {
    // Play attack animation
    this.player.anims.play('archer-attack1-anim');
    
    // Create arrow projectile
    const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
    arrow.setScale(0.8);
    
    // Calculate direction to mouse with proper coordinates
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    arrow.setRotation(angle);
    
    // Set arrow velocity
    const speed = 400;
    arrow.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    arrow.damage = this.player.damage;
    this.projectiles.add(arrow);
    
    console.log(`Arrow fired from (${this.player.x}, ${this.player.y}) to (${this.mouseX}, ${this.mouseY})`);
    
    // Remove arrow after 3 seconds
    this.time.delayedCall(3000, () => {
      if (arrow && arrow.active) {
        arrow.destroy();
      }
    });
  }
  
  mageSpellAttack() {
    // Play attack animation
    this.player.anims.play('mage-attack1-anim');
    
    // Create fireball projectile
    const fireball = this.physics.add.sprite(this.player.x, this.player.y, 'fireball');
    fireball.setScale(0.9);
    
    // Calculate direction to mouse with proper coordinates
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    // Set fireball velocity
    const speed = 300;
    fireball.body.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    );
    
    fireball.damage = this.player.damage;
    this.projectiles.add(fireball);
    
    // Add fire trail effect
    this.createFireTrail(fireball);
    
    console.log(`Fireball cast from (${this.player.x}, ${this.player.y}) to (${this.mouseX}, ${this.mouseY})`);
    
    // Remove fireball after 4 seconds
    this.time.delayedCall(4000, () => {
      if (fireball && fireball.active) {
        fireball.destroy();
      }
    });
  }
  
  playerSpecialAbility() {
    const className = window.GameState.selectedClass;
    
    console.log(`${className} special ability activated!`);
    
    if (className === 'knight') {
      this.knightShieldBash();
    } else if (className === 'archer') {
      this.archerMultiShot();
    } else if (className === 'mage') {
      this.mageFirestorm();
    }
  }
  
  knightShieldBash() {
    // Knight special: Shield bash - stuns nearby enemies and deals damage
    const bashRange = 150;
    
    // Create visual effect
    const shieldEffect = this.add.circle(this.player.x, this.player.y, bashRange, 0x95a5a6, 0.3);
    shieldEffect.setDepth(50);
    
    // Animate shield effect
    this.tweens.add({
      targets: shieldEffect,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 500,
      onComplete: () => shieldEffect.destroy()
    });
    
    // Damage and stun all enemies in range
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      
      if (distance < bashRange) {
        // Deal damage
        this.damageEnemy(enemy, this.player.damage * 1.5);
        
        // Stun effect - temporarily stop enemy
        const originalSpeed = enemy.speed;
        enemy.speed = 0;
        enemy.setTint(0x4444ff); // Blue tint for stun
        
        // Remove stun after 2 seconds
        this.time.delayedCall(2000, () => {
          if (enemy && enemy.active) {
            enemy.speed = originalSpeed;
            enemy.clearTint();
          }
        });
        
        // Knockback effect
        const knockbackAngle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );
        enemy.x += Math.cos(knockbackAngle) * 50;
        enemy.y += Math.sin(knockbackAngle) * 50;
        
        this.createHitEffect(enemy.x, enemy.y, '#ffff00');
      }
    });
    
    console.log('Knight shield bash executed!');
  }
  
  archerMultiShot() {
    // Archer special: Multi-shot - fires 5 arrows in a spread
    const arrowCount = 5;
    const spreadAngle = Math.PI / 4; // 45 degrees spread
    
    // Calculate base direction (to mouse)
    const baseAngle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    // Fire multiple arrows
    for (let i = 0; i < arrowCount; i++) {
      const angleOffset = (i - 2) * (spreadAngle / 4); // Spread from -2 to +2
      const angle = baseAngle + angleOffset;
      
      const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
      arrow.setScale(0.8);
      arrow.setRotation(angle);
      
      const speed = 450;
      arrow.body.setVelocity(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
      
      arrow.damage = this.player.damage * 0.8; // Slightly less damage per arrow
      this.projectiles.add(arrow);
      
      // Remove arrow after 3 seconds
      this.time.delayedCall(3000, () => {
        if (arrow && arrow.active) {
          arrow.destroy();
        }
      });
    }
    
    console.log('Archer multi-shot executed!');
  }
  
  mageFirestorm() {
    // Mage special: Firestorm - creates multiple fireballs around the player
    const fireballCount = 8;
    const radius = 100;
    
    for (let i = 0; i < fireballCount; i++) {
      const angle = (i / fireballCount) * Math.PI * 2;
      
      // Calculate spawn position around player
      const spawnX = this.player.x + Math.cos(angle) * radius;
      const spawnY = this.player.y + Math.sin(angle) * radius;
      
      // Create fireball with delay
      this.time.delayedCall(i * 100, () => {
        const fireball = this.physics.add.sprite(spawnX, spawnY, 'fireball');
        fireball.setScale(1.2);
        
        // Fire outward from spawn position
        const speed = 250;
        fireball.body.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );
        
        fireball.damage = this.player.damage * 1.2;
        this.projectiles.add(fireball);
        
        // Add fire trail
        this.createFireTrail(fireball);
        
        // Remove after 3 seconds
        this.time.delayedCall(3000, () => {
          if (fireball && fireball.active) {
            fireball.destroy();
          }
        });
      });
    }
    
    console.log('Mage firestorm executed!');
  }

  createFireTrail(fireball) {
    const trail = this.time.addEvent({
      delay: 50,
      callback: () => {
        if (fireball && fireball.active) {
          const fire = this.add.circle(
            fireball.x + Phaser.Math.Between(-5, 5),
            fireball.y + Phaser.Math.Between(-5, 5),
            Phaser.Math.Between(3, 8),
            0xff4500,
            0.6
          );
          fire.setDepth(-1);
          
          // Fade out fire particle
          this.tweens.add({
            targets: fire,
            alpha: 0,
            duration: 300,
            onComplete: () => fire.destroy()
          });
        } else {
          trail.destroy();
        }
      },
      repeat: -1
    });
  }
  
  damageEnemy(enemy, damage) {
    enemy.health -= damage;
    
    // Flash enemy white when hit
    enemy.setTint(0xffffff);
    this.time.delayedCall(100, () => {
      if (enemy && enemy.active) {
        enemy.clearTint();
      }
    });
    
    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }
  
  killEnemy(enemy) {
    // Add score
    const scoreGain = 10 * window.GameState.currentWave;
    window.GameState.score += scoreGain;
    window.GameState.enemiesKilled++;
    
    // Create death effect
    this.createHitEffect(enemy.x, enemy.y, '#ff0000');
    
    // Remove from wave count
    this.waveEnemiesRemaining--;
    
    // Remove enemy
    enemy.destroy();
    
    console.log(`Enemy killed! Score: ${window.GameState.score}, Remaining: ${this.waveEnemiesRemaining}, Spawned: ${this.waveEnemiesSpawned}/${this.waveTargetEnemies}`);
    
    // Check if wave is complete - исправленная логика
    if (this.waveActive && this.waveEnemiesRemaining <= 0 && this.waveEnemiesSpawned >= this.waveTargetEnemies) {
      this.completeWave();
    }
  }
  
  completeWave() {
    console.log(`Wave ${window.GameState.currentWave} completed!`);
    console.log(`Final wave stats - Spawned: ${this.waveEnemiesSpawned}, Target: ${this.waveTargetEnemies}, Remaining: ${this.waveEnemiesRemaining}`);
    
    // Остановить активную волну
    this.waveActive = false;
    
    // Очистить таймер спавна врагов если он еще активен
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.destroy();
      this.enemySpawnTimer = null;
    }
    
    // Увеличить номер волны
    window.GameState.currentWave++;
    
    // Показать сообщение о завершении волны
    const message = this.add.text(800, 200, 'WAVE COMPLETE!', {
      fontSize: '32px',
      fill: '#00ff00',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1000);
    
    // Показать бонус за волну
    const bonusMessage = this.add.text(800, 250, `Bonus: +${50 * (window.GameState.currentWave - 1)} points`, {
      fontSize: '20px',
      fill: '#f39c12',
      fontFamily: 'Courier New'
    }).setOrigin(0.5).setDepth(1000);
    
    // Добавить бонус к счету
    window.GameState.score += 50 * (window.GameState.currentWave - 1);
    
    // Fade out message
    this.tweens.add({
      targets: [message, bonusMessage],
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        message.destroy();
        bonusMessage.destroy();
      }
    });
    
    // Полностью сбросить переменные волны перед началом новой
    this.time.delayedCall(3000, () => {
      // Сброс всех переменных волны
      this.waveEnemiesSpawned = 0;
      this.waveEnemiesRemaining = 0;
      this.waveTargetEnemies = 0;
      
      // Очистить всех оставшихся врагов (на всякий случай)
      this.enemies.clear(true, true);
      
      console.log(`Starting preparation for wave ${window.GameState.currentWave}`);
      
      // Запустить новую волну
      this.startWave();
    });
  }

  createHitEffect(x, y, color) {
    const effect = this.add.circle(x, y, 20, color === '#ffff00' ? 0xffff00 : 0xff0000, 0.8);
    effect.setDepth(100);
    
    this.tweens.add({
      targets: effect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => effect.destroy()
    });
  }

  update() {
    // Update cooldowns
    if (this.playerCooldowns.attack > 0) {
      this.playerCooldowns.attack -= this.game.loop.delta;
    }
    if (this.playerCooldowns.skill > 0) {
      this.playerCooldowns.skill -= this.game.loop.delta;
    }
    
    // Player movement
    this.updatePlayerMovement();
    
    // Enemy AI
    this.updateEnemies();
    
    // Projectile collisions
    this.updateProjectiles();
    
    // Check collisions
    this.checkCollisions();
    
    // Update mouse position continuously for better targeting
    this.input.on('pointermove', (pointer) => {
      const camera = this.cameras.main;
      this.mouseX = pointer.x + camera.scrollX;
      this.mouseY = pointer.y + camera.scrollY;
    });
  }
  
  updatePlayerMovement() {
    if (!this.player || !this.player.active) return;
    
    const speed = this.player.speed;
    let isMoving = false;
    
    // Handle WASD movement
    if (this.wasd.A.isDown || this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      isMoving = true;
    } else if (this.wasd.D.isDown || this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      isMoving = true;
    } else {
      this.player.setVelocityX(0);
    }
    
    if (this.wasd.W.isDown || this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
      isMoving = true;
    } else if (this.wasd.S.isDown || this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
      isMoving = true;
    } else {
      this.player.setVelocityY(0);
    }
    
    // Update animation based on movement
    const className = window.GameState.selectedClass;
    if (isMoving && this.player.currentState !== 'running') {
      this.player.anims.play(`${className}-run-anim`);
      this.player.currentState = 'running';
    } else if (!isMoving && this.player.currentState !== 'idle') {
      this.player.anims.play(`${className}-idle-anim`);
      this.player.currentState = 'idle';
    }
  }
  
  updateEnemies() {
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      // Move enemy toward treasure
      const angle = Phaser.Math.Angle.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      enemy.setVelocity(
        Math.cos(angle) * enemy.speed,
        Math.sin(angle) * enemy.speed
      );
    });
  }
  
  updateProjectiles() {
    this.projectiles.children.entries.forEach(projectile => {
      if (!projectile || !projectile.active) return;
      
      // Check if projectile is out of bounds
      if (projectile.x < 0 || projectile.x > 1600 || projectile.y < 0 || projectile.y > 900) {
        projectile.destroy();
        return;
      }
      
      // Check collision with enemies
      this.enemies.children.entries.forEach(enemy => {
        if (!enemy || !enemy.active) return;
        
        const distance = Phaser.Math.Distance.Between(
          projectile.x, projectile.y,
          enemy.x, enemy.y
        );
        
        if (distance < 20) {
          this.damageEnemy(enemy, projectile.damage);
          this.createHitEffect(enemy.x, enemy.y, '#ffff00');
          projectile.destroy();
        }
      });
    });
  }
  
  checkCollisions() {
    // Check enemy-treasure collisions
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      const distance = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      if (distance < 40) {
        // Enemy reached treasure
        this.treasure.health -= enemy.damage;
        window.GameState.treasureHealth = this.treasure.health;
        
        this.createHitEffect(this.treasure.x, this.treasure.y, '#ff0000');
        // Добавляем тряску экрана при уроне сундуку
        this.cameras.main.shake(150, 0.02);
        
        // Remove enemy from wave count properly
        this.waveEnemiesRemaining--;
        enemy.destroy();
        
        console.log(`Treasure damaged! Health: ${this.treasure.health}, Enemies remaining: ${this.waveEnemiesRemaining}`);
        
        // Check wave completion after enemy reaches treasure
        if (this.waveActive && this.waveEnemiesRemaining <= 0 && this.waveEnemiesSpawned >= this.waveTargetEnemies) {
          this.completeWave();
        }
        
        if (this.treasure.health <= 0) {
          this.gameOver();
        }
      }
    });
    
    // Check enemy-player collisions
    this.enemies.children.entries.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      const distance = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.player.x, this.player.y
      );
      
      if (distance < 30) {
        // Player takes damage
        this.player.health -= Math.floor(enemy.damage / 2);
        window.GameState.playerHealth = this.player.health;
        
        this.createHitEffect(this.player.x, this.player.y, '#ff0000');
        // Добавляем тряску экрана при уроне игроку
        this.cameras.main.shake(120, 0.015);
        
        // Push enemy away slightly instead of destroying it
        const pushAngle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );
        enemy.x += Math.cos(pushAngle) * 30;
        enemy.y += Math.sin(pushAngle) * 30;
        
        console.log(`Player damaged! Health: ${this.player.health}`);
        
        if (this.player.health <= 0) {
          this.gameOver();
        }
      }
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
    
    // Show special ability cooldown
    this.skillCooldownText = this.add.text(20, 145, 'Special: Ready', {
      fontSize: '14px',
      fill: '#00ff00',
      fontFamily: 'Courier New'
    });
    
    // Show offline mode indicator
    if (window.GameState.isOfflineMode) {
      this.offlineText = this.add.text(20, 170, 'OFFLINE MODE', {
        fontSize: '12px',
        fill: '#e74c3c',
        fontFamily: 'Courier New'
      });
    }
    
    // Controls reminder
    this.controlsText = this.add.text(20, 200, 'WASD: Move | Click: Attack | SPACE: Special', {
      fontSize: '12px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    });
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
    
    // Update special ability cooldown
    const gameScene = this.scene.get('GameScene');
    if (gameScene && gameScene.playerCooldowns && this.skillCooldownText) {
      const cooldown = gameScene.playerCooldowns.skill;
      if (cooldown <= 0) {
        this.skillCooldownText.setText('Special: Ready');
        this.skillCooldownText.setFill('#00ff00');
      } else {
        const seconds = Math.ceil(cooldown / 1000);
        this.skillCooldownText.setText(`Special: ${seconds}s`);
        this.skillCooldownText.setFill('#ff9900');
      }
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
  width: 1600,
  height: 900,
  parent: 'game-container',
  backgroundColor: '#1a252f',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1600,
    height: 900
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [PreloaderScene, LoginScene, LeaderboardScene, MenuScene, GameScene, UIScene],
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  }
};

// Handle window resize
window.addEventListener('resize', () => {
  if (window.game) {
    window.game.scale.refresh();
  }
});

window.game = new Phaser.Game(config);
console.log('Kill-n-Keep game initialized!');
