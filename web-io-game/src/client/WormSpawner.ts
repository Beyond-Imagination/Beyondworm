import { GAME_CONSTANTS } from "./constants";
import { WormState, WormType, BotType } from "./WormState";
import { PlayerMovementStrategy, TrackPlayerMovementStrategy, SeekFoodMovementStrategy } from "./MovementStrategy";
import GameScene from "./GameScene";

type WormQueueMap = {
    [WormType.Player]: WormState[];
    [WormType.Bot]: {
        [BotType.PlayerTracker]: WormState[];
        [BotType.FoodSeeker]: WormState[];
    };
};

export default class WormSpawner {
    private wormQueues: WormQueueMap = {
        [WormType.Player]: [],
        [WormType.Bot]: {
            [BotType.PlayerTracker]: [],
            [BotType.FoodSeeker]: [],
        },
    };
    private readonly cacheSize = 10;

    constructor() {
        // Player용 wormState 미리 생성
        for (let i = 0; i < this.cacheSize; i++) {
            this.wormQueues[WormType.Player].push(this.createDefaultPlayerWorm());
        }
        // Bot용 wormState 미리 생성
        for (const botType of [BotType.PlayerTracker, BotType.FoodSeeker]) {
            for (let i = 0; i < this.cacheSize; i++) {
                this.wormQueues[WormType.Bot][botType].push(this.createDefaultBotWorm(botType));
            }
        }
    }

    private createDefaultPlayerWorm(): WormState {
        const color = 0xaaff66;
        const strategy = new PlayerMovementStrategy();
        return new WormState(color, strategy);
    }

    private createDefaultBotWorm(botType: BotType): WormState {
        let color: number;
        let strategy;
        switch (botType) {
            case BotType.PlayerTracker:
                color = 0xff6666;
                strategy = new TrackPlayerMovementStrategy();
                break;
            case BotType.FoodSeeker:
                color = 0x6666ff;
                strategy = new SeekFoodMovementStrategy();
                break;
            default:
                throw new Error("Unknown BotType");
        }
        return new WormState(color, strategy);
    }

    /**
     * Player Worm 생성
     */
    public spawnPlayerWorm(scene: GameScene, x: number, y: number): WormState {
        let wormState = this.wormQueues[WormType.Player].shift();
        if (!wormState) {
            wormState = this.createDefaultPlayerWorm();
        }
        this.initWormState(wormState, x, y, scene);

        // 타입 정보 부여: 머리 세그먼트에 wormType 저장
        if (wormState.segments.length > 0) {
            wormState.segments[0].setData("wormType", WormType.Player);
        }

        return wormState;
    }

    /**
     * Bot Worm 생성
     */
    public spawnBotWorm(scene: GameScene, botType: BotType, x: number, y: number): WormState {
        let wormState = this.wormQueues[WormType.Bot][botType].shift();
        if (!wormState) {
            wormState = this.createDefaultBotWorm(botType);
        }
        this.initWormState(wormState, x, y, scene);

        // 타입 정보 부여: 머리 세그먼트에 wormType, botType 저장
        if (wormState.segments.length > 0) {
            wormState.segments[0].setData("wormType", WormType.Bot);
            wormState.segments[0].setData("botType", botType);
        }

        return wormState;
    }

    /**
     * wormState를 초기화 (위치, 세그먼트 등)
     */
    private initWormState(wormState: WormState, x: number, y: number, scene: GameScene) {
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
                wormState.segmentColor,
            );
            c.setStrokeStyle(4, 0x333333);
            c.setDepth(GAME_CONSTANTS.ZORDER_SEGMENT - i);
            wormState.segments.push(c);
            scene.physics.add.existing(c, false);
            c.body.setCircle(GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS);
        }

        wormState.lastHead.set(wormState.segments[0].x, wormState.segments[0].y);
        for (let i = 0; i < GAME_CONSTANTS.SEGMENT_SPACING * GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
            wormState.path.push(new Phaser.Math.Vector2(wormState.lastHead.x, wormState.lastHead.y + i));
        }
    }

    /**
     * 사용이 끝난 wormState를 다시 큐에 반환
     */
    public releasePlayerWorm(worm: WormState) {
        this.wormQueues[WormType.Player].push(worm);
    }

    public releaseBotWorm(botType: BotType, worm: WormState) {
        const queue = this.wormQueues[WormType.Bot][botType];
        if (!queue) {
            console.error("releaseBotWorm: botType 큐가 존재하지 않습니다.", botType, this.wormQueues[WormType.Bot]);
            return;
        }
        this.wormQueues[WormType.Bot][botType].push(worm);
    }
}
