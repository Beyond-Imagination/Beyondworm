import Phaser from "phaser";
import { GAME_CONSTANTS } from "./constants";

export default class UIScene extends Phaser.Scene {
    private foodText!: Phaser.GameObjects.Text;

    constructor() {
        super({key: "UIScene"});
    }

    preload() {
        // UI 관련 에셋 로드
    }

    create() {
        // 화면 오른쪽 위에 텍스트 표시
        this.foodText = this.add.text(
            this.scale.width - 40,
            20,
            "🍎 0",
            {font: "32px Arial", color: "#fff", fontStyle: "bold"}
        )
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
    }

    update() {
        // GameScene의 인스턴스 가져오기
        const gameScene = this.scene.get("GameScene") as import("./GameScene").default;
        if (gameScene && Array.isArray(gameScene.playerState.segments)) {
            // 먹은 먹이 수 = 현재 세그먼트 개수 - 기본 세그먼트 개수
            const defaultCount = GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT ?? 0;
            const eatenCount = (gameScene.playerState.segments?.length ?? 0) - defaultCount;
            this.foodText.setText(`🍎 ${eatenCount}`);
        }
    }
}
