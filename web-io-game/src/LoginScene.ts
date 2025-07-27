import Phaser from "phaser";
import type { GameServer } from "@beyondworm/shared";

const lobbyServerUrl: string = import.meta.env.VITE_LOBBY_SERVER_URL;

export default class LoginScene extends Phaser.Scene {
    private selectedServer: GameServer | null = null;

    constructor() {
        super({ key: "LoginScene" });
    }

    preload() {
        // HTML 폼을 로드합니다.
        this.load.html('loginform', 'src/loginform.html');
    }

    create() {
        const screenCenterX = this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.height / 2;

        const loginDom = this.add.dom(screenCenterX, screenCenterY).createFromCache('loginform');

        // 폼 요소에 대한 이벤트 리스너 설정
        const usernameInput = loginDom.getChildByID("username-input") as HTMLInputElement;
        const startButton = loginDom.getChildByID("start-button") as HTMLButtonElement;
        const serverListElement = loginDom.getChildByID("server-list") as HTMLUListElement;

        startButton.addEventListener("click", () => {
            // TODO: 로비 서버 구현 후, 수정
            // if (!this.selectedServer) {
            //     alert("서버를 선택해주세요.");
            //     return;
            // }

            const username = usernameInput.value.trim();
            if (!username) {
                alert("유저 이름을 입력해주세요.");
                usernameInput.focus();
                return;
            }
            this.game.registry.set("username", username);
            // TODO: 로비 서버 구현 후, 수정
            // this.game.registry.set("serverAddress", this.selectedServer.address);

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
                serverListElement.innerHTML = '<li style="padding: 10px;">실행 중인 서버가 없습니다.</li>';
            }
        } catch (error) {
            console.error("Failed to fetch server list:", error);
            serverListElement.innerHTML =
                '<li style="padding: 10px; color: #ff5555;">서버 목록을 불러오는데 실패했습니다.</li>';
        }
    }

    private updateServerListUI(serverMap: Map<string, GameServer>, serverListElement: HTMLUListElement) {
        serverListElement.innerHTML = ""; // 기존 목록 삭제

        serverMap.forEach((server, name) => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `<span>${name} - ${server.playerCount}명 접속 중</span>`;
            listItem.style.cssText = "padding: 10px; border-bottom: 1px solid #444; cursor: pointer;";

            listItem.addEventListener("click", () => {
                this.selectedServer = server;
                // 선택된 항목 강조
                serverListElement.querySelectorAll("li").forEach((li) => {
                    (li as HTMLElement).style.backgroundColor = "transparent";
                });
                listItem.style.backgroundColor = "#007bff";
            });
            serverListElement.appendChild(listItem);
        });
    }
}
