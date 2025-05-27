export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    console.log('UIScene created');
    
    // Health text
    this.healthText = this.add.text(20, 20, 'Health: 100', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    });

    // Wave counter
    this.waveText = this.add.text(20, 50, 'Wave: 1', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    });

    // Score
    this.scoreText = this.add.text(20, 80, 'Score: 0', {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    });

    // Controls
    this.add.text(1180, 20, 'Controls:', {
      fontSize: '14px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(1, 0);

    this.add.text(1180, 40, 'WASD/Arrows: Move', {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(1, 0);

    this.add.text(1180, 60, 'SPACE: Attack', {
      fontSize: '12px',
      fill: '#ffffff',
      fontFamily: 'Courier New'
    }).setOrigin(1, 0);
  }

  update() {
    // Update UI elements
    this.healthText.setText(`Health: ${window.GameState.playerHealth}`);
    this.waveText.setText(`Wave: ${window.GameState.currentWave}`);
    this.scoreText.setText(`Score: ${window.GameState.score}`);
  }
}
