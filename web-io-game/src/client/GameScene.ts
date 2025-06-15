import Phaser from "phaser";
import Food from "./Food";
import {GAME_CONSTANTS} from "./constants";

// WormState 클래스 정의
class WormState {
    public lastVel: Phaser.Math.Vector2;
    public lastHead: Phaser.Math.Vector2;
    public targetSegmentRadius: number;
    public segments: Phaser.GameObjects.Arc[];
    public path: Phaser.Math.Vector2[];
    public segmentColor: number;

    constructor(segmentColor: number) {
        this.lastVel = new Phaser.Math.Vector2(0, 1);
        this.lastHead = new Phaser.Math.Vector2();
        this.targetSegmentRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
        this.segments = [];
        this.path = [];
        this.segmentColor = segmentColor;
    }
}

type WormType = "player" | "playerTrackerBot" | "foodSeekerBot";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({key: "GameScene"});
    }

    private foods: Food[] = [];

    private playerState: WormState = new WormState(0xaaff66);
    private playerTrackerBotState: WormState = new WormState(0xff6666);
    private foodSeekerBotState: WormState = new WormState(0x6666ff);
    private worms = {
        "player": this.playerState,
        "playerTrackerBot": this.playerTrackerBotState,
        "foodSeekerBot": this.foodSeekerBotState
    };


    /* ── 조정 파라미터 ───────────────────────────── */
    private readonly turnLerp = 0.15;  // 0~1, 클수록 민첩
    private prevPtr = new Phaser.Math.Vector2();     // 이전 포인터 좌표

    preload() {
        // 에셋(이미지, 사운드 등) 로드
    }

    create() {
        const MapWidth = GAME_CONSTANTS.MAP_WIDTH;
        const MapHeight = GAME_CONSTANTS.MAP_HEIGHT;

        // ① 지렁이 몸통(원)들 만들기
        for (const wormState of Object.values(this.worms)) {
            for (let i = 0; i < GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
                const c = this.add.circle(
                    MapWidth / 2,
                    MapHeight / 2 + i * GAME_CONSTANTS.SEGMENT_SPACING,
                    GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS,
                    wormState.segmentColor // 지렁이 색상
                );
                c.setStrokeStyle(4, 0x333333); // 외곽선 두께 4, 색상 어두운 회색
                c.setDepth(GAME_CONSTANTS.ZORDER_SEGMENT - i); // 세그먼트의 Z-순서 설정
                wormState.segments.push(c);
                this.physics.add.existing(c, false); // Arcade Physics 적용
                c.body.setCircle(GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS); // 충돌 판정을 위한 hitArea를 원으로 설정
            }

            wormState.lastHead.set(wormState.segments[0].x, wormState.segments[0].y);
            for (let i = 0; i < GAME_CONSTANTS.SEGMENT_SPACING * GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
                wormState.path.push(
                    new Phaser.Math.Vector2(wormState.lastHead.x, wormState.lastHead.y + i)
                );
            }
        }


        // ③ 포인터 초기 좌표 기억
        this.prevPtr.set(
            this.input.activePointer.worldX,
            this.input.activePointer.worldY
        );

        // ④ 먹이 여러 개 랜덤 위치에 소환
        this.updateFoods();

        // ⑤ 카메라 설정
        this.setupCamera(this.playerState.segments[0], MapWidth, MapHeight);

        // UIScene이 실행 중이 아니면 실행
        if (!this.scene.isActive("UIScene")) {
            this.scene.launch("UIScene");
        }
    }

    update(_: number, dms: number) {
        const dt = dms / 1000;
        const ptr = this.input.activePointer;
        const playerHead = this.playerState.segments[0];

        /* ── A. 플레이어 목표 방향 계산 ─────────────────── */
        const desiredPlayerDir = new Phaser.Math.Vector2(
            ptr.worldX - playerHead.x,
            ptr.worldY - playerHead.y
        );
        if (desiredPlayerDir.length() > 0) {
            desiredPlayerDir.normalize();
        }

        this.playerState.lastVel.lerp(desiredPlayerDir, this.turnLerp).normalize();

        /* ── B. 플레이어 머리 이동 & 경로 샘플링 ─────────── */
        this.updateWorm(dt, playerHead, this.playerState, this.playerState.path, this.playerState.segments);

        /* ── C. 봇 업데이트 ──────────────────────────── */
        this.updateBots(dt, playerHead);

        /* ── D. 상태 갱신 ──────────────────────────── */
        this.prevPtr.set(ptr.worldX, ptr.worldY);

        for (const wormState of Object.values(this.worms)) {
            // 세그먼트 반지름을 부드럽게 보간
            for (const seg of wormState.segments) {
                const newRadius = Phaser.Math.Linear(seg.radius, wormState.targetSegmentRadius, GAME_CONSTANTS.CAMERA_LERP_SPEED);
                seg.setRadius(newRadius);
                seg.body.setCircle(newRadius);
            }
        }

        // 먹이 수가 부족하면 다시 랜덤 생성
        this.updateFoods();

        // 카메라 업데이트
        this.updateCamera();
    }

    shutdown() {
        // Scene이 종료될 때 호출
    }

    /**
     * 카메라를 지정한 타겟에 맞춰 세팅합니다.
     * @param target 카메라가 따라갈 게임 오브젝트(예: 지렁이 머리)
     * @param width 카메라 bounds의 너비 (예: 맵 너비)
     * @param height 카메라 bounds의 높이 (예: 맵 높이)
     */
    private setupCamera(
        target: Phaser.GameObjects.GameObject,
        width: number,
        height: number
    ) {
        this.cameras.main.setBounds(0, 0, width, height);
        this.cameras.main.startFollow(target, true, GAME_CONSTANTS.CAMERA_LERP_SPEED, GAME_CONSTANTS.CAMERA_LERP_SPEED);
        this.cameras.main.setZoom(1); // 필요시 zoom 값 조정
    }

    private biteFood(foodSprite: Phaser.GameObjects.Arc, wormType: WormType) {
        const food = this.foods.find(f => f.sprite === foodSprite);
        if (!food) return; // 먹이를 찾지 못하면 종료

        food.beEaten();

        this.foods = this.foods.filter(f => f !== food); // 배열에서 제거

        let targetWormState: WormState = this.worms[wormType]; // 기본값 설정
        let targetSegments: Phaser.GameObjects.Arc[] = targetWormState.segments;

        // 새로운 세그먼트 추가
        const lastSegment = targetSegments[targetSegments.length - 1];
        const newSegment = this.add.circle(
            lastSegment.x,
            lastSegment.y,
            GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS,
            targetWormState.segmentColor
        );
        newSegment.setStrokeStyle(4, 0x333333);
        newSegment.setDepth(GAME_CONSTANTS.ZORDER_SEGMENT - targetSegments.length);

        // 새 세그먼트에 physics body 부여
        this.physics.add.existing(newSegment, false);
        //newSegment.body.setCircle(GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS);

        targetSegments.push(newSegment); // 해당 wormState의 segments에 추가

        // 목표 세그먼트 반지름 계산 (먹이 먹은 수만큼 증가)
        targetWormState.targetSegmentRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS +
            (targetSegments.length - GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT) * GAME_CONSTANTS.SEGMENT_GROWTH_RADIUS;
    }

    private updateFoods(minX = 100, maxX = GAME_CONSTANTS.MAP_WIDTH - 100, minY = 100, maxY = GAME_CONSTANTS.MAP_HEIGHT - 100) {
        // 먹이 수가 부족하면 다시 랜덤 생성
        while (this.foods.length < GAME_CONSTANTS.MAX_FOOD_COUNT) {
            const x = Phaser.Math.Between(minX, maxX);
            const y = Phaser.Math.Between(minY, maxY);
            const food = new Food(this, x, y, GAME_CONSTANTS.FOOD_RADIUS, 0xff3333);
            this.foods.push(food);


            for (const key of Object.keys(this.worms)) {
                const worm = this.worms[key as WormType];
                // 각 지렁이의 segments를 확인하여 먹이와 충돌 설정
                if (worm.segments && worm.segments.length > 0) {
                    this.physics.add.overlap(
                        worm.segments[0], // 머리
                        food.sprite, // 먹이
                        (head: Phaser.GameObjects.Arc, foodSprite: Phaser.GameObjects.Arc) => {
                            this.biteFood(foodSprite, key as WormType);
                        }
                    );
                }
            }
        }
    }

    private updateCamera() {
        if (!this.playerState.segments || this.playerState.segments.length === 0) return;
        const baseRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
        const currentRadius = this.playerState.segments[0].radius; // 플레이어 기준
        const baseZoom = 1;
        const zoom = baseZoom * (baseRadius / currentRadius);
        this.cameras.main.setZoom(Phaser.Math.Linear(this.cameras.main.zoom, zoom, GAME_CONSTANTS.CAMERA_LERP_SPEED));
    }

    private updateWorm(dt: number, head: Phaser.GameObjects.Arc, wormState: WormState, path: Phaser.Math.Vector2[], segments: Phaser.GameObjects.Arc[]) {
        head.x += wormState.lastVel.x * GAME_CONSTANTS.HEAD_SPEED * dt;
        head.y += wormState.lastVel.y * GAME_CONSTANTS.HEAD_SPEED * dt;

        let dx = head.x - wormState.lastHead.x;
        let dy = head.y - wormState.lastHead.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 1) {
            const steps = Math.floor(dist);
            for (let s = 1; s <= steps; s++) {
                const t = s / dist;
                path.unshift(
                    new Phaser.Math.Vector2(
                        Phaser.Math.Linear(wormState.lastHead.x, head.x, t),
                        Phaser.Math.Linear(wormState.lastHead.y, head.y, t)
                    )
                );
            }
            wormState.lastHead.set(head.x, head.y);
        }

        const baseSpacing = GAME_CONSTANTS.SEGMENT_SPACING;
        const baseRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
        const currentActualRadius = head.radius;
        const spacing = baseSpacing * (currentActualRadius / baseRadius);

        const maxPathLen = Math.floor(segments.length * spacing + 50);
        if (path.length > maxPathLen) path.length = maxPathLen;

        for (let i = 1; i < segments.length; i++) {
            const idx = Math.min(Math.round(i * spacing), path.length - 1);
            if (idx >= 0 && path[idx]) {
                segments[i].setPosition(
                    path[idx].x,
                    path[idx].y
                );
            }
        }
    }

    // 봇 업데이트 메서드
    private updateBots(dt: number, playerHead: Phaser.GameObjects.Arc) {
        // 플레이어 추적 봇 업데이트
        if (this.playerTrackerBotState.segments && this.playerTrackerBotState.segments.length > 0) { // playerTrackerBotState.segments 사용
            const botHead = this.playerTrackerBotState.segments[0]; // playerTrackerBotState.segments 사용
            const desiredDir = new Phaser.Math.Vector2(
                playerHead.x - botHead.x,
                playerHead.y - botHead.y
            );
            if (desiredDir.length() > 0) desiredDir.normalize();
            this.playerTrackerBotState.lastVel.lerp(desiredDir, this.turnLerp * 0.8).normalize();
            this.updateWorm(dt, botHead, this.playerTrackerBotState, this.playerTrackerBotState.path, this.playerTrackerBotState.segments);
        }

        // 먹이 탐색 봇 업데이트
        if (this.foodSeekerBotState.segments && this.foodSeekerBotState.segments.length > 0) { // foodSeekerBotState.segments 사용
            const botHead = this.foodSeekerBotState.segments[0]; // foodSeekerBotState.segments 사용
            let closestFood: Food | null = null;
            let minDistanceSq = Infinity;

            const activeFoods = this.foods.filter(f => f.sprite.active);
            if (activeFoods.length > 0) {
                for (const food of activeFoods) {
                    const distSq = Phaser.Math.Distance.Squared(botHead.x, botHead.y, food.sprite.x, food.sprite.y);
                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        closestFood = food;
                    }
                }
            }

            if (closestFood) {
                const desiredDir = new Phaser.Math.Vector2(
                    closestFood.sprite.x - botHead.x,
                    closestFood.sprite.y - botHead.y
                );
                if (desiredDir.length() > 0) desiredDir.normalize();
                this.foodSeekerBotState.lastVel.lerp(desiredDir, this.turnLerp * 0.9).normalize();
            }
            this.updateWorm(dt, botHead, this.foodSeekerBotState, this.foodSeekerBotState.path, this.foodSeekerBotState.segments);
        }
    }

}
