import Phaser from "phaser";
import type { GameServer } from "@beyondworm/shared";

const lobbyServerUrl: string = import.meta.env.VITE_LOBBY_SERVER_URL;

export default class LoginScene extends Phaser.Scene {
    private selectedServer: GameServer | null = null;

    constructor() {
        super({ key: "LoginScene" });
    }

    create() {
        const screenCenterX = this.cameras.main.width / 2;
        const screenCenterY = this.cameras.main.height / 2;

        // HTML 로그인 폼 생성
        const loginForm = `
            <div style="background-color: rgba(0,0,0,0.5); padding: 40px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <h1 style="color: white; font-size: 32px; margin: 0 0 10px 0;">BeyondWorm</h1>
                <input type="text" id="username-input" placeholder="Enter your ID" style="padding: 10px; font-size: 16px; width: 250px; border-radius: 5px; border: none;">
                
                <div id="server-list-container" style="width: 300px; color: white;">
                    <h2 style="font-size: 20px; margin-bottom: 10px;">Server List</h2>
                    <ul id="server-list" style="list-style: none; padding: 0; height: 150px; overflow-y: auto; border: 1px solid #555; border-radius: 5px;"></ul>
                </div>

                <button id="start-button" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #007bff; color: white; border: none; border-radius: 5px;">Start Game</button>
            </div>
        `;

        const formElement = this.add.dom(screenCenterX, screenCenterY).createFromHTML(loginForm);

        // 폼 요소에 대한 이벤트 리스너 설정
        const usernameInput = formElement.getChildByID("username-input") as HTMLInputElement;
        const startButton = formElement.getChildByID("start-button") as HTMLButtonElement;
        const serverListElement = formElement.getChildByID("server-list") as HTMLUListElement;

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

            // UIScene을 미리 실행해 둡니다.
            this.scene.launch("UIScene");

            // GameScene으로 전환(transition)을 시작합니다.
            this.scene.transition({
                target: "GameScene",
                duration: 500, // 0.5초 동안 전환
                moveBelow: true, // 전환하는 동안 LoginScene을 위로 유지
                onUpdate: (progress: number) => {
                    // progress는 0에서 1로 증가하는 값입니다.
                    const newAlpha = 1 - progress;
                    this.cameras.main.setAlpha(newAlpha);

                    // GameScene과 UIScene의 카메라 알파를 progress에 맞춰 올립니다.
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
