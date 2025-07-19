import Phaser from "phaser";
import GameSettings from "./GameSettings";
import { GAME_CONSTANTS } from "@beyondworm/shared";

export default class UIScene extends Phaser.Scene {
    private foodText!: Phaser.GameObjects.Text;

    // 디버그 변수는 개발 환경에서만 선언
    private debugText?: Phaser.GameObjects.Text;
    private isGameStateDebugVisible = false;

    constructor() {
        super({ key: "UIScene" });
    }

    preload() {
        // UI 관련 에셋 로드
    }

    create() {
        // 화면 오른쪽 위에 텍스트 표시
        this.foodText = this.add
            .text(this.scale.width - 40, 20, "🍎 0", { font: "32px Arial", color: "#fff", fontStyle: "bold" })
            .setOrigin(1, 0)
            .setStroke("#222", 6)
            .setShadow(4, 4, "#000", 8, true, true)
            .setAlpha(1)
            .setVisible(true)
            .setDepth(10000);

        // 화면 크기 변경 시 위치 재조정
        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            this.foodText.setPosition(gameSize.width - 40, 20);
        });

        // 디버그 UI는 별도 함수에서 관리
        if (import.meta.env.MODE === "development") {
            this.createDebug();
        }
    }

    private createDebug() {
        // 개발 환경에서만 동작
        if (import.meta.env.MODE !== "development") return;
        this.debugText = this.add
            .text(20, 20, "", { font: "18px monospace", color: "#0f0", backgroundColor: "#222a" })
            .setOrigin(0, 0)
            .setDepth(10001)
            .setVisible(false);
    }

    public toggleGameStateDebug(visible: boolean) {
        if (import.meta.env.MODE !== "development" || !this.debugText) return;
        this.isGameStateDebugVisible = visible;
        this.debugText.setVisible(visible);
    }

    update() {
        // GameScene의 인스턴스 가져오기
        const gameScene = this.scene.get("GameScene") as import("./GameScene").default;
        if (gameScene && gameScene.playerState && Array.isArray(gameScene.playerState.segments)) {
            // 먹은 먹이 수 = 현재 세그먼트 개수 - 기본 세그먼트 개수
            const defaultCount = GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT ?? 0;
            const eatenCount = (gameScene.playerState.segments?.length ?? 0) - defaultCount;
            this.foodText.setText(`🍎 ${eatenCount}`);
        } else {
            this.foodText.setText(`🍎 0`);
        }

        // 개발 환경에서만 디버그 업데이트
        if (import.meta.env.MODE === "development") {
            this.updateDebug();
        }
    }

    private updateDebug() {
        if (import.meta.env.MODE !== "development" || !this.debugText || !this.isGameStateDebugVisible) return;
        const settings = GameSettings.instance.getAll();
        const lines = Object.entries(settings)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");

        // WormSpawner 풀 상태 출력
        const gameScene = this.scene.get("GameScene") as import("./GameScene").default;
        let poolInfo = "";
        if (gameScene && gameScene.wormSpawner) {
            const spawner = gameScene.wormSpawner as any;
            poolInfo += "\n[Worm Pool]\n";
            poolInfo += `Player: ${spawner.wormQueues?.[0]?.length ?? "-"}\n`;
            poolInfo += `Bot-PlayerTracker: ${spawner.wormQueues?.[1]?.[0]?.length ?? "-"}\n`;
            poolInfo += `Bot-FoodSeeker: ${spawner.wormQueues?.[1]?.[1]?.length ?? "-"}\n`;
            // cacheHit/cacheMiss 등도 추가하고 싶으면 WormSpawner에 public으로 선언 필요
            if (spawner.cacheHit !== undefined && spawner.cacheMiss !== undefined) {
                poolInfo += `cacheHit: ${spawner.cacheHit}, cacheMiss: ${spawner.cacheMiss}\n`;
            }
        }

        this.debugText.setText(lines + poolInfo);
    }
}
