import {GAME_CONSTANTS} from "./constants";
import {MovementStrategy} from "./MovementStrategy";

export class WormState {
    public lastVel: Phaser.Math.Vector2;
    public lastHead: Phaser.Math.Vector2;
    public targetSegmentRadius: number;
    public segments: Phaser.GameObjects.Arc[];
    public path: Phaser.Math.Vector2[];
    public segmentColor: number;
    public movementStrategy: MovementStrategy;
    public nextTarget: Phaser.GameObjects.Arc | null; // 다음 목표물

    constructor(segmentColor: number, movementStrategy: MovementStrategy) {
        this.lastVel = new Phaser.Math.Vector2(0, 1); // 초기 방향은 아래로
        this.lastHead = new Phaser.Math.Vector2();
        this.targetSegmentRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
        this.segments = [];
        this.path = [];
        this.segmentColor = segmentColor;
        this.movementStrategy = movementStrategy; // 전략 할당
        this.nextTarget = null; // 초기에는 목표 없음
    }

    calculateDesiredDirection() {
        const head = this.segments[0];
        const desiredDir = new Phaser.Math.Vector2(
            this.nextTarget!!.x - head.x,
            this.nextTarget!!.y - head.y
        );
        return desiredDir.length() > 0 ? desiredDir.normalize() : Phaser.Math.Vector2.ZERO;
    }
}
