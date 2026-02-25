import Phaser from "phaser";
import type { GameServer } from "@beyondworm/shared";

const lobbyServerUrl: string = import.meta.env.VITE_LOBBY_SERVER_URL;

export default class LoginScene extends Phaser.Scene {
    private selectedServer: GameServer | null = null;
    private backdrop?: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: "LoginScene" });
    }

    preload() {
        // HTML 폼을 로드합니다.
        this.load.html("loginform", `loginform.html`);
    }

    create() {
        const screenCenterX = this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.height / 2;
        this.cameras.main.setBackgroundColor("#060d1a");
        this.drawBackdrop();

        const loginDom = this.add.dom(screenCenterX, screenCenterY).createFromCache("loginform");
        loginDom.setDepth(100);

        // 폼 요소에 대한 이벤트 리스너 설정
        const usernameInput = loginDom.getChildByID("username-input") as HTMLInputElement;
        const startButton = loginDom.getChildByID("start-button") as HTMLButtonElement;
        const serverListElement = loginDom.getChildByID("server-list") as HTMLUListElement;

        startButton.addEventListener("click", () => {
            if (!this.selectedServer) {
                alert("서버를 선택해주세요.");
                return;
            }

            const username = usernameInput.value.trim();
            if (!username) {
                alert("유저 이름을 입력해주세요.");
                usernameInput.focus();
                return;
            }
            this.game.registry.set("username", username);
            this.game.registry.set("serverAddress", this.selectedServer.address);

            // UIScene 실행 및 GameScene 전환
            this.scene.launch("UIScene");
            this.scene.transition({
                target: "GameScene",
                duration: 500,
                moveBelow: true,
                onUpdate: (progress: number) => {
                    const newAlpha = 1 - progress;
                    this.cameras.main.setAlpha(newAlpha);
                    const gameScene = this.scene.get("GameScene");
                    const uiScene = this.scene.get("UIScene");
                    if (gameScene && uiScene) {
                        gameScene.cameras.main.setAlpha(progress);
                        uiScene.cameras.main.setAlpha(progress);
                    }
                },
            });
        });

        // 서버 목록 가져오기 및 UI 업데이트
        this.fetchAndDisplayServers(serverListElement);

        this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
            loginDom.setPosition(gameSize.width / 2, gameSize.height / 2);
            this.drawBackdrop(gameSize.width, gameSize.height);
        });
    }

    private drawBackdrop(width: number = this.cameras.main.width, height: number = this.cameras.main.height) {
        const w = width;
        const h = height;
        const centerX = w * 0.5;
        const centerY = h * 0.5;

        this.backdrop?.destroy();
        const background = this.add.graphics().setDepth(0);
        this.backdrop = background;
        background.fillStyle(0x060d1a, 1);
        background.fillRect(0, 0, w, h);

        background.fillStyle(0x0b1b33, 0.45);
        background.fillCircle(centerX, centerY, Math.max(w, h) * 0.45);

        background.lineStyle(1, 0x33557f, 0.22);
        const grid = 52;
        for (let x = 0; x <= w; x += grid) {
            background.lineBetween(x, 0, x, h);
        }
        for (let y = 0; y <= h; y += grid) {
            background.lineBetween(0, y, w, y);
        }
    }

    private async fetchAndDisplayServers(serverListElement: HTMLUListElement) {
        try {
            const response = await fetch(`${lobbyServerUrl}/servers`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const serversJson: Record<string, GameServer> = await response.json();
            const serverMap = new Map<string, GameServer>(Object.entries(serversJson));

            if (serverMap.size > 0) {
                this.updateServerListUI(serverMap, serverListElement);
            } else {
                serverListElement.innerHTML = '<li class="server-empty">No active servers right now.</li>';
            }
        } catch (error) {
            console.error("Failed to fetch server list:", error);
            serverListElement.innerHTML = '<li class="server-empty server-error">Failed to load server list.</li>';
        }
    }

    private updateServerListUI(serverMap: Map<string, GameServer>, serverListElement: HTMLUListElement) {
        serverListElement.innerHTML = ""; // 기존 목록 삭제

        serverMap.forEach((server, name) => {
            const listItem = document.createElement("li");
            listItem.className = "server-item";
            listItem.textContent = `${name}  •  ${server.playerCount} online`;

            listItem.addEventListener("click", () => {
                this.selectedServer = server;
                // 선택된 항목 강조
                serverListElement.querySelectorAll("li").forEach((li) => {
                    li.classList.remove("selected");
                });
                listItem.classList.add("selected");
            });
            serverListElement.appendChild(listItem);
        });
    }
}
