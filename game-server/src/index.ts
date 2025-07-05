import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketIOServer, Socket } from "socket.io";

dotenv.config(); // .env 로드

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN }, // .env 파일에 CORS_ORIGIN="http://your.frontend.domain" 형식으로 설정
});

io.on("connection", (socket: Socket) => {
    console.log("🔥 Client connected", socket.id);

    // init이라는 키를 클라이언트가 listen하고 있으면 초기 정보 전송
    // listen하는 시간을 고려하여 약간의 딜레이를 줌
    setTimeout(() => socket.emit("init", { id: socket.id }), 100);

    socket.on("disconnect", () => {
        console.log("disconnected", socket.id);
    });
});

const TICK_MS = 1000 / 60;

setTimeout(gameLoop, TICK_MS);

function gameLoop(): void {
    updateWorld();
    // io.emit('state', world); // 모든 클라이언트에 상태 브로드캐스트
}

// 월드 상태 갱신 (TODO: 실제 충돌·이동 로직)
function updateWorld(): void {
    // 예: world.players 위치·길이 업데이트, food 리스폰 등
}

httpServer.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
