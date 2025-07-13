import { io, Socket } from "socket.io-client";
import GameScene from "./GameScene";
import { GAME_CONSTANTS } from "@beyondworm/shared";

export default class GameClient {
    private socket: Socket;

    constructor(private scene: GameScene) {
        // .env 파일에 VITE_GAME_SERVER_URL="http://server.url:PORT" 형식으로 설정합니다.
        const gameServerUrl = import.meta.env.VITE_GAME_SERVER_URL || "http://localhost:3000";
        this.socket = io(gameServerUrl);

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.socket.on("connect", () => {
            console.log("✅ Connected to server!");
        });

        this.socket.on("init", (data) => {
            console.log("--- init ---");
            console.log("My ID:", data.id);
            console.log("All players:", data.players);
            console.log(GAME_CONSTANTS.TICK_MS);
        });

        this.socket.on("player-joined", (player) => {});

        this.socket.on("player-left", (playerId) => {});

        this.socket.on("state-update", (players) => {});

        this.socket.on("disconnect", () => {});
    }

    /**
     * 주기적으로 플레이어의 방향 벡터를 서버로 전송합니다.
     */
    public startSendingDirection() {
        setInterval(() => {
            if (this.scene.playerState) {
                const direction = this.scene.playerState.lastVel;
                this.socket.emit("update-state", { x: direction.x, y: direction.y });
            }
        }, GAME_CONSTANTS.TICK_MS);
    }
}
