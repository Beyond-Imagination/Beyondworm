import { GAME_CONSTANTS } from "./constants";
import { WormState, WormType } from "./WormState";
import { PlayerMovementStrategy, TrackPlayerMovementStrategy, SeekFoodMovementStrategy } from "./MovementStrategy";
import GameScene from "./GameScene";

type WormQueueMap = Record<WormType, WormState[]>;

export default class WormSpawner {
    private wormQueues: WormQueueMap = {
        player: [],
        playerTrackerBot: [],
        foodSeekerBot: []
    };
    private readonly cacheSize = 10;

    constructor() {
        // 각 타입별로 미리 wormState 인스턴스를 여러 개 생성해서 큐에 저장
        for (const type of Object.keys(this.wormQueues) as WormType[]) {
            for (let i = 0; i < this.cacheSize; i++) {
                this.wormQueues[type].push(this.createDefaultWorm(type));
            }
        }
    }

    private createDefaultWorm(type: WormType): WormState {
        let color: number;
        let strategy;
        switch (type) {
            case "player":
                color = 0xaaff66;
                strategy = new PlayerMovementStrategy();
                break;
            case "playerTrackerBot":
                color = 0xff6666;
                strategy = new TrackPlayerMovementStrategy();
                break;
            case "foodSeekerBot":
                color = 0x6666ff;
                strategy = new SeekFoodMovementStrategy();
                break;
            default:
                throw new Error("Unknown WormType");
        }
        return new WormState(color, strategy);
    }

    /**
     * WormType에 따라 WormState를 큐에서 꺼내 재사용하거나, 없으면 새로 생성합니다.
     */
    public SpawnWorm(scene: GameScene, type: WormType, x: number, y: number): WormState {
        let wormState = this.wormQueues[type].shift();
        if (!wormState) {
            wormState = this.createDefaultWorm(type);
        }

        // wormState를 초기화 (위치, 세그먼트 등)
        wormState.segments = [];
        wormState.path = [];
        wormState.lastVel.set(0, 1);
        wormState.lastHead.set(x, y);

        // 세그먼트 생성
        for (let i = 0; i < GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
            const c = scene.add.circle(
                x,
                y + i * GAME_CONSTANTS.SEGMENT_SPACING,
                GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS,
                wormState.segmentColor
            );
            c.setStrokeStyle(4, 0x333333);
            c.setDepth(GAME_CONSTANTS.ZORDER_SEGMENT - i);
            wormState.segments.push(c);
            scene.physics.add.existing(c, false);
            c.body.setCircle(GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS);
        }

        wormState.lastHead.set(wormState.segments[0].x, wormState.segments[0].y);
        for (let i = 0; i < GAME_CONSTANTS.SEGMENT_SPACING * GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
            wormState.path.push(
                new Phaser.Math.Vector2(wormState.lastHead.x, wormState.lastHead.y + i)
            );
        }

        return wormState;
    }

    /**
     * 사용이 끝난 wormState를 다시 큐에 반환
     */
    public ReleaseWorm(type: WormType, worm: WormState) {
        // 세그먼트(Phaser 오브젝트) 정리
        for (const segment of worm.segments) {
            segment.destroy();
        }
        worm.segments = [];
        worm.path = [];
        // 필요하다면 기타 상태도 초기화

        this.wormQueues[type].push(worm);
    }
}