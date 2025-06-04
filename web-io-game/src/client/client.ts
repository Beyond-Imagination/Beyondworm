import Phaser from "phaser";
import WormScene from "./WormScene";

new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    backgroundColor: "#222",
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: WormScene,
});
