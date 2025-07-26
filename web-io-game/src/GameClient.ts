import { io, Socket } from "socket.io-client";
import GameScene from "./GameScene";
import { GAME_CONSTANTS, Worm } from "@beyondworm/shared";

export default class GameClient {
    private socket: Socket;
    private directionSender: NodeJS.Timeout | null = null; // 타이머 ID 저장 변수

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

        this.socket.on("init", (data: { id: string; worms: Worm[] }) => {
            console.log("--- init ---");
            console.log("My ID:", data.id);
            console.log("All worms:", data.worms);
            console.log("TICK_MS:", GAME_CONSTANTS.TICK_MS);

            this.scene.initializeFromServer(data.id, data.worms);
        });

        this.socket.on("player-joined", (data: { worm: Worm }) => {
            console.log("Player joined:", data);
            // 새 플레이어가 접속했을 때 처리
            this.scene.addWormFromServer(data.worm);
        });

        this.socket.on("player-left", (playerId: string) => {
            console.log("Player left:", playerId);
            // 플레이어가 나갔을 때 처리
            this.scene.removeWormFromServer(playerId);
        });

        this.socket.on("state-update", (worms: Worm[]) => {
            // 서버로부터 받은 모든 지렁이 상태로 업데이트
            this.scene.updateWormsFromServer(worms);
        });

        this.socket.on("disconnect", () => {});

        this.socket.on("connect_error", (error) => {
            console.error("❌ Connection error:", error);
        });
    }

    /**
     * 주기적으로 플레이어의 방향 벡터를 서버로 전송합니다.
     */
    public startSendingDirection() {
        // 기존 타이머가 있다면 중복 실행 방지
        if (this.directionSender) {
            clearInterval(this.directionSender);
        }

        this.directionSender = setInterval(() => {
            if (this.scene.getPlayerDirection) {
                const direction = this.scene.getPlayerDirection();
                if (direction) {
                    this.socket.emit("update-state", { x: direction.x, y: direction.y });
                }
            }
        }, GAME_CONSTANTS.TICK_MS);
    }

    /**
     * 스프린트 시작을 서버에 알림
     */
    public startSprint() {
        this.socket.emit("sprint-start");
    }

    /**
     * 스프린트 끝을 서버에 알림
     */
    public stopSprint() {
        this.socket.emit("sprint-stop");
    }

    /**
     * 클라이언트의 모든 리소스를 정리하고 연결을 해제합니다.
     */
    public disconnect() {
        // 1. setInterval 타이머 정리
        if (this.directionSender) {
            clearInterval(this.directionSender);
            this.directionSender = null;
        }

        // 2. 소켓 연결 해제
        if (this.socket.connected) {
            this.socket.disconnect();
        }
    }
}
