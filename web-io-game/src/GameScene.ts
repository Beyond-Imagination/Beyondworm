import Phaser from "phaser";
import { FE_CONSTANTS } from "./constants";
import { WormState } from "./WormState";
import GameClient from "./GameClient";
import { Food, GAME_CONSTANTS, Worm } from "@beyondworm/shared";
import FoodUI from "./FoodUI";
import bgPatternURL from "/background.jpeg?url";
import { RankingData } from "@beyondworm/shared";

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    private gameClient!: GameClient;

    // 서버에서 관리되는 먹이들
    public serverFoods: Map<string, Food> = new Map();
    public foods: FoodUI[] = [];

    public playerState!: WormState; // 로컬 플레이어
    public worms!: WormState[]; // 모든 지렁이 상태들
    private playerId!: string; // 서버에서 받은 플레이어 ID
    private serverWorms = new Map<string, Worm>(); // 서버 지렁이 상태

    private wormHeadsGroup!: Phaser.Physics.Arcade.Group;
    private wormBodiesGroup!: Phaser.Physics.Arcade.Group;
    private foodsGroup!: Phaser.Physics.Arcade.Group;
    private backgroundTileSprite!: Phaser.GameObjects.TileSprite;

    private static readonly BACKGROUND_KEY = "background_pattern";
    private static readonly BACKGROUND_DEPTH = -10;

    preload() {
        // 에셋(이미지, 사운드 등) 로드
        this.load.image(GameScene.BACKGROUND_KEY, bgPatternURL);
    }

    create() {
        // 확장된 크기는 정사각형의 크기를 가진다
        const extendedMapSize = (GAME_CONSTANTS.MAP_RADIUS + FE_CONSTANTS.CAMERA_PADDING) * 2;

        // 화면 크기에 맞는 배경 타일 스프라이트 추가 (효율적인 방식)
        this.backgroundTileSprite = this.add.tileSprite(
            GAME_CONSTANTS.MAP_RADIUS,
            GAME_CONSTANTS.MAP_RADIUS,
            extendedMapSize,
            extendedMapSize,
            "background_pattern",
        );
        this.backgroundTileSprite.setOrigin(0.5, 0.5); // 화면 중앙에 배치하기 위해 원점 설정
        this.backgroundTileSprite.setDepth(GameScene.BACKGROUND_DEPTH); // 다른 모든 게임 요소보다 뒤에 있도록 설정

        // (A) 빨간 가림막(플레이어 위치에 상관없이 맵에 고정됨)
        const cover = this.add.graphics().setScrollFactor(1).setDepth(FE_CONSTANTS.ZORDER_MAP_END_ELEMENT);
        cover
            .fillStyle(FE_CONSTANTS.BOUNDARY_COLOR, FE_CONSTANTS.BOUNDARY_TRANSPARENCY)
            .fillRect(-FE_CONSTANTS.CAMERA_PADDING, -FE_CONSTANTS.CAMERA_PADDING, extendedMapSize, extendedMapSize);

        // (B) 마스크로 쓸 원(플레이어 위치에 상관없이 맵에 고정됨)
        const maskGfx = this.add
            .graphics()
            .setScrollFactor(1)
            .setDepth(FE_CONSTANTS.ZORDER_MAP_END_ELEMENT + 1);
        maskGfx.fillStyle(0xffffff, 1);
        maskGfx.fillCircle(0, 0, GAME_CONSTANTS.MAP_RADIUS);
        maskGfx.visible = false; // 마스크 도형 자체는 보이지 않게

        // GeometryMask 생성 + 반전: 원 안만 투명(=구멍)
        const mask = new Phaser.Display.Masks.GeometryMask(this, maskGfx);
        mask.invertAlpha = true;
        cover.setMask(mask);

        maskGfx.x = GAME_CONSTANTS.MAP_RADIUS;
        maskGfx.y = GAME_CONSTANTS.MAP_RADIUS;

        // 트랜지션 효과를 위해 시작 시 투명하게 설정
        this.cameras.main.setAlpha(0);

        // 서버 연결
        //this.gameClient = new GameClient(this);
        const serverAddress = this.game.registry.get("serverAddress") as string;
        this.gameClient = new GameClient(this, serverAddress);
        this.gameClient.startSendingDirection();

        // 개발 환경에서만 치트 등록
        if (import.meta.env.MODE === "development") {
            import("./Cheat").then((mod) => {
                mod.registerCheats?.(this);
            });
        }

        // 기본 초기화 (서버에서 데이터가 오면 다시 설정됨)
        this.worms = [];

        // 지렁이 머리들과 몸통들을 그룹에 추가
        this.wormHeadsGroup = this.physics.add.group();
        this.wormBodiesGroup = this.physics.add.group();
        this.foodsGroup = this.physics.add.group();

        // UIScene이 실행 중이 아니면 실행
        if (!this.scene.isActive("UIScene")) {
            this.scene.launch("UIScene");
        }

        // 그룹 간의 overlap을 한 번만 등록
        this.physics.add.overlap(this.wormHeadsGroup, this.foodsGroup, this.handleFoodCollision, undefined, this);

        // 지렁이 머리와 다른 지렁이 몸통 간의 충돌 감지
        this.physics.add.overlap(this.wormHeadsGroup, this.wormBodiesGroup, this.handleWormCollision, undefined, this);

        // 스페이스바 이벤트
        this.input.keyboard.on("keydown-SPACE", () => {
            this.gameClient.startSprint();
        });
        this.input.keyboard.on("keyup-SPACE", () => {
            this.gameClient.stopSprint();
        });
    }

    /**
     * 서버로부터 받은 데이터로 게임 초기화
     */
    public initializeFromServer(playerId: string, worms: Worm[], foods: Food[]) {
        this.playerId = playerId;
        this.clearAllWorms();
        this.clearAllFoods();

        for (const serverWorm of worms) {
            this.addWormFromServer(serverWorm);
        }

        // 서버 먹이 초기화
        this.updateFoodsFromServer(foods);

        // 플레이어 설정
        const playerWorm = this.worms.find((w) => w.segments[0].getData("wormId") === playerId);
        if (playerWorm) {
            this.playerState = playerWorm;
            this.InitializePlayer();
        }
    }

    /**
     * 서버로부터 새 지렁이 추가
     */
    public addWormFromServer(serverWorm: Worm) {
        this.serverWorms.set(serverWorm.id, serverWorm);

        const wormState = this.createWormStateFromServer(serverWorm);
        this.worms.push(wormState);

        // 머리는 헤드 그룹에, 몸통은 바디 그룹에 추가
        const head = wormState.segments[0];
        this.wormHeadsGroup.add(head);

        // 닉네임 텍스트 생성 및 추가
        this.createNicknameText(wormState, serverWorm.nickname);

        // 현재 플레이어의 몸통만 바디 그룹에 추가
        if (serverWorm.id === this.playerId) {
            for (let i = 1; i < wormState.segments.length; i++) {
                this.wormBodiesGroup.add(wormState.segments[i]);
            }
        }
    }

    /**
     * 서버로부터 지렁이 제거
     */
    public removeWormFromServer(wormId: string) {
        this.serverWorms.delete(wormId);

        const wormIndex = this.worms.findIndex((w) => w.segments[0].getData("wormId") === wormId);
        if (wormIndex !== -1) {
            const worm = this.worms[wormIndex];
            this.wormHeadsGroup.remove(worm.segments[0], false, false);

            worm.destroyNicknameText();

            // 지렁이 세그먼트들 제거
            for (const segment of worm.segments) {
                segment.destroy();
            }

            this.worms.splice(wormIndex, 1);
        }
    }

    /**
     * 서버 상태로 모든 지렁이 업데이트
     */
    public updateWormsFromServer(serverWorms: Worm[]) {
        for (const serverWorm of serverWorms) {
            this.serverWorms.set(serverWorm.id, serverWorm);

            const clientWorm = this.worms.find((w) => w.segments[0].getData("wormId") === serverWorm.id);
            if (clientWorm) {
                this.updateWormFromServer(clientWorm, serverWorm);
            }
        }
    }

    /**
     * 플레이어 방향 벡터 반환 (GameClient가 서버로 전송)
     */
    public getPlayerDirection(): Phaser.Math.Vector2 {
        const ptr = this.input.activePointer;
        const worldPoint = this.cameras.main.getWorldPoint(ptr.x, ptr.y);

        const head = this.playerState.segments[0];
        const desiredDir = new Phaser.Math.Vector2(worldPoint.x - head.x, worldPoint.y - head.y);

        return desiredDir.length() > 0 ? desiredDir.normalize() : Phaser.Math.Vector2.ZERO;
    }

    /**
     * 서버 지렁이 데이터로부터 클라이언트 WormState 생성
     */
    private createWormStateFromServer(serverWorm: Worm): WormState {
        const segments: Phaser.GameObjects.Arc[] = [];

        for (let i = 0; i < serverWorm.segments.length; i++) {
            const serverSegment = serverWorm.segments[i];
            const segment = this.add.circle(serverSegment.x, serverSegment.y, serverWorm.radius, serverWorm.color);
            segment.setStrokeStyle(4, 0x333333);
            segment.setDepth(FE_CONSTANTS.ZORDER_SEGMENT - i);

            // physics body 부여
            this.physics.add.existing(segment, false);

            // 지렁이 타입 정보 저장
            segment.setData("wormId", serverWorm.id);
            segment.setData("wormType", serverWorm.type);
            segments.push(segment);
        }

        return new WormState(segments, serverWorm.type);
    }

    /**
     * 지렁이의 닉네임 텍스트를 생성합니다.
     */
    private createNicknameText(wormState: WormState, nickname: string) {
        if (wormState.segments.length === 0) return;

        const head = wormState.segments[0];
        const nicknameText = this.add.text(
            head.x,
            head.y - head.radius - FE_CONSTANTS.NICKNAME_Y_OFFSET,
            nickname,
            FE_CONSTANTS.NICKNAME_STYLE,
        );

        // 텍스트를 중앙 정렬
        nicknameText.setOrigin(0.5, 0.5);

        // 높은 depth로 설정하여 다른 요소들 위에 표시
        nicknameText.setDepth(FE_CONSTANTS.ZORDER_NICKNAME);

        // WormState에 닉네임 텍스트 설정
        wormState.setNicknameText(nicknameText);
    }

    /**
     * 서버 상태로 개별 지렁이 업데이트 (보간 처리 적용)
     */
    private updateWormFromServer(clientWorm: WormState, serverWorm: Worm) {
        // 세그먼트 수가 변경된 경우 처리
        while (clientWorm.segments.length < serverWorm.segments.length) {
            // 세그먼트 추가
            const lastSegment = clientWorm.segments[clientWorm.segments.length - 1];
            const newSegment = this.add.circle(
                lastSegment.x,
                lastSegment.y,
                GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS,
                serverWorm.color,
            );
            newSegment.setStrokeStyle(4, 0x333333);
            newSegment.setDepth(FE_CONSTANTS.ZORDER_SEGMENT - clientWorm.segments.length);
            this.physics.add.existing(newSegment, false);

            newSegment.setData("wormId", serverWorm.id);
            newSegment.setData("wormType", serverWorm.type);

            clientWorm.addSegment(newSegment);

            // 현재 플레이어의 새 세그먼트만 바디 그룹에 추가 (머리가 아닌 경우)
            if (serverWorm.id === this.playerId && clientWorm.segments.length > 1) {
                this.wormBodiesGroup.add(newSegment);
            }
        }

        while (clientWorm.segments.length > serverWorm.segments.length) {
            // 세그먼트 제거
            const removedSegment = clientWorm.removeLastSegment();
            if (removedSegment) {
                // 현재 플레이어의 세그먼트만 바디 그룹에서 제거
                if (serverWorm.id === this.playerId) {
                    this.wormBodiesGroup.remove(removedSegment, false, false);
                }
                removedSegment.destroy();
            }
        }

        // 서버 위치를 타겟 위치로 설정 (즉시 적용하지 않음)
        clientWorm.updateTargetPositions(serverWorm.segments, serverWorm.radius);

        // 스프린트 상태 업데이트
        clientWorm.isSprinting = serverWorm.isSprinting;
    }

    /**
     * 모든 지렁이 제거
     */
    private clearAllWorms() {
        for (const worm of this.worms) {
            this.wormHeadsGroup.remove(worm.segments[0], false, false);

            worm.destroyNicknameText();

            for (const segment of worm.segments) {
                segment.destroy();
            }
        }
        this.worms = [];
        this.serverWorms.clear();
    }

    /**
     * 서버로부터 받은 먹이 데이터로 클라이언트 먹이 업데이트
     */
    public updateFoodsFromServer(serverFoods: Food[]) {
        const serverFoodIds = new Set(serverFoods.map((f) => f.id));

        // 1. 클라이언트에는 있지만 서버에는 없는 먹이 제거
        this.foods = this.foods.filter((clientFood) => {
            const foodId = clientFood.sprite.getData("foodId") as string;
            if (serverFoodIds.has(foodId)) {
                return true; // 유지
            } else {
                this.foodsGroup.remove(clientFood.sprite, true, true); // 제거
                return false;
            }
        });

        // 2. 서버에는 있지만 클라이언트에는 없는 먹이 추가
        const clientFoodIds = new Set(this.foods.map((f) => f.sprite.getData("foodId") as string));
        for (const serverFood of serverFoods) {
            if (!clientFoodIds.has(serverFood.id)) {
                const food = new FoodUI(
                    serverFood.id,
                    this,
                    serverFood.x,
                    serverFood.y,
                    serverFood.radius,
                    serverFood.color,
                );
                food.sprite.setData("foodId", serverFood.id);
                this.foods.push(food);
                this.foodsGroup.add(food.sprite);
            }
        }

        // 3. 서버 먹이 맵 업데이트
        this.serverFoods.clear();
        for (const serverFood of serverFoods) {
            this.serverFoods.set(serverFood.id, serverFood);
        }
    }

    /**
     * 서버에서 먹이가 먹혔을 때 처리
     */
    public handleFoodEatenFromServer(collisions: { wormId: string; foodId: string }[]) {
        for (const collision of collisions) {
            const food = this.foods.find((f) => f.sprite.getData("foodId") === collision.foodId);
            if (food) {
                console.log(`🍎 Food eaten: ${collision.foodId} by ${collision.wormId}`);
            }
        }
    }

    /**
     * 서버에서 지렁이가 죽었을 때 처리
     */
    public handleWormDiedFromServer(data: { killedWormId: string; killerWormId: string | null }) {
        if (data.killerWormId) console.log(`💀 Worm died: ${data.killedWormId} killed by ${data.killerWormId}`);
        else console.log(`💀 Worm died: ${data.killedWormId} naturally`); // 자연사

        // 죽은 지렁이가 내 플레이어인 경우 카메라 설정을 일시적으로 해제할 수 있음
        if (data.killedWormId === this.playerId) {
            console.log("💀 I died!");
            // 필요시 죽음 효과나 UI 표시 추가 가능
        }
    }

    /**
     * 모든 먹이 제거
     */
    private clearAllFoods() {
        for (const food of this.foods) {
            this.foodsGroup.remove(food.sprite, true, true);
        }
        this.foods = [];
        this.serverFoods.clear();
    }

    // 충돌 핸들러: head와 foodSprite
    private handleFoodCollision(
        head: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        foodSprite: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    ) {
        // head에 해당하는 wormState를 worms 배열에서 찾음
        const eater = this.worms.find((w) => w.segments[0] === head);
        if (!foodSprite.active || !eater || !this.playerState) return;

        // 플레이어의 먹이만 처리 (자신의 지렁이가 먹었을 때만)
        if (eater !== this.playerState) return;

        // 서버에 먹이 먹기 리포트 전송
        const foodId = (foodSprite as Phaser.GameObjects.Arc).getData("foodId");

        // 즉시 클라이언트에서 먹이 제거 (시각적 반응성을 위해)
        this.biteFood(foodSprite as Phaser.GameObjects.Arc);

        // 서버에 리포트 (서버에서 검증 후 최종 처리)
        this.gameClient.reportFoodEaten(foodId);
        console.log(`📤 Reported food eaten: ${foodId} at position:`, { x: head.x, y: head.y });
    }

    /**
     * 지렁이 간 충돌 핸들러: 머리와 몸통 간의 충돌을 처리
     */
    private handleWormCollision(
        head: Phaser.Types.Physics.Arcade.GameObjectWithBody,
        bodySegment: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    ) {
        if (!this.playerState) return;

        const headWormId = (head as Phaser.GameObjects.Arc).getData("wormId") as string;
        const bodyWormId = (bodySegment as Phaser.GameObjects.Arc).getData("wormId") as string;

        // 내 몸통에 다른 지렁이의 머리가 충돌한 경우만 리포트
        if (bodyWormId === this.playerId && headWormId !== bodyWormId) {
            this.gameClient.reportCollision(headWormId);
            console.log(`💥 Collision reported: ${headWormId} hit my body`);
        }
    }

    update(_: number, dms: number) {
        // 모든 지렁이의 보간 처리 수행
        for (const worm of this.worms) {
            worm.interpolatePositions();
            worm.updateNicknamePosition(this.cameras.main.zoom);
        }

        // 카메라 업데이트
        this.updateCamera();
    }

    shutdown() {
        // Scene이 종료될 때 호출
        // 1. GameClient 정리 (소켓 연결 해제, 타이머 제거 등)
        this.gameClient.disconnect();

        // 2. 등록된 키보드 이벤트 리스너 제거
        this.input.keyboard.off("keydown-SPACE");
        this.input.keyboard.off("keyup-SPACE");
    }

    /**
     * 메인 플레이어 Front 초기화
     * - 카메라 설정 등
     */
    private InitializePlayer() {
        // camera setting
        this.setupCamera(this.playerState.segments[0], GAME_CONSTANTS.MAP_RADIUS * 2, GAME_CONSTANTS.MAP_RADIUS * 2);
    }

    /**
     * 카메라를 지정한 타겟에 맞춰 세팅합니다.
     * @param target 카메라가 따라갈 게임 오브젝트(예: 지렁이 머리)
     * @param width 카메라 bounds의 너비 (예: 맵 너비)
     * @param height 카메라 bounds의 높이 (예: 맵 높이)
     */
    private setupCamera(target: Phaser.GameObjects.GameObject, width: number, height: number) {
        this.cameras.main.setBounds(
            -FE_CONSTANTS.CAMERA_PADDING,
            -FE_CONSTANTS.CAMERA_PADDING,
            width + FE_CONSTANTS.CAMERA_PADDING * 2,
            height + FE_CONSTANTS.CAMERA_PADDING * 2,
        );
        this.cameras.main.startFollow(
            target,
            true,
            FE_CONSTANTS.CAMERA_MOVE_LERP_SPEED,
            FE_CONSTANTS.CAMERA_MOVE_LERP_SPEED,
        );
        this.cameras.main.setZoom(1); // 필요시 zoom 값 조정
    }

    private biteFood(foodSprite: Phaser.GameObjects.Arc) {
        const food = this.foods.find((f) => f.sprite === foodSprite);
        if (!food) return; // 먹이를 찾지 못하면 종료

        food.beEaten();
        this.foodsGroup.remove(food.sprite, true, true); // 그룹에서 제거

        this.foods = this.foods.filter((f) => f !== food); // 배열에서 제거
    }

    private updateCamera() {
        // 플레이어가 죽었거나 아직 초기화되지 않은 경우 카메라 업데이트 하지 않음
        if (!this.playerState || !this.playerState.segments || this.playerState.segments.length === 0) {
            return;
        }

        // 플레이어의 첫 번째 세그먼트(머리)가 유효한지 확인
        const headSegment = this.playerState.segments[0];
        if (!headSegment || !headSegment.active) {
            return;
        }

        // 화면에 항상 같은 비율로 보이도록 zoom 계산
        // (세그먼트 반지름이 커져도 화면에서는 항상 같은 비율로 보이게 함)
        const baseRadius = GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
        const currentRadius = headSegment.radius; // 플레이어 기준
        const baseZoom = 1;
        const zoom = baseZoom * (baseRadius / currentRadius);
        // 카메라 zoom을 브라우저 zoom에 맞게 고정
        // this.cameras.main.setZoom(1 / window.devicePixelRatio);
        console.log(
            this.cameras.main.zoom,
            " ",
            zoom,
            " ",
            FE_CONSTANTS.CAMERA_ZOOM_LERP_SPEED,
            " ",
            window.devicePixelRatio,
        );
        // this.cameras.main.setZoom(
        //     Phaser.Math.Linear(this.cameras.main.zoom, zoom, FE_CONSTANTS.CAMERA_ZOOM_LERP_SPEED),
        // );
        this.cameras.main.setZoom(zoom / window.devicePixelRatio);
    }

    /**
     * 플레이어가 죽었을 때 DeathScene을 표시합니다.
     */
    public showDeathScreen() {
        console.log("🎮 Showing death screen");

        // DeathScene을 오버레이로 시작 (GameScene은 계속 실행됨)
        if (!this.scene.isActive("DeathScene")) {
            this.scene.launch("DeathScene");
        }
    }

    /**
     * 서버로부터 받은 랭킹 데이터를 UIScene으로 전달합니다.
     */
    public updateRankingData(rankingData: RankingData) {
        const uiScene = this.scene.get("UIScene") as import("./UIScene").default;
        if (uiScene) {
            uiScene.updateRanking(rankingData);
        }
    }
}
