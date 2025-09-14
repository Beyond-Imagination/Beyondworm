import Phaser from "phaser";
import GameSettings from "./GameSettings";
import { GAME_CONSTANTS, RankingData } from "@beyondworm/shared";

export default class UIScene extends Phaser.Scene {
    private foodText!: Phaser.GameObjects.Text;
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
            .text(20, 20, `ID: ${username}`, { font: "24px Arial", color: "#fff", fontStyle: "bold" })
            .setOrigin(0, 0)
            .setStroke("#222", 4)
            .setShadow(2, 2, "#000", 4, true, true)
            .setDepth(10000);

        // 화면 오른쪽 위에 텍스트 표시
        this.foodText = this.add
            .text(this.scale.width - 40, 20, "🍎 0", { font: "32px Arial", color: "#fff", fontStyle: "bold" })
            .setOrigin(1, 0)
            .setStroke("#222", 6)
            .setShadow(4, 4, "#000", 8, true, true)
            .setAlpha(1)
            .setVisible(true)
            .setDepth(10000);

        // 랭킹 대시보드 생성
        this.createRankingDashboard();

        // 화면 크기 변경 시 위치 재조정
        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            this.foodText.setPosition(gameSize.width - 40, 20);
            this.updateRankingPosition(gameSize.width, gameSize.height);
        });

        // 디버그 UI는 별도 함수에서 관리
        if (import.meta.env.MODE === "development") {
            this.createDebug();
        }
    }

    /**
     * 랭킹 대시보드 UI를 생성합니다.
     */
    private createRankingDashboard() {
        const initialX = this.scale.width - 320;
        const initialY = 80;

        // 배경 그래픽 생성
        this.rankingBackground = this.add.graphics();
        this.rankingBackground.fillStyle(0x000000, 0.7);
        this.rankingBackground.lineStyle(2, 0xffffff, 0.8);
        this.rankingBackground.fillRoundedRect(0, 0, 300, 450, 10);
        this.rankingBackground.strokeRoundedRect(0, 0, 300, 450, 10);

        // 타이틀 텍스트
        this.rankingTitle = this.add
            .text(150, 20, "🏆 TOP 10 랭킹", {
                font: "bold 20px Arial",
                color: "#FFD700",
                align: "center",
            })
            .setOrigin(0.5, 0)
            .setStroke("#000", 3);

        // 랭킹 엔트리 텍스트들 생성 (최대 10개, 간격을 40px로 증가)
        this.rankingTexts = [];
        for (let i = 0; i < 10; i++) {
            const rankText = this.add
                .text(20, 60 + i * 40, "", {
                    font: "16px Arial",
                    color: "#ffffff",
                    align: "left",
                })
                .setOrigin(0, 0)
                .setStroke("#000", 2);
            this.rankingTexts.push(rankText);
        }

        // 컨테이너에 모든 요소 추가
        this.rankingContainer = this.add.container(initialX, initialY, [
            this.rankingBackground,
            this.rankingTitle,
            ...this.rankingTexts,
        ]);

        this.rankingContainer.setDepth(9999);
    }

    /**
     * 화면 크기 변경 시 랭킹 대시보드 위치를 업데이트합니다.
     */
    private updateRankingPosition(width: number) {
        if (this.rankingContainer) {
            this.rankingContainer.setPosition(width - 320, 80);
        }
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
                let color = "#ffffff";
                let medal = "";

                if (entry.rank === 1) {
                    color = "#FFD700"; // 금색
                    medal = "🥇 ";
                } else if (entry.rank === 2) {
                    color = "#C0C0C0"; // 은색
                    medal = "🥈 ";
                } else if (entry.rank === 3) {
                    color = "#CD7F32"; // 동색
                    medal = "🥉 ";
                } else {
                    medal = `${entry.rank}. `;
                }

                // 닉네임이 너무 길면 줄임
                const maxNicknameLength = 12;
                const displayName =
                    entry.nickname.length > maxNicknameLength
                        ? entry.nickname.substring(0, maxNicknameLength) + "..."
                        : entry.nickname;

                const text = `${medal}${displayName}`;
                const scoreText = `${entry.score}점`;

                rankText.setText(`${text}\n   ${scoreText}`);
                rankText.setColor(color);
            }
        });

        // 빈 슬롯에는 대기 메시지 표시
        if (rankingData.rankings.length < 10) {
            for (let i = rankingData.rankings.length; i < Math.min(5, this.rankingTexts.length); i++) {
                this.rankingTexts[i].setText(`${i + 1}. -`).setColor("#666666");
            }
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

        this.debugText.setText(lines);
    }
}
