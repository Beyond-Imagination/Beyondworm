import Phaser from "phaser";
import GameScene from "./GameScene";
import UIScene from "./UIScene";
import LoginScene from "./LoginScene";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "app",
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#222",
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // DOM 요소를 사용하기 위해 dom 설정 추가
    dom: {
        createContainer: true,
    },
    // 처음에는 LoginScene만 시작하고, GameScene과 UIScene은 필요할 때 시작합니다.
    scene: [LoginScene, GameScene, UIScene],
    physics: {
        default: "arcade",
        arcade: {
            debug: false,
        },
    },
};

// config에 등록된 scene들 중, 가장 앞부분의 scene만 실행된다.
new Phaser.Game(config);
