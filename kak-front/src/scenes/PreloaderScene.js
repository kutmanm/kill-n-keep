import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload() {
    // Don't try to load logo that doesn't exist
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
    graphics.fillStyle(0x95a5a6);
    graphics.fillRect(48, 16, 32, 80);
    graphics.fillRect(40, 24, 48, 16);
    
    graphics.fillStyle(0xf4d03f);
    graphics.fillRect(46, 32, 36, 4);
    graphics.fillRect(58, 20, 12, 8);
    
    graphics.fillStyle(0x2c3e50);
    graphics.fillRect(60, 24, 8, 4);
    
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(16, 32, 4, 32);
    graphics.fillStyle(0xc0c0c0);
    graphics.fillRect(12, 16, 12, 24);
    
    graphics.fillStyle(0xe74c3c);
    graphics.fillTriangle(80, 24, 96, 32, 80, 64);
    
    graphics.generateTexture('knight-idle', 128, 128);
    
    // Knight running pose
    graphics.clear();
    graphics.fillStyle(0x95a5a6);
    graphics.fillRect(52, 16, 32, 80);
    graphics.fillRect(44, 24, 48, 16);
    
    graphics.fillStyle(0xf4d03f);
    graphics.fillRect(50, 32, 36, 4);
    graphics.fillRect(62, 20, 12, 8);
    
    graphics.fillStyle(0x2c3e50);
    graphics.fillRect(64, 24, 8, 4);
    
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(20, 28, 4, 32);
    graphics.fillStyle(0xc0c0c0);
    graphics.fillRect(16, 12, 12, 24);
    
    graphics.fillStyle(0xe74c3c);
    graphics.fillTriangle(84, 20, 100, 28, 84, 60);
    
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
    
    // ...existing code for archer and mage sprites...
    
    graphics.destroy();
  }
}
