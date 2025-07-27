import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { GAME_CONSTANTS, Player } from "@beyondworm/shared";

dotenv.config(); // .env 로드

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN }, // .env 파일에 CORS_ORIGIN="http://your.frontend.domain" 형식으로 설정
});

/**
 * 현재 접속해 있는 모든 플레이어의 상태를 저장합니다.
 * Key: socket.id, Value: PlayerState
 */
const players = new Map<string, Player>();

// --- Socket.IO 이벤트 핸들러 --------------------------------------------------

io.on("connection", (socket: Socket) => {
    console.log("🔥 Client connected:", socket.id);

    // 1. 새로운 플레이어 생성 및 초기 상태 설정
    const newPlayer: Player = {
        id: socket.id,
        nickname: "test",
        score: 123,
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
            // 방향 벡터를 정규화하여 지렁이의 방향을 업데이트합니다.
            const magnitude = Math.hypot(data.x, data.y);
            if (magnitude > 0) {
                player.worm.direction.x = data.x / magnitude;
                player.worm.direction.y = data.y / magnitude;
            }
        }
    });
});

let lastTickTime = Date.now();

/**
 * 주기적으로 게임 세계의 상태를 업데이트하고 모든 클라이언트에게 전송합니다.
 * 재귀적 setTimeout을 사용하여 `setInterval`보다 안정적인 시간 간격을 제공합니다.
 */
function gameLoop(): void {
    const now = Date.now();
    const deltaTime = (now - lastTickTime) / 1000; // 델타 타임을 초 단위로 계산
    lastTickTime = now;

    updateWorld(deltaTime);
    io.emit("state-update", Array.from(players.values()));

    // 다음 루프를 스케줄링합니다.
    setTimeout(gameLoop, GAME_CONSTANTS.TICK_MS);
}

/**
 * 게임 세계의 상태를 업데이트합니다.
 * @param deltaTime 이전 프레임과의 시간 차이 (초 단위)
 */
function updateWorld(deltaTime: number): void {
    for (const player of players.values()) {
        const dirX = player.worm.direction.x;
        const dirY = player.worm.direction.y;
        const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);

        // 방향 벡터가 0이 아닐 경우에만 이동 처리 (정규화하여 속도 유지)
        if (magnitude > 0) {
            const normalizedDirX = dirX / magnitude;
            const normalizedDirY = dirY / magnitude;

            // 위치 업데이트. GAME_CONSTANTS.HEAD_SPEED는 @beyondworm/shared에 정의되어 있어야 합니다.
            player.worm.x += normalizedDirX * GAME_CONSTANTS.HEAD_SPEED * deltaTime;
            player.worm.y += normalizedDirY * GAME_CONSTANTS.HEAD_SPEED * deltaTime;
        }
    }
}

// 게임 루프 시작
gameLoop();

httpServer.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
