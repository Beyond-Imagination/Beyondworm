import Phaser from "phaser";
import Food from "./Food";
import { GAME_CONSTANTS } from "./constants";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    private segments!: Phaser.GameObjects.Arc[];
    private foods: Food[] = [];

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

        // ② 먹이 여러 개 랜덤 위치에 소환
        this.updateFoods();

        // ③ 머리와 먹이들 간의 충돌 판정
        this.physics.add.overlap(
            this.segments[0], // 머리
            this.foods.map(f => f.sprite), // 먹이들
            (head: Phaser.GameObjects.Arc, foodSprite: Phaser.GameObjects.Arc) => {
                // 먹이를 먹었을 때 처리
                this.biteFood(head, foodSprite);
            }
        );

        // ④ 창 크기 바뀌면, 몸통을 화면 중앙 기준으로 다시 정렬(선택)
        this.scale.on("resize", ({ WindowWidth, WindowHeight }: Phaser.Structs.Size) => {
            const dx = MapWidth / 2 - this.segments[0].x;
            const dy = MapHeight / 2 - this.segments[0].y;
            this.segments.forEach(s => {
                s.x += dx;
                s.y += dy;
            });
        });

        // ⑤ 카메라 설정
        this.setupCamera(this.segments[0], MapWidth, MapHeight);
    }

    update(_: number, delta: number) {
        /** ---------- 1) 머리(0번 세그먼트)가 마우스를 추적 ---------- */
        const head = this.segments[0];
        const p = this.input.activePointer;

        const dxHead = p.worldX - head.x;
        const dyHead = p.worldY - head.y;
        const distHead = Math.hypot(dxHead, dyHead);

        if (distHead > 1) {
            const maxMove = (GAME_CONSTANTS.HEAD_SPEED * delta) / 1000;
            const t = Math.min(1, maxMove / distHead); // 한 프레임 이동 한계
            head.x += dxHead * t;
            head.y += dyHead * t;
        }

        /** ---------- 2) 나머지 세그먼트가 ‘앞 세그먼트’를 따라감 ---------- */
        for (let i = 1; i < this.segments.length; i++) {
            const prev = this.segments[i - 1];
            const curr = this.segments[i];

            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.hypot(dx, dy);

            // 앞놈과 일정 간격보다 멀어지면 그 거리만큼 당겨옴
            if (dist > GAME_CONSTANTS.SEGMENT_SPACING) {
                const move = dist - GAME_CONSTANTS.SEGMENT_SPACING;      // 초과 거리
                const ratio = move / dist;                    // 이동 비율
                curr.x += dx * ratio;
                curr.y += dy * ratio;
            }
        }

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
