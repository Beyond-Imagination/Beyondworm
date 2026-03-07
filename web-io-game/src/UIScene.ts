import Phaser from "phaser";
import GameSettings from "./GameSettings";
import { GAME_CONSTANTS, RankingData } from "@beyondworm/shared";

export default class UIScene extends Phaser.Scene {
    private foodPanel!: Phaser.GameObjects.Container;
    private foodValueText!: Phaser.GameObjects.Text;
    private usernameText!: Phaser.GameObjects.Text; // 사용자 이름 텍스트 추가

    // 랭킹 관련 UI 요소들
    private rankingContainer!: Phaser.GameObjects.Container;
    private rankingBackground!: Phaser.GameObjects.Graphics;
    private rankingTitle!: Phaser.GameObjects.Text;
    private rankingTexts: Phaser.GameObjects.Text[] = [];

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
        // 트랜지션 효과를 위해 시작 시 투명하게 설정
        this.cameras.main.setAlpha(0);

        // 사용자 이름 표시
        const username = this.game.registry.get("username");
        this.usernameText = this.add
            .text(24, 24, `ID: ${username}`, {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "18px",
                color: "#c2d8ff",
                fontStyle: "bold",
            })
            .setOrigin(0, 0)
            .setStroke("#0a1324", 4)
            .setShadow(0, 0, "#00ff88", 8, true, true)
            .setDepth(10000);

        this.createFoodDashboard();

        // 랭킹 대시보드 생성
        this.createRankingDashboard();

        // 화면 크기 변경 시 위치 재조정
        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            this.updateHUDPosition(gameSize.width);
        });

        // 디버그 UI는 별도 함수에서 관리
        if (import.meta.env.MODE === "development") {
            this.createDebug();
        }
    }

    private createFoodDashboard() {
        const panelBackground = this.add.graphics();
        panelBackground.fillStyle(0x000f28, 0.86);
        panelBackground.lineStyle(2, 0x00ff88, 0.35);
        panelBackground.fillRoundedRect(0, 0, 190, 74, 16);
        panelBackground.strokeRoundedRect(0, 0, 190, 74, 16);

        const label = this.add
            .text(16, 11, "SCORE", {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "12px",
                color: "#84b4ff",
                fontStyle: "bold",
            })
            .setAlpha(0.9);

        this.foodValueText = this.add.text(16, 28, "0", {
            fontFamily: "Trebuchet MS, Arial, sans-serif",
            fontSize: "33px",
            color: "#00ff88",
            fontStyle: "bold",
        });

        this.foodPanel = this.add.container(this.scale.width - 220, 20, [panelBackground, label, this.foodValueText]);
        this.foodPanel.setDepth(10000);
    }

    /**
     * 랭킹 대시보드 UI를 생성합니다.
     */
    private createRankingDashboard() {
        const initialX = this.scale.width - 330;
        const initialY = 110;

        // 배경 그래픽 생성
        this.rankingBackground = this.add.graphics();
        this.rankingBackground.fillStyle(0x000f28, 0.84);
        this.rankingBackground.lineStyle(2, 0x4e7fc6, 0.45);
        this.rankingBackground.fillRoundedRect(0, 0, 310, 452, 16);
        this.rankingBackground.strokeRoundedRect(0, 0, 310, 452, 16);

        // 타이틀 텍스트
        this.rankingTitle = this.add
            .text(155, 18, "TOP 10 RANKING", {
                fontFamily: "Trebuchet MS, Arial, sans-serif",
                fontSize: "20px",
                color: "#00ff88",
                fontStyle: "bold",
                align: "center",
            })
            .setOrigin(0.5, 0)
            .setStroke("#0a1324", 4);

        const divider = this.add.graphics();
        divider.lineStyle(1, 0x4e7fc6, 0.4);
        divider.lineBetween(18, 56, 292, 56);

        // 랭킹 엔트리 텍스트들 생성
        this.rankingTexts = [];
        for (let i = 0; i < 10; i++) {
            const rankText = this.add
                .text(18, 72 + i * 37, "", {
                    fontFamily: "Trebuchet MS, Arial, sans-serif",
                    fontSize: "16px",
                    color: "#ffffff",
                    align: "left",
                })
                .setOrigin(0, 0)
                .setStroke("#0a1324", 3);
            this.rankingTexts.push(rankText);
        }

        // 컨테이너에 모든 요소 추가
        this.rankingContainer = this.add.container(initialX, initialY, [
            this.rankingBackground,
            this.rankingTitle,
            divider,
            ...this.rankingTexts,
        ]);

        this.rankingContainer.setDepth(9999);
    }

    private updateHUDPosition(width: number) {
        this.foodPanel?.setPosition(width - 220, 20);
        this.rankingContainer?.setPosition(width - 330, 110);
    }

    /**
     * 서버로부터 받은 랭킹 데이터로 UI를 업데이트합니다.
     */
    public updateRanking(rankingData: RankingData) {
        if (!this.rankingTexts || this.rankingTexts.length === 0) {
            return;
        }

        // 모든 랭킹 텍스트를 초기화
        this.rankingTexts.forEach((text) => {
            text.setText("");
            text.setColor("#ffffff");
        });

        // 랭킹 데이터로 텍스트 업데이트
        rankingData.rankings.forEach((entry, index) => {
            if (index < this.rankingTexts.length) {
                const rankText = this.rankingTexts[index];

                // 랭킹에 따른 색상 설정
                const rankDecorations: { [key: number]: { color: string; medal: string } } = {
                    1: { color: "#00ff88", medal: "01" },
                    2: { color: "#84b4ff", medal: "02" },
                    3: { color: "#ffd166", medal: "03" },
                };

                const decoration = rankDecorations[entry.rank];
                const color = decoration ? decoration.color : "#ffffff";
                const medal = decoration ? decoration.medal : `${entry.rank}. `;

                // 닉네임이 너무 길면 줄임
                const maxNicknameLength = 12;
                const displayName =
                    entry.nickname.length > maxNicknameLength
                        ? entry.nickname.substring(0, maxNicknameLength) + "..."
                        : entry.nickname;

                rankText.setText(`${medal}  ${displayName}  •  ${entry.score.toLocaleString()}`);
                rankText.setColor(color);
            }
        });

        // 빈 슬롯에는 대기 메시지 표시
        if (rankingData.rankings.length < 10) {
            for (let i = rankingData.rankings.length; i < this.rankingTexts.length; i++) {
                const rankNo = String(i + 1).padStart(2, "0");
                this.rankingTexts[i].setText(`${rankNo}  -`).setColor("#5f7396");
            }
        }
    }

    private createDebug() {
        // 개발 환경에서만 동작
        if (import.meta.env.MODE !== "development") return;
        this.debugText = this.add
            .text(20, 110, "", { font: "18px monospace", color: "#0f0", backgroundColor: "#222a" })
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
            this.foodValueText.setText(eatenCount.toLocaleString());
        } else {
            this.foodValueText.setText("0");
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

        this.debugText.setText(lines);
    }
}
