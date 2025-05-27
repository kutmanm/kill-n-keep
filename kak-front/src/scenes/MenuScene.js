export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
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

    // Class selection
    this.add.text(600, 200, 'Choose Your Class:', {
      fontSize: '28px',
      fill: '#ecf0f1',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Class buttons with descriptions
    this.createClassButton(200, 300, 'KNIGHT', 'knight', 0xe74c3c, 
      'Melee Fighter\nShield Bash\nHigh Health');
    this.createClassButton(600, 300, 'ARCHER', 'archer', 0x27ae60,
      'Ranged Attacker\nArrow Storm\nHigh Speed');
    this.createClassButton(1000, 300, 'MAGE', 'mage', 0x3498db,
      'Spell Caster\nFrost Nova\nHigh Damage');

    // Controls
    this.add.text(600, 450, 'Controls: WASD/Arrows = Move, SPACE = Attack, SHIFT = Special Skill', {
      fontSize: '16px',
      fill: '#95a5a6',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.rectangle(600, 520, 200, 50, 0x2ecc71);
    const startText = this.add.text(600, 520, 'START GAME', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(0.5);

    startButton.setInteractive();
    startButton.on('pointerdown', () => {
      // Auto-generate nickname if none provided
      if (!window.GameState.selectedClass) {
        window.GameState.selectedClass = 'knight';
      }
      
      this.scene.start('GameScene');
      this.scene.start('UIScene');
    });

    startButton.on('pointerover', () => {
      startButton.setFillStyle(0x27ae60);
    });

    startButton.on('pointerout', () => {
      startButton.setFillStyle(0x2ecc71);
    });
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

    button.setInteractive();
    
    button.on('pointerdown', () => {
      window.GameState.selectedClass = className;
      // Clear all selections
      this.children.list.forEach(child => {
        if (child.getData && child.getData('classButton')) {
          child.setStrokeStyle(0);
        }
      });
      button.setStrokeStyle(4, 0xffffff);
      console.log('Selected class:', className);
    });

    button.on('pointerover', () => {
      if (!button.getData('selected')) {
        button.setStrokeStyle(2, 0xcccccc);
      }
    });

    button.on('pointerout', () => {
      if (!button.getData('selected')) {
        button.setStrokeStyle(0);
      }
    });

    button.setData('classButton', true);
    
    // Default selection
    if (className === 'knight') {
      button.setStrokeStyle(4, 0xffffff);
      button.setData('selected', true);
    }
  }
}
