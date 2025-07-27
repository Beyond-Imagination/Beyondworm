import { FE_CONSTANTS } from "./constants";
import { WormState, WormType, BotType } from "./WormState";
import { PlayerMovementStrategy, TrackPlayerMovementStrategy, SeekFoodMovementStrategy } from "./MovementStrategy";
import GameScene from "./GameScene";
import { GAME_CONSTANTS } from "@beyondworm/shared";

type WormQueueMap = {
    [WormType.Player]: WormState[];
    [WormType.Bot]: {
        [BotType.PlayerTracker]: WormState[];
        [BotType.FoodSeeker]: WormState[];
    };
};

export default class WormSpawner {
    public wormQueues: WormQueueMap = {
        [WormType.Player]: [],
        [WormType.Bot]: {
            [BotType.PlayerTracker]: [],
            [BotType.FoodSeeker]: [],
        },
    };
    private readonly cacheSize = 0;

    constructor() {}

    public initialize(scene: GameScene) {
        // Player용 미리 생성
        for (let i = 0; i < this.cacheSize; i++) {
            // 기본 플레이어 웜 생성
            const worm = this.createDefaultPlayerWorm(scene);

            // 모든 세그먼트 비활성화
            for (const segment of worm.segments) {
                segment.visible = false;
                segment.active = false;
                if (segment.body) segment.body.enable = false;
            }

            // Player 타입 큐에 추가
            this.wormQueues[WormType.Player].push(worm);
        }
        // Bot용 미리 생성
        for (const botType of [BotType.PlayerTracker, BotType.FoodSeeker]) {
            for (let i = 0; i < this.cacheSize; i++) {
                // 기본 봇 웜 생성
                const worm = this.createDefaultBotWorm(botType, scene);

                // 모든 세그먼트 비활성화
                for (const segment of worm.segments) {
                    segment.visible = false;
                    segment.active = false;
                    if (segment.body) segment.body.enable = false;
                }

                // 봇 타입에 맞는 큐에 추가
                this.wormQueues[WormType.Bot][botType].push(worm);
            }
        }
    }
    private createDefaultPlayerWorm(scene: GameScene, x: number = 0, y: number = 0): WormState {
        const color = 0xaaff66;
        const strategy = new PlayerMovementStrategy();
        const wormState = new WormState(color, strategy);
        this.initWormState(wormState, x, y, scene);
        if (wormState.segments.length > 0) {
            wormState.segments[0].setData("wormType", WormType.Player);
        }
        return wormState;
    }

    private createDefaultBotWorm(botType: BotType, scene: GameScene, x: number = 0, y: number = 0): WormState {
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
                // Exhaustiveness check to ensure all cases are handled.
                ((_: never) => {
                    throw new Error(`Unknown BotType: ${String(_)}`);
                })(botType);
        }
        const wormState = new WormState(color, strategy);
        this.initWormState(wormState, x, y, scene);
        if (wormState.segments.length > 0) {
            wormState.segments[0].setData("wormType", WormType.Bot);
            wormState.segments[0].setData("botType", botType);
        }
        return wormState;
    }

    /**
     * Player Worm 생성
     */
    public spawnPlayerWorm(scene: GameScene, x: number, y: number): WormState {
        let wormState = this.wormQueues[WormType.Player].shift();
        if (!wormState) {
            wormState = this.createDefaultPlayerWorm(scene, x, y);
        } else {
            // 세그먼트 위치만 재설정
            for (let i = 0; i < wormState.segments.length; i++) {
                const c = wormState.segments[i];
                c.x = x;
                c.y = y + i * GAME_CONSTANTS.SEGMENT_SPACING;
            }
        }

        // 세그먼트 활성화
        for (const segment of wormState.segments) {
            segment.visible = true;
            segment.active = true;
            if (segment.body) segment.body.enable = true;
        }

        // 개발 모드에서만 디버깅 로그 출력
        if (import.meta.env.MODE === "development") {
            console.debug("[spawnPlayerWorm] 큐 상태:\n" + this.getQueueDebugInfo());
        }

        return wormState;
    }

    /**
     * Bot Worm 생성
     */
    public spawnBotWorm(scene: GameScene, botType: BotType, x: number, y: number): WormState {
        let wormState = this.wormQueues[WormType.Bot][botType].shift();
        if (!wormState) {
            wormState = this.createDefaultBotWorm(botType, scene, x, y);
        } else {
            // 세그먼트 위치만 재설정
            for (let i = 0; i < wormState.segments.length; i++) {
                const c = wormState.segments[i];
                c.x = x;
                c.y = y + i * GAME_CONSTANTS.SEGMENT_SPACING;
            }
        }

        // 세그먼트 활성화
        for (const segment of wormState.segments) {
            segment.visible = true;
            segment.active = true;
            if (segment.body) segment.body.enable = true;
        }

        // 개발 모드에서만 디버깅 로그 출력
        if (import.meta.env.MODE === "development") {
            console.debug(`[spawnBotWorm:${botType}] 큐 상태:\n` + this.getQueueDebugInfo());
        }

        return wormState;
    }

    /**
     * wormState를 초기화 (위치, 세그먼트 등)
     */
    private initWormState(wormState: WormState, x: number, y: number, scene: GameScene) {
        wormState.path = [];
        wormState.lastVel.set(0, 1);
        wormState.lastHead.set(x, y);
        wormState.nextTarget = null;

        // 세그먼트가 이미 존재하면, default count만큼만 남기고 나머지는 제거
        if (wormState.segments && wormState.segments.length > 0) {
            // 남길 세그먼트만 slice, 나머지는 destroy
            const keepCount = GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT;
            for (let i = keepCount; i < wormState.segments.length; i++) {
                wormState.segments[i].destroy();
            }
            wormState.segments = wormState.segments.slice(0, keepCount);
            // 위치 재설정
            for (let i = 0; i < wormState.segments.length; i++) {
                const c = wormState.segments[i];
                c.x = x;
                c.y = y + i * GAME_CONSTANTS.SEGMENT_SPACING;

                // 생성했을 때 처럼 body값 초기화
                c.setRadius(GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS);
                c.body.setCircle(GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS);
            }
        } else {
            // 세그먼트가 없으면 새로 생성
            wormState.segments = [];
            for (let i = 0; i < GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
                const c = scene.add.circle(
                    x,
                    y + i * GAME_CONSTANTS.SEGMENT_SPACING,
                    GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS,
                    wormState.segmentColor,
                );
                c.setStrokeStyle(4, 0x333333);
                scene.physics.add.existing(c, false);
                c.body.setCircle(GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS);

                wormState.segments.push(c);
            }
        }

        // 공통 로직: 스타일, depth, physics body 등
        for (let i = 0; i < wormState.segments.length; i++) {
            const c = wormState.segments[i];
            c.setDepth(FE_CONSTANTS.ZORDER_SEGMENT - i);
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
    public releasePlayerWorm(worm: WormState, scene: GameScene) {
        // wormState를 초기화 (위치, 세그먼트 등)
        this.initWormState(worm, 0, 0, scene);

        // 모든 세그먼트 비활성화
        for (const segment of worm.segments) {
            segment.visible = false;
            segment.active = false;
            if (segment.body) segment.body.enable = false;
        }
        this.wormQueues[WormType.Player].push(worm);

        // 개발 모드에서만 디버깅 로그 출력
        if (import.meta.env.MODE === "development") {
            console.debug("[releasePlayerWorm] 큐 상태:\n" + this.getQueueDebugInfo());
        }
    }

    public releaseBotWorm(botType: BotType, worm: WormState, scene: GameScene) {
        const queue = this.wormQueues[WormType.Bot][botType];
        if (!queue) {
            console.error("releaseBotWorm: botType 큐가 존재하지 않습니다.", botType, this.wormQueues[WormType.Bot]);
            return;
        }
        // wormState를 초기화 (위치, 세그먼트 등)
        this.initWormState(worm, 0, 0, scene);

        // 모든 세그먼트 비활성화
        for (const segment of worm.segments) {
            segment.visible = false;
            segment.active = false;
            if (segment.body) segment.body.enable = false;
        }
        queue.push(worm);

        // 개발 모드에서만 디버깅 로그 출력
        if (import.meta.env.MODE === "development") {
            console.debug(`[releaseBotWorm:${botType}] 큐 상태:\n` + this.getQueueDebugInfo());
        }
    }

    /**
     * 디버깅용: 현재 풀 상태를 문자열로 반환
     */
    public getQueueDebugInfo(): string {
        const playerQueue = this.wormQueues[WormType.Player];
        const botQueues = this.wormQueues[WormType.Bot];
        const trackerQueue = botQueues?.[BotType.PlayerTracker];
        const foodSeekerQueue = botQueues?.[BotType.FoodSeeker];
        return [
            `[WormSpawner Pool]`,
            `Player: ${playerQueue?.length ?? "-"}`,
            `Bot-PlayerTracker: ${trackerQueue?.length ?? "-"}`,
            `Bot-FoodSeeker: ${foodSeekerQueue?.length ?? "-"}`,
        ].join("\n");
    }
}
