import Phaser from "phaser";
import Food from "./Food";
import { GAME_CONSTANTS } from "./constants";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    private segments!: Phaser.GameObjects.Arc[];
    private path: Phaser.Math.Vector2[] = [];
    private foods: Food[] = [];

    /* ── 조정 파라미터 ───────────────────────────── */
    private readonly turnLerp = 0.15;  // 0~1, 클수록 민첩
    /* ───────────────────────────────────────────── */
    private lastVel = new Phaser.Math.Vector2(0, 1); // 진행 단위 벡터
    private prevPtr = new Phaser.Math.Vector2();     // 이전 포인터 좌표
    private lastHead = new Phaser.Math.Vector2();     // 직전 머리 좌표


    preload() {
        // 에셋(이미지, 사운드 등) 로드
    }

    create() {
        const MapWidth = GAME_CONSTANTS.MAP_WIDTH;
        const MapHeight = GAME_CONSTANTS.MAP_HEIGHT;
        const { width: WindowWidth, height: WindowHeight } = this.scale;

        // ① 지렁이 몸통(원)들 만들기
        this.segments = [];
        for (let i = 0; i < GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
            const c = this.add.circle(
                MapWidth / 2,
                MapHeight / 2 + i * GAME_CONSTANTS.SEGMENT_SPACING,
                GAME_CONSTANTS.SEGMENT_RADIUS,
                0xaaff66
            );
            c.setStrokeStyle(4, 0x333333); // 외곽선 두께 4, 색상 어두운 회색
            c.setDepth(GAME_CONSTANTS.ZORDER_SEGMENT - i); // 세그먼트의 Z-순서 설정
            this.segments.push(c);
            this.physics.add.existing(c, false); // Arcade Physics 적용
            c.body.setCircle(GAME_CONSTANTS.SEGMENT_RADIUS); // 충돌 판정을 위한 hitArea를 원으로 설정
        }

        // ② 경로 배열을 몸통 길이만큼 선-채워
        this.lastHead.set(this.segments[0].x, this.segments[0].y);
        for (let i = 0; i < GAME_CONSTANTS.SEGMENT_SPACING * GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
            this.path.push(
                new Phaser.Math.Vector2(this.lastHead.x, this.lastHead.y + i)
            );
        }

        // ③ 포인터 초기 좌표 기억
        this.prevPtr.set(
            this.input.activePointer.worldX,
            this.input.activePointer.worldY
        );

        // ④ 먹이 여러 개 랜덤 위치에 소환
        this.updateFoods();

        // ⑤ 머리와 먹이들 간의 충돌 판정
        this.physics.add.overlap(
            this.segments[0], // 머리
            this.foods.map(f => f.sprite), // 먹이들
            (head: Phaser.GameObjects.Arc, foodSprite: Phaser.GameObjects.Arc) => {
                // 먹이를 먹었을 때 처리
                this.biteFood(head, foodSprite);
            }
        );

        // ⑥ 창 크기 바뀌면, 몸통을 화면 중앙 기준으로 다시 정렬(선택)
        this.scale.on("resize", ({ WindowWidth, WindowHeight }: Phaser.Structs.Size) => {
            const dx = MapWidth / 2 - this.segments[0].x;
            const dy = MapHeight / 2 - this.segments[0].y;
            this.segments.forEach(s => {
                s.x += dx;
                s.y += dy;
            });
        });

        // ⑦ 카메라 설정
        this.setupCamera(this.segments[0], MapWidth, MapHeight);
    }

    update(_: number, dms: number) {
        const dt = dms / 1000;
        const ptr = this.input.activePointer;
        const head = this.segments[0];

        /* ── A. 목표 방향 계산 ─────────────────────── */
        const desired = new Phaser.Math.Vector2(
            ptr.worldX - head.x,
            ptr.worldY - head.y
        ).normalize();                     // 머리→포인터 방향

        // 포인터가 실제로 움직였다면 → 방향 보간
        this.lastVel.lerp(desired, this.turnLerp).normalize();
        // 포인터 정지 시 lastVel 유지 → 관성

        /* ── B. 머리 이동 & 경로 샘플링 ─────────────── */
        head.x += this.lastVel.x * GAME_CONSTANTS.HEAD_SPEED * dt;
        head.y += this.lastVel.y * GAME_CONSTANTS.HEAD_SPEED * dt;

        // 머리에서 마지막 기록 지점까지 1 px 간격으로 경로 push
        let dx = head.x - this.lastHead.x;
        let dy = head.y - this.lastHead.y;
        let dist = Math.hypot(dx, dy);

        if (dist > 0) {
            const steps = Math.floor(dist);
            for (let s = 1; s <= steps; s++) {
                const t = s / dist;
                this.path.unshift(
                    new Phaser.Math.Vector2(
                        this.lastHead.x + dx * t,
                        this.lastHead.y + dy * t
                    )
                );
            }
            this.lastHead.set(head.x, head.y);
        }

        // 오래된 궤적 잘라 메모리 제한
        const maxPathLen = GAME_CONSTANTS.SEGMENT_SPACING * GAME_CONSTANTS.SEGMENT_MAX_COUNT + 50;
        if (this.path.length > maxPathLen) this.path.length = maxPathLen;

        /* ── C. 몸통을 경로 위치에 배치 ─────────────── */
        for (let i = 1; i < this.segments.length; i++) {
            const idx = i * GAME_CONSTANTS.SEGMENT_SPACING;
            if (idx < this.path.length) this.segments[i].setPosition(
                this.path[idx].x,
                this.path[idx].y
            );
        }

        /* ── D. 상태 갱신 ──────────────────────────── */
        this.prevPtr.set(ptr.worldX, ptr.worldY);

        // 먹이 수가 부족하면 다시 랜덤 생성
        this.updateFoods();
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
        this.cameras.main.startFollow(target, true);
        this.cameras.main.setZoom(1); // 필요시 zoom 값 조정
    }

    private biteFood(head: Phaser.GameObjects.Arc, foodSprite: Phaser.GameObjects.Arc) {
        const food = this.foods.find(f => f.sprite === foodSprite);
        if (!food) return; // 먹이를 찾지 못하면 종료

        food.beEaten();

        this.foods = this.foods.filter(f => f !== food); // 배열에서 제거

        // 새로운 세그먼트 추가
        const lastSegment = this.segments[this.segments.length - 1];
        const newSegment = this.add.circle(
            lastSegment.x,
            lastSegment.y,
            GAME_CONSTANTS.SEGMENT_RADIUS,
            0xaaff66
        );
        newSegment.setStrokeStyle(4, 0x333333);
        newSegment.setDepth(GAME_CONSTANTS.ZORDER_SEGMENT - this.segments.length);
        this.segments.push(newSegment);
    }

    private updateFoods(minX = 100, maxX = GAME_CONSTANTS.MAP_WIDTH - 100, minY = 100, maxY = GAME_CONSTANTS.MAP_HEIGHT - 100) {
        // 먹이 수가 부족하면 다시 랜덤 생성
        while (this.foods.length < GAME_CONSTANTS.MAX_FOOD_COUNT) {
            const x = Phaser.Math.Between(minX, maxX);
            const y = Phaser.Math.Between(minY, maxY);
            const food = new Food(this, x, y, GAME_CONSTANTS.FOOD_RADIUS, 0xff3333);
            this.foods.push(food);

            this.physics.add.overlap(
                this.segments[0], // 머리
                food.sprite, // 먹이
                (head: Phaser.GameObjects.Arc, foodSprite: Phaser.GameObjects.Arc) => {
                    // 먹이를 먹었을 때 처리
                    this.biteFood(head, foodSprite);
                }
            );
        }
    }
}
