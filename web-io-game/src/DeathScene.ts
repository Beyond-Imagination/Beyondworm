import Phaser from "phaser";
import { FE_CONSTANTS } from "./constants";

export default class DeathScene extends Phaser.Scene {
    private rootContainer?: Phaser.GameObjects.Container;
    private static readonly BUTTON_X = -110;
    private static readonly BUTTON_Y = 118;
    private static readonly BUTTON_WIDTH = 220;
    private static readonly BUTTON_HEIGHT = 58;
    private static readonly BUTTON_RADIUS = 18;

    constructor() {
        super({ key: "DeathScene" });
    }

    create(data: { score?: number; bestScore?: number; reasonMessage?: string }) {
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            location.reload();
        });

        this.renderUI(data);

        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            this.rootContainer?.destroy(true);
            this.renderUI(data, gameSize.width, gameSize.height);
        });
    }

    private renderUI(
        data: { score?: number; bestScore?: number; reasonMessage?: string },
        width: number = this.cameras.main.width,
        height: number = this.cameras.main.height,
    ) {
        const centerX = width / 2;
        const centerY = height / 2;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000913, 0.78).setOrigin(0, 0).setScrollFactor(0);

        const panelGfx = this.add.graphics();
        panelGfx.fillStyle(0x000f28, 0.9);
        panelGfx.lineStyle(2, 0xff3350, 0.35);
        panelGfx.fillRoundedRect(-220, -190, 440, 380, 26);
        panelGfx.strokeRoundedRect(-220, -190, 440, 380, 26);

        const gameOverText = this.add
            .text(0, -130, "GAME OVER", {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "52px",
                color: "#ff3350",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setStroke("#2a0f18", 6)
            .setResolution(FE_CONSTANTS.TEXT_RESOLUTION);

        const reasonText = this.add
            .text(0, -82, data.reasonMessage ?? "사망했습니다.", {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "18px",
                color: "#ffd6dc",
                align: "center",
                wordWrap: { width: 360, useAdvancedWrap: true },
            })
            .setOrigin(0.5)
            .setStroke("#2a0f18", 4)
            .setResolution(FE_CONSTANTS.TEXT_RESOLUTION);

        const scoreLabel = this.add
            .text(0, -38, "최종 점수", {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "16px",
                color: "#84b4ff",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setResolution(FE_CONSTANTS.TEXT_RESOLUTION);

        const scoreValue = this.add
            .text(0, 4, `${data.score ?? 0}`, {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "64px",
                color: "#00ff88",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setStroke("#0a1324", 6)
            .setResolution(FE_CONSTANTS.TEXT_RESOLUTION);

        const bestLabel = this.add
            .text(0, 62, "최고 기록", {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "14px",
                color: "#ffd166",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setResolution(FE_CONSTANTS.TEXT_RESOLUTION);

        const bestValue = this.add
            .text(0, 88, `${data.bestScore ?? data.score ?? 0}`, {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "30px",
                color: "#ffd166",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setStroke("#2d220f", 4)
            .setResolution(FE_CONSTANTS.TEXT_RESOLUTION);

        const buttonGfx = this.add.graphics();
        this.drawPlayButton(buttonGfx, "normal");

        const playAgainText = this.add
            .text(0, 146, "PLAY AGAIN", {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "24px",
                color: "#00ff88",
                fontStyle: "bold",
            })
            .setOrigin(0.5)
            .setResolution(FE_CONSTANTS.TEXT_RESOLUTION);

        const buttonHitArea = this.add
            .rectangle(0, 146, 220, 58, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });

        buttonHitArea.on("pointerover", () => {
            this.drawPlayButton(buttonGfx, "hover");
        });

        buttonHitArea.on("pointerout", () => {
            this.drawPlayButton(buttonGfx, "normal");
        });

        buttonHitArea.on("pointerdown", () => {
            this.cameras.main.fadeOut(220, 0, 0, 0);
        });

        this.rootContainer = this.add.container(centerX, centerY, [
            panelGfx,
            gameOverText,
            reasonText,
            scoreLabel,
            scoreValue,
            bestLabel,
            bestValue,
            buttonGfx,
            playAgainText,
            buttonHitArea,
        ]);
        this.rootContainer.setScrollFactor(0);
        this.rootContainer.setDepth(11000);
        overlay.setDepth(10999);
    }

    private drawPlayButton(buttonGfx: Phaser.GameObjects.Graphics, state: "normal" | "hover") {
        const fillAlpha = state === "hover" ? 0.24 : 0.17;
        const lineAlpha = state === "hover" ? 0.8 : 0.55;

        buttonGfx.clear();
        buttonGfx.fillStyle(0x00ff88, fillAlpha);
        buttonGfx.lineStyle(2, 0x00ff88, lineAlpha);
        buttonGfx.fillRoundedRect(
            DeathScene.BUTTON_X,
            DeathScene.BUTTON_Y,
            DeathScene.BUTTON_WIDTH,
            DeathScene.BUTTON_HEIGHT,
            DeathScene.BUTTON_RADIUS,
        );
        buttonGfx.strokeRoundedRect(
            DeathScene.BUTTON_X,
            DeathScene.BUTTON_Y,
            DeathScene.BUTTON_WIDTH,
            DeathScene.BUTTON_HEIGHT,
            DeathScene.BUTTON_RADIUS,
        );
    }
}
