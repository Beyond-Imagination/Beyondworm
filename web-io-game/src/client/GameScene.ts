import Phaser from "phaser";
import Food from "./Food";
import { GAME_CONSTANTS } from "./constants";
import { WormState, WormType } from "./WormState";
import WormSpawner from "./WormSpawner";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    public wormSpawner = new WormSpawner();

    // foods 속성을 public 또는 getter로 만들어 전략에서 접근 가능하게 하거나, calculateDesiredDirection에 전달해야 함.
    // 여기서는 GameScene의 인스턴스를 전략에 넘겨주고, (scene as any).foods로 접근하는 방식을 사용.
    public foods: Food[] = [];

    public playerState!: WormState;
    public worms!: Record<WormType, WormState>;

    private wormHeadsGroup!: Phaser.Physics.Arcade.Group;
    private foodsGroup!: Phaser.Physics.Arcade.Group;

    /* ── 조정 파라미터 ───────────────────────────── */
    private readonly turnLerp = 0.15;  // 0~1, 클수록 민첩

    preload() {
        // 에셋(이미지, 사운드 등) 로드
    }

    create() {
        const MapWidth = GAME_CONSTANTS.MAP_WIDTH;
        const MapHeight = GAME_CONSTANTS.MAP_HEIGHT;

        // ① 기본 지렁이 생성 (스포너에서 꺼내서 사용)
        this.playerState = this.wormSpawner.spawnWorm(this, "player", Phaser.Math.Between(100, MapWidth - 100), Phaser.Math.Between(100, MapHeight - 100));
        this.worms = {
            "player": this.playerState,
            "playerTrackerBot": this.wormSpawner.spawnWorm(this, "playerTrackerBot", Phaser.Math.Between(100, MapWidth - 100), Phaser.Math.Between(100, MapHeight - 100)),
            "foodSeekerBot": this.wormSpawner.spawnWorm(this, "foodSeekerBot", Phaser.Math.Between(100, MapWidth - 100), Phaser.Math.Between(100, MapHeight - 100))
        };

        // 지렁이 머리들을 그룹에 추가하고 타입 설정
        this.wormHeadsGroup = this.physics.add.group();
        this.foodsGroup = this.physics.add.group();

        for (const key of Object.keys(this.worms)) {
            const type = key as WormType;
            const head = this.worms[type].segments[0];
            head.setData("wormType", type);
            this.wormHeadsGroup.add(head);
        }

        // ② 먹이 여러 개 랜덤 위치에 소환
        this.updateFoods();

        // ③ 플레이어 Front 초기화
        this.InitializePlayer();

        // ④ UIScene이 실행 중이 아니면 실행
        if (!this.scene.isActive("UIScene")) {
            this.scene.launch("UIScene");
        }

        // 그룹 간의 overlap을 한 번만 등록
        this.physics.add.overlap(
            this.wormHeadsGroup,
            this.foodsGroup,
            this.handleFoodCollision,
            undefined,
            this
        );

        // 스페이스바 이벤트
        this.input.keyboard.on("keydown-SPACE", () => { this.playerState.isSprinting = true; });
        this.input.keyboard.on("keyup-SPACE", () => { this.playerState.isSprinting = false; });
    }

    // 충돌 핸들러: head와 foodSprite
    private handleFoodCollision(
        head: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        foodSprite: Phaser.Types.Physics.Arcade.GameObjectWithBody
    ) {
        const type = head.getData("wormType") as WormType;
        if (!foodSprite.active || !type) return;
        this.biteFood(foodSprite as Phaser.GameObjects.Arc, type);
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

            // 4. 달리기 처리
            if (wormState.isSprinting) {
                this.handleSprinting(dt, wormState);
            }
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

        // 모든 벌레 쌍에 대해 충돌 판정
        this.checkWormsCollision();

        // 카메라 업데이트
        this.updateCamera();
    }

    shutdown() {
        // Scene이 종료될 때 호출
        // 등록된 키보드 이벤트 리스너 제거
        this.input.keyboard.off("keydown-SPACE");
        this.input.keyboard.off("keyup-SPACE");
    }

    /**
     * 메인 플레이어 Front 초기화
     * - 카메라 설정 등
     */
    private InitializePlayer() {
        this.playerState = this.worms["player"];

        // camera setting
        this.setupCamera(this.playerState.segments[0], GAME_CONSTANTS.MAP_WIDTH, GAME_CONSTANTS.MAP_HEIGHT);
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
        this.foodsGroup.remove(food.sprite, true, true); // 그룹에서 제거

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
            // 그룹에 추가만 하면 overlap이 처리됨
            this.foodsGroup.add(food.sprite);
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
        const speed = wormState.isSprinting ? GAME_CONSTANTS.HEAD_SPRINT_SPEED : GAME_CONSTANTS.HEAD_SPEED;
        head.x += wormState.lastVel.x * speed * dt;
        head.y += wormState.lastVel.y * speed * dt;

        let dx = head.x - wormState.lastHead.x;
        let dy = head.y - wormState.lastHead.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 1) {
            const steps = Math.floor(dist);
            for (let s = 1; s <= steps; s++) {
                const t = s / dist;
                const newVec = new Phaser.Math.Vector2(
                    Phaser.Math.Linear(wormState.lastHead.x, head.x, t),
                    Phaser.Math.Linear(wormState.lastHead.y, head.y, t)
                );
                path.unshift(newVec);
                // path에 새 좌표 추가 시 boundBox 확장
                wormState.updateBoundBoxOnAdd(newVec);
            }
            wormState.lastHead.set(head.x, head.y);
        }

        const baseSpacing = GAME_CONSTANTS.SEGMENT_SPACING;
        const baseRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
        const currentActualRadius = head.radius;
        const spacing = baseSpacing * (currentActualRadius / baseRadius);

        const maxPathLen = Math.floor(segments.length * spacing + 50);
        while (path.length > maxPathLen) {
            // path에서 좌표가 잘려나갈 때 boundBox 갱신
            const removedVec = path.pop();
            if (removedVec) {
                wormState.updateBoundBoxOnRemove(removedVec);
            }
        }

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

    private handleSprinting(dt: number, wormState: WormState) {
        if (wormState.segments.length <= GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT) {
            wormState.isSprinting = false;
            return; // 최소 길이 이하면 달리기 중지
        }

        wormState.sprintFoodDropTimer += dt * 1000; // ms 단위로 타이머 증가

        if (wormState.sprintFoodDropTimer >= GAME_CONSTANTS.SPRINT_FOOD_DROP_INTERVAL) {
            wormState.sprintFoodDropTimer = 0;
            const removed = wormState.segments.pop();
            if (removed) {
                const food = new Food(this, removed.x, removed.y, GAME_CONSTANTS.FOOD_RADIUS, 0xff3333);
                this.foods.push(food);
                this.foodsGroup.add(food.sprite);
                removed.destroy();
                wormState.targetSegmentRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS +
                    (wormState.segments.length - GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT) * GAME_CONSTANTS.SEGMENT_GROWTH_RADIUS;
            }
        }
    }

    private killWorm(wormType: WormType) {
        const wormState = this.worms[wormType];
        if (!wormState || wormState.segments.length === 0) return;

        // 모든 세그먼트 제거
        for (const segment of wormState.segments) {
            segment.destroy();
        }

        // 스포너에 반환
        this.wormSpawner.releaseWorm(wormType, wormState);

        this.wormHeadsGroup.remove(wormState.segments[0], true, true); // 머리 제거
        // worms에서 제거 후 새로 스폰
        delete this.worms[wormType];
        this.worms[wormType] = this.wormSpawner.spawnWorm(
            this,
            wormType,
            Phaser.Math.Between(100, GAME_CONSTANTS.MAP_WIDTH - 100),
            Phaser.Math.Between(100, GAME_CONSTANTS.MAP_HEIGHT - 100)
        );
        // 새 지렁이 머리만 그룹에 추가
        const newHead = this.worms[wormType].segments[0];
        newHead.setData("wormType", wormType);
        this.wormHeadsGroup.add(newHead);
        if (wormType === "player") {
            this.InitializePlayer();

            this.worms["playerTrackerBot"].nextTarget = null; // 플레이어가 죽었으므로 추적 봇의 목표를 초기화
        }

        // // 유저인 경우 게임 종료
        // if (wormType === "player") {
        //     this.scene.stop("UIScene"); // UI 씬 중지
        //     //this.scene.start("GameOverScene"); // 게임 오버 씬 시작
        // }

        return;
    }

    /**
    * 모든 벌레 쌍에 대해 충돌(죽음) 판정을 수행합니다.
    * - 충돌이 발생한 벌레는 killedWorms 배열에 추가되고, 이후 killWorm을 통해 제거됩니다.
    * - 각 벌레의 머리가 다른 벌레의 몸통에 닿았는지 검사합니다.
    * - 한 쌍에 대해 양방향(머리 vs 몸통) 모두 검사합니다.
    * - killedWorms는 WormState 인스턴스 배열로, 중복 추가를 방지합니다.
    */
    private checkWormsCollision() {

        // TODO: 최적화 필수.

        const killedWorms: WormState[] = []; // 죽은 벌레를 저장할 배열

        // 모든 지렁이 쌍에 대해 충돌 검사
        const wormTypes = Object.keys(this.worms) as WormType[];
        for (let i = 0; i < wormTypes.length; i++) {
            const wormA = this.worms[wormTypes[i]];
            for (let j = i + 1; j < wormTypes.length; j++) {
                const wormB = this.worms[wormTypes[j]];
                // A 머리 vs B 몸통
                if (this.checkWormCollision(wormA, wormB)) {
                    if (!killedWorms.includes(wormA)) {
                        killedWorms.push(wormA);
                    }
                }
                // B 머리 vs A 몸통
                if (this.checkWormCollision(wormB, wormA)) {
                    if (!killedWorms.includes(wormB)) {
                        killedWorms.push(wormB);
                    }
                }
            }
        }

        // 죽은 벌레 처리
        for (const worm of killedWorms) {
            const wormType = Object.keys(this.worms).find(key => this.worms[key as WormType] === worm) as WormType;
            if (wormType) {
                this.killWorm(wormType);
            }
        }
    }

    /**
     * 두 벌레의 충돌(죽음) 판정 함수
     * @param inTargetWorm 충돌을 검사할 벌레(A, 머리 기준)
     * @param inOtherworm 충돌 대상 벌레(B, 몸통 기준)
     */
    private checkWormCollision(inTargetWorm: WormState, inOtherworm: WormState): boolean {

        // 1. 바운더리 체크: wormB의 미리 계산된 boundBox 사용
        const headA = inTargetWorm.segments[0];
        const {minX: otherMinX, maxX: otherMaxX, minY: otherMinY, maxY: otherMaxY} = inOtherworm.getBoundBox();

        // A의 머리 바운드박스가 B의 바운드박스 안에 있는지 확인
        const isInBound = (
            headA.x + headA.radius >= otherMinX && headA.x - headA.radius <= otherMaxX &&
            headA.y + headA.radius >= otherMinY && headA.y - headA.radius <= otherMaxY
        );
        // 바운더리 안에 있으면 디테일 체크
        if (!isInBound) {
            // 바운더리 밖이면 충돌 없음
            return false;
        }

        // 2. 디테일 체크: A의 머리와 B의 모든 몸통(머리 제외) 충돌 검사
        for (let i = 1; i < inOtherworm.segments.length; i++) {
            const segB = inOtherworm.segments[i];
            const dist = Phaser.Math.Distance.Between(headA.x, headA.y, segB.x, segB.y);
            if (dist < headA.radius + segB.radius) {
                return true;
            }
        }

        return false; // 충돌이 없음을 반환
    }
}
