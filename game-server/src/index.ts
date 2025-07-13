import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { GAME_CONSTANTS } from "@beyondworm/shared";

dotenv.config(); // .env 로드

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN }, // .env 파일에 CORS_ORIGIN="http://your.frontend.domain" 형식으로 설정
});

/**
 * 서버에서 관리할 플레이어의 상태 정보입니다.
 */
interface PlayerState {
    id: string;
    worm: {
        x: number;
        y: number;
        direction: { x: number; y: number }; // 지렁이의 현재 방향 벡터
    };
}

/**
 * 현재 접속해 있는 모든 플레이어의 상태를 저장합니다.
 * Key: socket.id, Value: PlayerState
 */
const players = new Map<string, PlayerState>();

// --- Socket.IO 이벤트 핸들러 --------------------------------------------------

io.on("connection", (socket: Socket) => {
    console.log("🔥 Client connected:", socket.id);

    // 1. 새로운 플레이어 생성 및 초기 상태 설정
    const newPlayer: PlayerState = {
        id: socket.id,
        worm: {
            x: Math.floor(Math.random() * (GAME_CONSTANTS.MAP_WIDTH - 100)) + 100,
            y: Math.floor(Math.random() * (GAME_CONSTANTS.MAP_HEIGHT - 100)) + 100,
            direction: { x: 1, y: 0 },
        },
    };

    players.set(socket.id, newPlayer);

    socket.emit("init", {
        id: socket.id,
        players: Array.from(players.values()),
    });

    socket.broadcast.emit("player-joined", newPlayer);

    socket.on("disconnect", () => {
        console.log("👋 Client disconnected:", socket.id);
        players.delete(socket.id);
        io.emit("player-left", socket.id);
    });

    // 클라이언트로부터 방향 업데이트 수신
    socket.on("update-state", (data: { x: number; y: number }) => {
        const player = players.get(socket.id);
        if (player) {
            player.worm.direction.x = data.x;
            player.worm.direction.y = data.y;
        }
    });
});

/**
 * 주기적으로 게임 세계의 상태를 업데이트하고 모든 클라이언트에게 전송합니다.
 */
function gameLoop(): void {
    updateWorld(GAME_CONSTANTS.dt);
    io.emit("state-update", Array.from(players.values()));
}

/**
 * 게임 세계의 상태를 업데이트합니다.
 */
function updateWorld(deltaTime: number): void {
    for (const player of players.values()) {
        // 위치 업데이트
        player.worm.x += player.worm.direction.x * GAME_CONSTANTS.HEAD_SPEED * deltaTime;
        player.worm.y += player.worm.direction.y * GAME_CONSTANTS.HEAD_SPEED * deltaTime;
    }
}

setTimeout(gameLoop, GAME_CONSTANTS.TICK_MS);

httpServer.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
