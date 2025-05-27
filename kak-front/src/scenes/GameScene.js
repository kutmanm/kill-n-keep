export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    console.log('GameScene created');
    
    // Create simple colored sprites
    this.createSprites();
    
    // Create game world (top-down view)
    this.createWorld();
    this.createPlayer();
    this.createTreasure();
    this.setupControls();
    
    // Groups for game objects
    this.enemies = this.add.group();
    this.projectiles = this.add.group();
    this.effects = this.add.group();
    
    // Player abilities cooldowns
    this.playerCooldowns = {
      attack: 0,
      skill: 0
    };
    
    // Start enemy spawning
    this.time.addEvent({
      delay: 3000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });
  }

  createSprites() {
    const graphics = this.add.graphics();
    
    // Player sprites (top-down view)
    // Knight (blue square with cross)
    graphics.fillStyle(0x3498db);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0xffffff);
    graphics.fillRect(14, 8, 4, 16);
    graphics.fillRect(8, 14, 16, 4);
    graphics.generateTexture('knight', 32, 32);
    
    // Archer (green circle with arrow)
    graphics.clear();
    graphics.fillStyle(0x27ae60);
    graphics.fillCircle(16, 16, 16);
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(14, 6, 4, 20);
    graphics.fillTriangle(16, 4, 12, 8, 20, 8);
    graphics.generateTexture('archer', 32, 32);
    
    // Mage (purple diamond with star)
    graphics.clear();
    graphics.fillStyle(0x9b59b6);
    graphics.fillTriangle(16, 0, 0, 16, 16, 32);
    graphics.fillTriangle(16, 0, 32, 16, 16, 32);
    graphics.fillStyle(0xf1c40f);
    graphics.fillStar(16, 16, 5, 6, 3);
    graphics.generateTexture('mage', 32, 32);
    
    // Enemy sprite (red circle)
    graphics.clear();
    graphics.fillStyle(0xe74c3c);
    graphics.fillCircle(12, 12, 12);
    graphics.generateTexture('enemy', 24, 24);
    
    // Treasure sprite (gold diamond)
    graphics.clear();
    graphics.fillStyle(0xf1c40f);
    graphics.fillRect(16, 0, 32, 32);
    graphics.fillRect(0, 16, 64, 32);
    graphics.generateTexture('treasure', 64, 64);
    
    // Projectiles
    // Arrow
    graphics.clear();
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(0, 0, 16, 4);
    graphics.fillTriangle(16, 2, 20, 0, 20, 4);
    graphics.generateTexture('arrow', 20, 4);
    
    // Fireball
    graphics.clear();
    graphics.fillStyle(0xff4500);
    graphics.fillCircle(8, 8, 8);
    graphics.fillStyle(0xffd700);
    graphics.fillCircle(8, 8, 4);
    graphics.generateTexture('fireball', 16, 16);
    
    // Ice shard
    graphics.clear();
    graphics.fillStyle(0x00bfff);
    graphics.fillTriangle(8, 0, 0, 16, 16, 16);
    graphics.generateTexture('iceShard', 16, 16);
    
    graphics.destroy();
  }

  createWorld() {
    // Background (grass/ground texture)
    this.add.rectangle(600, 300, 1200, 600, 0x228b22);
    
    // Add some environmental details
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(50, 1150);
      const y = Phaser.Math.Between(50, 550);
      this.add.circle(x, y, 3, 0x32cd32);
    }
    
    // No gravity needed for top-down view
    this.physics.world.gravity.y = 0;
  }

  createPlayer() {
    const className = window.GameState.selectedClass;
    this.player = this.physics.add.sprite(600, 300, className);
    this.player.setCollideWorldBounds(true);
    this.player.setDrag(300); // Smooth movement stopping
    
    // Set player stats based on class
    this.setPlayerStats();
  }

  setPlayerStats() {
    const className = window.GameState.selectedClass;
    switch(className) {
      case 'knight':
        this.player.health = 150;
        this.player.speed = 200;
        this.player.damage = 30;
        this.player.attackRange = 50;
        this.player.skillCooldown = 3000; // 3 seconds
        break;
      case 'archer':
        this.player.health = 100;
        this.player.speed = 250;
        this.player.damage = 25;
        this.player.attackRange = 200;
        this.player.skillCooldown = 2000; // 2 seconds
        break;
      case 'mage':
        this.player.health = 80;
        this.player.speed = 180;
        this.player.damage = 35;
        this.player.attackRange = 150;
        this.player.skillCooldown = 4000; // 4 seconds
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
    this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  spawnEnemy() {
    // Spawn from random edge
    const edge = Phaser.Math.Between(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    let x, y;
    
    switch(edge) {
      case 0: x = Phaser.Math.Between(50, 1150); y = 25; break; // top
      case 1: x = 1175; y = Phaser.Math.Between(50, 550); break; // right
      case 2: x = Phaser.Math.Between(50, 1150); y = 575; break; // bottom
      case 3: x = 25; y = Phaser.Math.Between(50, 550); break; // left
    }
    
    const enemy = this.physics.add.sprite(x, y, 'enemy');
    enemy.setCollideWorldBounds(true);
    enemy.health = 40;
    enemy.speed = 60;
    enemy.setDrag(100);
    
    this.enemies.add(enemy);
    console.log('Enemy spawned at edge', edge);
  }

  update() {
    if (!this.player) return;
    
    // Update cooldowns
    this.playerCooldowns.attack = Math.max(0, this.playerCooldowns.attack - this.game.loop.delta);
    this.playerCooldowns.skill = Math.max(0, this.playerCooldowns.skill - this.game.loop.delta);
    
    // Player movement (8-directional)
    this.handlePlayerMovement();
    
    // Player actions
    this.handlePlayerActions();
    
    // Update enemies
    this.updateEnemies();
    
    // Update projectiles
    this.updateProjectiles();
  }

  handlePlayerMovement() {
    let velocityX = 0;
    let velocityY = 0;
    
    // Horizontal movement
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -this.player.speed;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = this.player.speed;
    }
    
    // Vertical movement
    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -this.player.speed;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = this.player.speed;
    }
    
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707; // 1/sqrt(2)
      velocityY *= 0.707;
    }
    
    this.player.setVelocity(velocityX, velocityY);
    
    // Rotate player to face movement direction
    if (velocityX !== 0 || velocityY !== 0) {
      this.player.rotation = Math.atan2(velocityY, velocityX) + Math.PI/2;
    }
  }

  handlePlayerActions() {
    // Basic attack
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.playerCooldowns.attack <= 0) {
      this.playerAttack();
      this.playerCooldowns.attack = 500; // 0.5 second cooldown
    }
    
    // Special skill
    if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && this.playerCooldowns.skill <= 0) {
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
    console.log('Knight melee attack!');
    const attackRange = this.player.attackRange;
    
    this.enemies.children.entries.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      
      if (distance <= attackRange) {
        this.damageEnemy(enemy, this.player.damage);
      }
    });
    
    // Visual effect
    const effect = this.add.circle(this.player.x, this.player.y, attackRange, 0xffffff, 0.3);
    this.time.delayedCall(100, () => effect.destroy());
  }

  archerRangedAttack() {
    console.log('Archer shoots arrow!');
    
    // Find nearest enemy
    let nearestEnemy = null;
    let minDistance = Infinity;
    
    this.enemies.children.entries.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy;
      }
    });
    
    if (nearestEnemy) {
      const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
      arrow.damage = this.player.damage;
      arrow.setScale(0.8);
      
      // Calculate angle and velocity
      const angle = Phaser.Math.Angle.Between(
        this.player.x, this.player.y,
        nearestEnemy.x, nearestEnemy.y
      );
      arrow.rotation = angle;
      arrow.setVelocity(
        400 * Math.cos(angle),
        400 * Math.sin(angle)
      );
      
      this.projectiles.add(arrow);
    }
  }

  mageSpellAttack() {
    console.log('Mage casts spell!');
    
    // Auto-targeting fireball
    let nearestEnemy = null;
    let minDistance = Infinity;
    
    this.enemies.children.entries.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = enemy;
      }
    });
    
    if (nearestEnemy) {
      const fireball = this.physics.add.sprite(this.player.x, this.player.y, 'fireball');
      fireball.damage = this.player.damage;
      fireball.setScale(1.2);
      
      const angle = Phaser.Math.Angle.Between(
        this.player.x, this.player.y,
        nearestEnemy.x, nearestEnemy.y
      );
      
      fireball.setVelocity(
        300 * Math.cos(angle),
        300 * Math.sin(angle)
      );
      
      this.projectiles.add(fireball);
    }
  }

  playerSkill() {
    const className = window.GameState.selectedClass;
    
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
    console.log('Knight uses Shield Bash!');
    const bashRange = 80;
    
    this.enemies.children.entries.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      
      if (distance <= bashRange) {
        this.damageEnemy(enemy, this.player.damage * 2);
        // Knockback effect
        const angle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );
        enemy.setVelocity(
          300 * Math.cos(angle),
          300 * Math.sin(angle)
        );
      }
    });
    
    // Visual effect
    const effect = this.add.circle(this.player.x, this.player.y, bashRange, 0x3498db, 0.5);
    this.time.delayedCall(200, () => effect.destroy());
  }

  archerArrowStorm() {
    console.log('Archer uses Arrow Storm!');
    
    // Shoot 8 arrows in all directions
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const arrow = this.physics.add.sprite(this.player.x, this.player.y, 'arrow');
      arrow.damage = this.player.damage * 0.8;
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
    const novaRange = 120;
    
    // Damage and slow all enemies in range
    this.enemies.children.entries.forEach(enemy => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );
      
      if (distance <= novaRange) {
        this.damageEnemy(enemy, this.player.damage * 1.5);
        // Freeze effect
        enemy.setTint(0x00bfff);
        enemy.frozenSpeed = enemy.speed;
        enemy.speed = enemy.speed * 0.3; // Slow to 30% speed
        
        this.time.delayedCall(3000, () => {
          if (enemy.active) {
            enemy.clearTint();
            enemy.speed = enemy.frozenSpeed || 60;
          }
        });
        
        // Ice shard visual
        const shard = this.add.sprite(enemy.x, enemy.y, 'iceShard');
        this.time.delayedCall(3000, () => shard.destroy());
      }
    });
    
    // Visual effect
    const effect = this.add.circle(this.player.x, this.player.y, novaRange, 0x00bfff, 0.3);
    this.time.delayedCall(300, () => effect.destroy());
  }

  damageEnemy(enemy, damage) {
    enemy.health -= damage;
    enemy.setTint(0xff0000);
    this.time.delayedCall(100, () => enemy.clearTint());
    
    if (enemy.health <= 0) {
      enemy.destroy();
      window.GameState.score += 10;
    }
  }

  updateEnemies() {
    this.enemies.children.entries.forEach(enemy => {
      // Move towards treasure
      const angle = Phaser.Math.Angle.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      enemy.setVelocity(
        enemy.speed * Math.cos(angle),
        enemy.speed * Math.sin(angle)
      );
      
      // Rotate to face movement direction
      enemy.rotation = angle + Math.PI/2;
      
      // Check if enemy reached treasure
      const distance = Phaser.Math.Distance.Between(
        enemy.x, enemy.y,
        this.treasure.x, this.treasure.y
      );
      
      if (distance < 40) {
        this.treasure.health -= 15;
        enemy.destroy();
        window.GameState.treasureHealth = this.treasure.health;
        
        if (this.treasure.health <= 0) {
          console.log('Game Over!');
          this.gameOver();
        }
      }
    });
  }

  updateProjectiles() {
    this.projectiles.children.entries.forEach(projectile => {
      // Check collision with enemies
      this.enemies.children.entries.forEach(enemy => {
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

  gameOver() {
    this.scene.pause();
    this.add.rectangle(600, 300, 1200, 600, 0x000000, 0.7);
    this.add.text(600, 250, 'GAME OVER', {
      fontSize: '48px',
      fill: '#ff0000',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    this.add.text(600, 320, `Final Score: ${window.GameState.score}`, {
      fontSize: '24px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    const restartButton = this.add.rectangle(600, 380, 200, 50, 0x2ecc71);
    this.add.text(600, 380, 'RESTART', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);
    
    restartButton.setInteractive();
    restartButton.on('pointerdown', () => {
      this.scene.restart();
      this.scene.restart('UIScene');
    });
  }
}
