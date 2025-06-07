import Phaser from "phaser";
import GameScene from "./GameScene";
import UIScene from "./UIScene";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "app",
    backgroundColor: "#222",
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [GameScene, UIScene],
    physics: {
        default: "arcade",
        arcade: {
            debug: false
        }
    }
};

new Phaser.Game(config);