import GameScene from "./GameScene";
import {WormState} from "./WormState";

export interface MovementStrategy {
    calculateDesiredDirection(wormState: WormState, scene: GameScene, targetObject?: Phaser.GameObjects.Arc): Phaser.Math.Vector2;
}
