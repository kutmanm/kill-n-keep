import Phaser from "phaser";
import logoImg from "./assets/logo.png";

import j from './test.json';

import './styles/index.css';

console.log(j);
console.log('Kill-n-Keep Frontend starting...');

// Basic app initialization
document.addEventListener('DOMContentLoaded', function() {
    const app = document.getElementById('app');
    app.innerHTML = '<h1>Kill-n-Keep Game</h1><p>Frontend is running!</p>';
});

const config = {
  type: Phaser.AUTO,
  parent: "phaser-example",
  width: 800,
  height: 600,
  scene: {
    preload: preload,
    create: create
  }
};

const game = new Phaser.Game(config);

function preload() {
  this.load.image("logo", logoImg);
}

function create() {
  const logo = this.add.image(400, 150, "logo");

  this.tweens.add({
    targets: logo,
    y: 450,
    duration: 2000,
    ease: "Power2",
    yoyo: true,
    loop: -1
  });
}
