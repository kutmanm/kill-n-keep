import Phaser from 'phaser';
import './styles/index.css';

// Global game state
window.GameState = {
  currentWave: 1,
  score: 0,
  playerHealth: 100,
  treasureHealth: 100,
  selectedClass: 'knight',
  gameSession: null,
  // Auth state
  isLoggedIn: false,
  playerId: null,
  username: null,
  playerLevel: 1,
  bestScore: 0
};

// API helper functions
function apiCall(endpoint, method = 'GET', data = null) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    config.body = JSON.stringify(data);
  }
  
  return fetch(`http://localhost:8081/api${endpoint}`, config)
    .then(response => response.json())
    .catch(error => {
      console.error('API call failed:', error);
      return { success: false, message: 'Network error' };
    });
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

    apiCall('/auth/login', 'POST', {
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

    apiCall('/auth/register', 'POST', {
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
    apiCall(`/leaderboard/${type}?limit=10`).then(response => {
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
    
    // Check auth
    if (!window.GameState.isLoggedIn) {
      this.scene.start('LoginScene');
      return;
    }
    
    // Background
    this.add.rectangle(600, 300, 1200, 600, 0x1a252f);
    
    // Title
    this.add.text(600, 100, 'KILL N\' KEEP', {
      fontSize: '48px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    this.add.text(600, 140, 'Defend the Treasure! (Top-Down View)', {
      fontSize: '20px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Player info
    this.add.text(600, 180, `Player: ${window.GameState.username} | Level: ${window.GameState.playerLevel} | Best: ${window.GameState.bestScore}`, {
      fontSize: '16px',
      fill: '#3498db',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.createClassSelection();
    this.createButtons();
  }

  createClassSelection() {
    // Class selection
    this.add.text(600, 250, 'Choose Your Class:', {
      fontSize: '28px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    this.classButtons = [];

    // Class buttons
    this.createClassButton(200, 350, 'KNIGHT', 'knight', 0xe74c3c, 
      'Melee Fighter\nShield Bash\nHigh Health');
    this.createClassButton(600, 350, 'ARCHER', 'archer', 0x27ae60,
      'Ranged Attacker\nArrow Storm\nHigh Speed');
    this.createClassButton(1000, 350, 'MAGE', 'mage', 0x3498db,
      'Spell Caster\nFrost Nova\nHigh Damage');

    // Controls
    this.add.text(600, 450, 'Controls: WASD/Arrows = Move, Mouse Click = Attack, SPACE = Special Skill', {
      fontSize: '16px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
  }

  createClassButton(x, y, name, className, color, description) {
    const button = this.add.rectangle(x, y, 180, 120, color);
    const text = this.add.text(x, y - 30, name, {
      fontSize: '18px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    const desc = this.add.text(x, y + 15, description, {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: 'Courier New',
      align: 'center'
    }).setOrigin(0.5);

    button.setInteractive({ useHandCursor: true });
    button.setData('className', className);
    
    button.on('pointerdown', () => {
      window.GameState.selectedClass = className;
      
      this.classButtons.forEach(btn => {
        btn.setStrokeStyle(0);
      });
      
      button.setStrokeStyle(4, 0xffffff);
    });

    this.classButtons.push(button);
    
    if (className === 'knight') {
      button.setStrokeStyle(4, 0xffffff);
    }
  }

  createButtons() {
    // Start button
    const startButton = this.add.rectangle(600, 520, 200, 50, 0x2ecc71);
    this.add.text(600, 520, 'START GAME', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    startButton.setInteractive({ useHandCursor: true });
    startButton.on('pointerdown', () => {
      this.scene.stop('MenuScene');
      this.scene.start('GameScene');
      this.scene.launch('UIScene');
    });

    // Leaderboard button
    const leaderboardButton = this.add.rectangle(400, 520, 150, 40, 0x3498db);
    this.add.text(400, 520, 'LEADERBOARD', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    leaderboardButton.setInteractive();
    leaderboardButton.on('pointerdown', () => {
      this.scene.start('LeaderboardScene');
    });

    // Logout button
    const logoutButton = this.add.rectangle(800, 520, 100, 40, 0xe74c3c);
    this.add.text(800, 520, 'LOGOUT', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    logoutButton.setInteractive();
    logoutButton.on('pointerdown', () => {
      localStorage.removeItem('killnkeep_auth');
      window.GameState.isLoggedIn = false;
      this.scene.start('LoginScene');
    });
  }
}

// Game Scene
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('GameScene created with class:', window.GameState.selectedClass);
    
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
    
    this.enemySpawnTimer = this.time.addEvent({
      delay: 3000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
  }

  createSprites() {
    const graphics = this.add.graphics();
    
    // Knight (blue square with cross)
    graphics.fillStyle(0x3498db);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0xffffff);
    graphics.fillRect(14, 8, 4, 16);
    graphics.fillRect(8, 14, 16, 4);
    graphics.generateTexture('knight', 32, 32);
    
    // Archer (green circle)
    graphics.clear();
    graphics.fillStyle(0x27ae60);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('archer', 32, 32);
    
    // Mage (purple diamond)
    graphics.clear();
    graphics.fillStyle(0x9b59b6);
    graphics.fillTriangle(16, 0, 0, 16, 16, 32);
    graphics.fillTriangle(16, 0, 32, 16, 16, 32);
    graphics.generateTexture('mage', 32, 32);
    
    // Enemy (red circle)
    graphics.clear();
    graphics.fillStyle(0xe74c3c);
    graphics.fillCircle(12, 12, 12);
    graphics.generateTexture('enemy', 24, 24);
    
    // Treasure (gold)
    graphics.clear();
    graphics.fillStyle(0xf1c40f);
    graphics.fillRect(16, 0, 32, 32);
    graphics.fillRect(0, 16, 64, 32);
    graphics.generateTexture('treasure', 64, 64);
    
    graphics.destroy();
  }

  createWorld() {
    this.add.rectangle(600, 300, 1200, 600, 0x228b22);
    this.physics.world.gravity.y = 0;
  }

  createPlayer() {
    const className = window.GameState.selectedClass;
    this.player = this.physics.add.sprite(600, 300, className);
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
        this.player.damage = 30;
        this.player.attackRange = 80;
        this.player.skillCooldown = 3000;
        break;
      case 'archer':
        this.player.health = 100;
        this.player.maxHealth = 100;
        this.player.speed = 250;
        this.player.damage = 25;
        this.player.attackRange = 200;
        this.player.skillCooldown = 2000;
        break;
      case 'mage':
        this.player.health = 80;
        this.player.maxHealth = 80;
        this.player.speed = 180;
        this.player.damage = 35;
        this.player.attackRange = 150;
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
        this.playerCooldowns.attack = 500;
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
    if (window.GameState.selectedClass === 'knight') {
      this.knightMeleeAttack();
    }
    // Add other class attacks here
  }

  knightMeleeAttack() {
    const attackRange = this.player.attackRange;
    const mouseAngle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      this.mouseX, this.mouseY
    );
    
    const arcAngle = Math.PI / 2;
    let enemiesHit = 0;
    
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
          enemiesHit++;
        }
      }
    });
    
    this.drawSwordArc(this.player.x, this.player.y, attackRange, mouseAngle - arcAngle / 2, mouseAngle + arcAngle / 2);
  }

  drawSwordArc(x, y, radius, startAngle, endAngle) {
    const graphics = this.add.graphics();
    
    graphics.lineStyle(6, 0xffffff, 0.9);
    graphics.beginPath();
    graphics.arc(x, y, radius, startAngle, endAngle);
    graphics.strokePath();
    
    this.time.delayedCall(200, () => {
      if (graphics && graphics.scene) {
        graphics.destroy();
      }
    });
  }

  playerSkill() {
    // Add skill implementations here
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

  updateEnemies() {
    const enemiesList = [...this.enemies.children.entries];
    
    enemiesList.forEach(enemy => {
      if (!enemy || !enemy.active) return;
      
      const angle = Phaser.Math.Angle.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      enemy.setVelocity(
        enemy.speed * Math.cos(angle),
        enemy.speed * Math.sin(angle)
      );
      
      const distance = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      if (distance < 40) {
        this.treasure.health -= 15;
        enemy.destroy();
        window.GameState.treasureHealth = this.treasure.health;
        
        if (this.treasure.health <= 0) {
          this.gameOver();
        }
      }
    });
  }

  gameOver() {
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.destroy();
    }
    
    this.physics.pause();

    // Send score to backend
    if (window.GameState.isLoggedIn && window.GameState.playerId) {
      apiCall('/session/complete', 'POST', {
        playerId: window.GameState.playerId,
        finalScore: window.GameState.score,
        finalWave: window.GameState.currentWave
      }).then(response => {
        console.log('Score saved:', response);
      });
    }
    
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

    if (window.GameState.score > window.GameState.bestScore) {
      this.add.text(600, 320, 'NEW RECORD!', {
        fontSize: '20px',
        fill: '#f1c40f',
        fontFamily: 'Courier New'
      }).setOrigin(0.5);
      window.GameState.bestScore = window.GameState.score;
    }
    
    const restartButton = this.add.rectangle(600, 420, 200, 50, 0x2ecc71);
    this.add.text(600, 420, 'PLAY AGAIN', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    restartButton.setInteractive();
    restartButton.on('pointerdown', () => {
      this.scene.stop('UIScene');
      this.scene.restart();
      this.scene.launch('UIScene');
    });

    const menuButton = this.add.rectangle(600, 480, 200, 50, 0x3498db);
    this.add.text(600, 480, 'MAIN MENU', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    menuButton.setInteractive();
    menuButton.on('pointerdown', () => {
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
  scene: [LoginScene, LeaderboardScene, MenuScene, GameScene, UIScene]
};

// Initialize the game
const game = new Phaser.Game(config);

console.log('Kill-n-Keep game with auth system initialized!');
