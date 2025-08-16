import Phaser from "phaser";

export default class DeathScene extends Phaser.Scene {
    constructor() {
        super({ key: "DeathScene" });
    }

    create() {
        // 반투명 배경 오버레이
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7);
        overlay.setOrigin(0, 0);
        overlay.setScrollFactor(0); // 카메라 이동에 영향받지 않음

        // 중앙에 위치할 컨테이너
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // 죽음 메시지
        const deathText = this.add.text(centerX, centerY - 50, "You Died!", {
            fontSize: "48px",
            color: "#ff0000",
            fontStyle: "bold",
        });
        deathText.setOrigin(0.5);
        deathText.setScrollFactor(0);

        // 로비로 돌아가기 버튼
        const backButton = this.add.text(centerX, centerY + 20, "Back to Lobby", {
            fontSize: "24px",
            color: "#ffffff",
            backgroundColor: "#333333",
            padding: { x: 20, y: 10 },
        });
        backButton.setOrigin(0.5);
        backButton.setScrollFactor(0);
        backButton.setInteractive({ useHandCursor: true });

        // 버튼 호버 효과
        backButton.on("pointerover", () => {
            backButton.setStyle({ backgroundColor: "#555555" });
        });

        backButton.on("pointerout", () => {
            backButton.setStyle({ backgroundColor: "#333333" });
        });

        // 버튼 클릭 시 로비로 이동
        backButton.on("pointerdown", () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
        });

        this.cameras.main.on(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            location.reload();
        });
    }
}
