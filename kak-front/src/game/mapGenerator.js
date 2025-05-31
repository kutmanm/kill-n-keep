export class MapGenerator {
  constructor(scene) {
    this.scene = scene;
  }

  createGrassBackground() {
    const graphics = this.scene.add.graphics();
    
    // Base grass color
    graphics.fillStyle(0x228b22); // Forest green
    graphics.fillRect(0, 0, 1200, 600);
    
    // Add grass texture variation
    for (let i = 0; i < 2000; i++) {
      const x = Phaser.Math.Between(0, 1200);
      const y = Phaser.Math.Between(0, 600);
      const grassShade = Phaser.Math.Between(0, 3);
      
      let color;
      switch(grassShade) {
        case 0: color = 0x32cd32; break; // Lime green
        case 1: color = 0x228b22; break; // Forest green
        case 2: color = 0x006400; break; // Dark green
        case 3: color = 0x9acd32; break; // Yellow green
      }
      
      graphics.fillStyle(color);
      graphics.fillRect(x, y, 2, 2);
    }
    
    // Add some dirt patches
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, 1200);
      const y = Phaser.Math.Between(0, 600);
      const size = Phaser.Math.Between(20, 50);
      
      graphics.fillStyle(0x8b4513, 0.3); // Brown dirt
      graphics.fillEllipse(x, y, size, size * 0.7);
    }
    
    graphics.setDepth(-10);
  }

  createDesertBackground() {
    const graphics = this.scene.add.graphics();
    
    // Base sand color
    graphics.fillStyle(0xdaa520); // Goldenrod
    graphics.fillRect(0, 0, 1200, 600);
    
    // Add sand texture with different shades
    for (let i = 0; i < 1500; i++) {
      const x = Phaser.Math.Between(0, 1200);
      const y = Phaser.Math.Between(0, 600);
      const sandShade = Phaser.Math.Between(0, 3);
      
      let color;
      switch(sandShade) {
        case 0: color = 0xf4a460; break; // Sandy brown
        case 1: color = 0xdaa520; break; // Goldenrod
        case 2: color = 0xcd853f; break; // Peru
        case 3: color = 0xd2691e; break; // Chocolate
      }
      
      graphics.fillStyle(color);
      graphics.fillRect(x, y, 3, 3);
    }
    
    // Add sand dunes
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(0, 1200);
      const y = Phaser.Math.Between(0, 600);
      const size = Phaser.Math.Between(30, 80);
      
      graphics.fillStyle(0xcd853f, 0.3);
      graphics.fillEllipse(x, y, size, size * 0.6);
    }
    
    graphics.setDepth(-10);
  }

  createCastleBackground() {
    const graphics = this.scene.add.graphics();
    
    // Base stone color
    graphics.fillStyle(0x696969); // Dim gray
    graphics.fillRect(0, 0, 1200, 600);
    
    // Stone brick pattern
    const brickWidth = 40;
    const brickHeight = 20;
    
    for (let y = 0; y < 600; y += brickHeight) {
      for (let x = 0; x < 1200; x += brickWidth) {
        const offset = (Math.floor(y / brickHeight) % 2) * (brickWidth / 2);
        const brickX = x + offset;
        
        if (brickX < 1200) {
          // Brick color variation
          const brickShade = Phaser.Math.Between(0, 2);
          let color;
          switch(brickShade) {
            case 0: color = 0x696969; break; // Dim gray
            case 1: color = 0x778899; break; // Light slate gray
            case 2: color = 0x2f4f4f; break; // Dark slate gray
          }
          
          graphics.fillStyle(color);
          graphics.fillRect(brickX, y, brickWidth - 2, brickHeight - 2);
          
          // Mortar lines
          graphics.fillStyle(0x2f2f2f); // Very dark gray
          graphics.fillRect(brickX, y, brickWidth, 2);
          graphics.fillRect(brickX, y, 2, brickHeight);
        }
      }
    }
    
    graphics.setDepth(-10);
  }

  // Grassland decorations
  createBushes() {
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(100, 1100);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 180) {
        const bushType = Phaser.Math.Between(0, 2);
        
        switch(bushType) {
          case 0:
            this.createSmallBush(x, y);
            break;
          case 1:
            this.createMediumBush(x, y);
            break;
          case 2:
            this.createBerryBush(x, y);
            break;
        }
      }
    }
  }

  createSmallBush(x, y) {
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(0x228b22);
    graphics.fillCircle(x, y, 15);
    graphics.fillStyle(0x32cd32);
    graphics.fillCircle(x - 3, y - 3, 8);
    graphics.fillCircle(x + 4, y + 2, 6);
    
    graphics.setDepth(-5);
  }

  createMediumBush(x, y) {
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(0x006400);
    graphics.fillEllipse(x, y, 35, 25);
    graphics.fillStyle(0x228b22);
    graphics.fillEllipse(x, y, 30, 20);
    graphics.fillStyle(0x32cd32);
    graphics.fillCircle(x - 5, y - 4, 7);
    graphics.fillCircle(x + 6, y + 3, 5);
    graphics.fillCircle(x + 2, y - 6, 4);
    
    graphics.setDepth(-5);
  }

  createBerryBush(x, y) {
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(0x228b22);
    graphics.fillCircle(x, y, 18);
    graphics.fillStyle(0x32cd32);
    graphics.fillCircle(x - 4, y - 4, 9);
    graphics.fillCircle(x + 5, y + 3, 7);
    
    // Add red berries
    graphics.fillStyle(0xff0000);
    graphics.fillCircle(x - 2, y - 2, 2);
    graphics.fillCircle(x + 3, y + 1, 2);
    graphics.fillCircle(x - 6, y + 4, 2);
    graphics.fillCircle(x + 7, y - 3, 2);
    
    graphics.setDepth(-5);
  }

  createRocks() {
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(100, 1100);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 170) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0x696969);
        graphics.fillCircle(x, y, Phaser.Math.Between(8, 15));
        graphics.fillStyle(0x808080);
        graphics.fillCircle(x - 2, y - 2, Phaser.Math.Between(4, 8));
        
        graphics.setDepth(-5);
      }
    }
  }

  createFlowers() {
    for (let i = 0; i < 25; i++) {
      const x = Phaser.Math.Between(50, 1150);
      const y = Phaser.Math.Between(50, 550);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 160) {
        const graphics = this.scene.add.graphics();
        
        const flowerColors = [0xffd700, 0xff69b4, 0x9370db, 0xff6347, 0x00ff7f];
        const color = flowerColors[Phaser.Math.Between(0, flowerColors.length - 1)];
        
        graphics.fillStyle(color);
        graphics.fillCircle(x, y, 3);
        graphics.fillCircle(x - 3, y, 2);
        graphics.fillCircle(x + 3, y, 2);
        graphics.fillCircle(x, y - 3, 2);
        graphics.fillCircle(x, y + 3, 2);
        
        graphics.fillStyle(0xffff00);
        graphics.fillCircle(x, y, 1);
        
        graphics.setDepth(-3);
      }
    }
  }

  createTrees() {
    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(100, 1100);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 200) {
        const graphics = this.scene.add.graphics();
        
        // Tree trunk
        graphics.fillStyle(0x8b4513);
        graphics.fillRect(x - 4, y + 10, 8, 20);
        
        // Tree canopy
        graphics.fillStyle(0x006400);
        graphics.fillCircle(x, y, 25);
        graphics.fillStyle(0x228b22);
        graphics.fillCircle(x, y, 22);
        graphics.fillStyle(0x32cd32);
        graphics.fillCircle(x - 8, y - 5, 12);
        graphics.fillCircle(x + 6, y - 8, 10);
        graphics.fillCircle(x + 4, y + 8, 8);
        graphics.fillCircle(x - 10, y + 6, 9);
        
        graphics.setDepth(-6);
      }
    }
  }

  // Desert decorations
  createCacti() {
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(100, 1100);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 180) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0x228b22);
        graphics.fillRect(x - 6, y - 15, 12, 30);
        graphics.fillRect(x - 18, y - 5, 12, 8);
        graphics.fillRect(x + 6, y + 2, 12, 8);
        
        graphics.fillStyle(0xffffff);
        for (let j = 0; j < 6; j++) {
          graphics.fillRect(x - 3, y - 12 + j * 4, 1, 2);
          graphics.fillRect(x + 2, y - 12 + j * 4, 1, 2);
        }
        
        graphics.setDepth(-5);
      }
    }
  }

  createDesertRocks() {
    for (let i = 0; i < 6; i++) {
      const x = Phaser.Math.Between(100, 1100);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 170) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0xa0522d);
        graphics.fillEllipse(x, y, Phaser.Math.Between(20, 40), Phaser.Math.Between(15, 25));
        graphics.fillStyle(0xcd853f);
        graphics.fillEllipse(x - 3, y - 3, Phaser.Math.Between(10, 20), Phaser.Math.Between(8, 15));
        
        graphics.setDepth(-5);
      }
    }
  }

  createSandDunes() {
    for (let i = 0; i < 4; i++) {
      const x = Phaser.Math.Between(200, 1000);
      const y = Phaser.Math.Between(200, 400);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 200) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0xf4a460, 0.4);
        graphics.fillEllipse(x, y, 100, 40);
        graphics.fillStyle(0xdaa520, 0.2);
        graphics.fillEllipse(x, y, 80, 30);
        
        graphics.setDepth(-6);
      }
    }
  }

  createOasis() {
    const x = Phaser.Math.Between(150, 300);
    const y = Phaser.Math.Between(150, 300);
    
    if (Phaser.Math.Distance.Between(x, y, 600, 300) > 250) {
      const graphics = this.scene.add.graphics();
      
      graphics.fillStyle(0x4169e1);
      graphics.fillEllipse(x, y, 60, 40);
      graphics.fillStyle(0x87ceeb);
      graphics.fillEllipse(x, y, 50, 30);
      
      graphics.fillStyle(0x8b4513);
      graphics.fillRect(x - 15, y - 20, 4, 25);
      graphics.fillRect(x + 15, y - 25, 4, 30);
      
      graphics.fillStyle(0x228b22);
      graphics.fillEllipse(x - 13, y - 25, 20, 8);
      graphics.fillEllipse(x + 17, y - 30, 20, 8);
      
      graphics.setDepth(-4);
    }
  }

  // Castle decorations
  createTorches() {
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(150, 1050);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 180) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0x8b4513);
        graphics.fillRect(x - 2, y - 20, 4, 25);
        
        graphics.fillStyle(0xff4500);
        graphics.fillCircle(x, y - 22, 6);
        graphics.fillStyle(0xffd700);
        graphics.fillCircle(x, y - 22, 4);
        graphics.fillStyle(0xff0000);
        graphics.fillCircle(x, y - 22, 2);
        
        graphics.setDepth(-3);
      }
    }
  }

  createBanners() {
    for (let i = 0; i < 4; i++) {
      const x = Phaser.Math.Between(200, 1000);
      const y = Phaser.Math.Between(100, 300);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 200) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0x2f2f2f);
        graphics.fillRect(x - 1, y, 2, 40);
        
        const bannerColors = [0xe74c3c, 0x3498db, 0x9b59b6, 0xf39c12];
        const color = bannerColors[i % bannerColors.length];
        graphics.fillStyle(color);
        graphics.fillRect(x, y, 25, 20);
        
        graphics.fillStyle(0xffd700);
        graphics.fillRect(x + 5, y + 5, 15, 2);
        graphics.fillRect(x + 10, y + 10, 5, 2);
        
        graphics.setDepth(-4);
      }
    }
  }

  createStoneBlocks() {
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(100, 1100);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 170) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0x2f4f4f);
        graphics.fillRect(x - 8, y - 8, 16, 16);
        graphics.fillStyle(0x778899);
        graphics.fillRect(x - 6, y - 6, 12, 12);
        
        graphics.setDepth(-5);
      }
    }
  }

  createCastleWalls() {
    for (let i = 0; i < 3; i++) {
      const x = Phaser.Math.Between(100, 1100);
      const y = Phaser.Math.Between(100, 500);
      
      if (Phaser.Math.Distance.Between(x, y, 600, 300) > 220) {
        const graphics = this.scene.add.graphics();
        
        graphics.fillStyle(0x696969);
        graphics.fillRect(x - 30, y, 60, 30);
        
        for (let j = 0; j < 4; j++) {
          graphics.fillRect(x - 25 + j * 15, y - 10, 10, 10);
        }
        
        graphics.fillStyle(0x2f2f2f);
        graphics.fillRect(x - 28, y + 5, 56, 2);
        graphics.fillRect(x - 28, y + 15, 56, 2);
        graphics.fillRect(x - 28, y + 25, 56, 2);
        
        graphics.setDepth(-6);
      }
    }
  }
}
