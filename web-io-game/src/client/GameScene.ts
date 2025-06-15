import Phaser from "phaser";
import Food from "./Food";
import {GAME_CONSTANTS} from "./constants";
import {MovementStrategy} from "./MovementStrategy";
import {WormState} from "./WormState";

// 플레이어 움직임 전략
class PlayerMovementStrategy implements MovementStrategy {
    calculateDesiredDirection(wormState: WormState, scene: GameScene): Phaser.Math.Vector2 {
        const ptr = scene.input.activePointer;

        // nextTarget을 마우스 포인터 위치로 설정
        wormState.nextTarget = new Phaser.GameObjects.Arc(scene, ptr.worldX, ptr.worldY);
        return wormState.calculateDesiredDirection();
    }
}

// 플레이어 추적 봇 움직임 전략
class TrackPlayerMovementStrategy implements MovementStrategy {
    calculateDesiredDirection(wormState: WormState): Phaser.Math.Vector2 {
        if (!wormState.nextTarget) return Phaser.Math.Vector2.ZERO;
        return wormState.calculateDesiredDirection();
    }
}

// 먹이 탐색 봇 움직임 전략
class SeekFoodMovementStrategy implements MovementStrategy {
    calculateDesiredDirection(wormState: WormState, scene: GameScene): Phaser.Math.Vector2 {
        if (wormState.nextTarget?.active) {
            // 이미 목표가 설정되어 있다면 그 방향으로 이동
            return wormState.calculateDesiredDirection();
        }
        const head = wormState.segments[0];
        if (!head) return Phaser.Math.Vector2.ZERO;

        let closestFood: Food | null = null;
        let minDistanceSq = Infinity;
        const activeFoods = scene.foods.filter((f: Food) => f.sprite.active); // GameScene의 foods에 접근

        if (activeFoods.length > 0) {
            for (const food of activeFoods) {
                const distSq = Phaser.Math.Distance.Squared(head.x, head.y, food.sprite.x, food.sprite.y);
                if (distSq < minDistanceSq) {
                    minDistanceSq = distSq;
                    closestFood = food;
                }
            }
        }

        if (closestFood) {
            wormState.nextTarget = closestFood.sprite; // nextTarget에 가장 가까운 음식 스프라이트 저장
            return wormState.calculateDesiredDirection();
        } else {
            // 먹이가 없으면 마지막 방향 유지 시도
            return wormState.lastVel.length() > 0 ? wormState.lastVel.clone().normalize() : new Phaser.Math.Vector2(0, 1);
        }
    }
}


type WormType = "player" | "playerTrackerBot" | "foodSeekerBot";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({key: "GameScene"});
    }

    // foods 속성을 public 또는 getter로 만들어 전략에서 접근 가능하게 하거나, calculateDesiredDirection에 전달해야 함.
    // 여기서는 GameScene의 인스턴스를 전략에 넘겨주고, (scene as any).foods로 접근하는 방식을 사용.
    public foods: Food[] = [];

    public playerState: WormState = new WormState(0xaaff66, new PlayerMovementStrategy());
    private playerTrackerBotState: WormState = new WormState(0xff6666, new TrackPlayerMovementStrategy());
    private foodSeekerBotState: WormState = new WormState(0x6666ff, new SeekFoodMovementStrategy());
    private worms: Record<WormType, WormState> = {
        "player": this.playerState,
        "playerTrackerBot": this.playerTrackerBotState,
        "foodSeekerBot": this.foodSeekerBotState
    };


    /* ── 조정 파라미터 ───────────────────────────── */
    private readonly turnLerp = 0.15;  // 0~1, 클수록 민첩

    preload() {
        // 에셋(이미지, 사운드 등) 로드
    }

    create() {
        const MapWidth = GAME_CONSTANTS.MAP_WIDTH;
        const MapHeight = GAME_CONSTANTS.MAP_HEIGHT;

        // ① 지렁이 몸통(원)들 만들기
        for (const wormState of Object.values(this.worms)) {
            const initialX = Phaser.Math.Between(100, MapWidth - 100); // 랜덤 X 좌표
            const initialY = Phaser.Math.Between(100, MapHeight - 100); // 랜덤 Y 좌표

            for (let i = 0; i < GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
                const c = this.add.circle(
                    initialX, // 랜덤 시작 X
                    initialY + i * GAME_CONSTANTS.SEGMENT_SPACING, // 랜덤 시작 Y 기준으로 세그먼트 배치
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

        // 플레이어를 추적하는 봇의 목표를 플레이어 머리로 설정
        this.playerTrackerBotState.nextTarget = this.playerState.segments[0]; // 플레이어 추적 봇의 목표는 항상 플레이어 머리


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

        // 모든 지렁이 업데이트
        for (const wormState of Object.values(this.worms)) {
            const head = wormState.segments[0];

            // 1. 목표 방향 계산 (전략 사용)
            const desiredDir = wormState.movementStrategy.calculateDesiredDirection(wormState, this);

            // 2. 현재 속도(lastVel)를 목표 방향으로 점진적 변경
            wormState.lastVel.lerp(desiredDir, this.turnLerp).normalize();

            // 3. 지렁이 머리 이동 및 경로 샘플링 (updateWorm 호출)
            this.updateWorm(dt, head, wormState, wormState.path, wormState.segments);
        }


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
        // 화면에 항상 같은 비율로 보이도록 zoom 계산
        // (세그먼트 반지름이 커져도 화면에서는 항상 같은 비율로 보이게 함)
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

}
