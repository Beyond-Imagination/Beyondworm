import dotenv from "dotenv";
import express from "express";
import { createServer, Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { GAME_CONSTANTS, Worm, BotType, Food } from "@beyondworm/shared";
import { MovementStrategy } from "./types/movement";
import { createBotWorm, createMovementStrategy } from "./worm/factory";
import { updateWorld, updateFoods, handleBotFoodCollisions } from "./game/engine";
import { setupSocketHandlers } from "./socket/handlers";

dotenv.config(); // .env 로드

const PORT = Number(process.env.PORT ?? 3000);

/**
 * Express 앱을 설정합니다.
 */
function setupExpressApp(): express.Application {
    const app = express();
    app.use(express.json());
    return app;
}

/**
 * Socket.IO 서버를 생성합니다.
 */
function createSocketIOServer(httpServer: Server): SocketIOServer {
    return new SocketIOServer(httpServer, {
        cors: { origin: process.env.CORS_ORIGIN }, // .env 파일에 CORS_ORIGIN="http://your.frontend.domain" 형식으로 설정
    });
}

/**
 * 봇들을 초기화합니다.
 */
function initializeBots(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
): void {
    for (let i = 0; i < GAME_CONSTANTS.BOT_COUNT; i++) {
        const botTypeCount = Object.keys(BotType).length / 2;
        const botType = Math.floor(Math.random() * botTypeCount) as BotType;
        const bot = createBotWorm(botType);

        worms.set(bot.id, bot);
        targetDirections.set(bot.id, { x: bot.direction.x, y: bot.direction.y });
        botMovementStrategies.set(bot.id, createMovementStrategy(botType));
    }
}

/**
 * 게임 상태를 업데이트하고 클라이언트에게 전송합니다.
 */
function updateAndBroadcastGameState(
    io: SocketIOServer,
    deltaTime: number,
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
): void {
    // 먹이 업데이트 (부족한 먹이 추가)
    updateFoods(foods);

    // 지렁이 상태 업데이트
    updateWorld(deltaTime, worms, foods, targetDirections, botMovementStrategies);

    // 봇들의 먹이 충돌 처리 (봇은 리포트할 수 없으므로 서버에서 직접 처리)
    const botCollisions = handleBotFoodCollisions(worms, foods);

    // 봇이 먹이를 먹었다면 클라이언트들에게 알림
    if (botCollisions.length > 0) {
        io.emit("food-eaten", botCollisions);
    }

    // 클라이언트에게 게임 상태 전송
    io.emit("state-update", {
        worms: Array.from(worms.values()),
        foods: Array.from(foods.values()),
    });
}

/**
 * 게임 루프를 생성합니다.
 */
function createGameLoop(
    io: SocketIOServer,
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
): () => void {
    let lastTickTime = Date.now();

    function gameLoop(): void {
        const now = Date.now();
        const deltaTime = (now - lastTickTime) / 1000;
        lastTickTime = now;

        updateAndBroadcastGameState(io, deltaTime, worms, foods, targetDirections, botMovementStrategies);

        // 다음 루프를 스케줄링합니다.
        setTimeout(gameLoop, GAME_CONSTANTS.TICK_MS);
    }

    return gameLoop;
}

// --- 메인 서버 초기화 ---

const app = setupExpressApp();
const httpServer = createServer(app);
const io = createSocketIOServer(httpServer);

/**
 * 서버에서 관리하는 모든 지렁이들 (플레이어 + 봇)
 * Key: wormId, Value: Worm
 */
const worms = new Map<string, Worm>();

/**
 * 서버에서 관리하는 모든 먹이들
 * Key: foodId, Value: Food
 */
const foods = new Map<string, Food>();

/**
 * 각 지렁이의 목표 방향을 저장하는 맵
 * Key: wormId, Value: 목표 방향 (x, y)
 */
const targetDirections = new Map<string, { x: number; y: number }>();

/**
 * 각 봇의 움직임 전략을 저장하는 맵
 * Key: wormId, Value: MovementStrategy
 */
const botMovementStrategies = new Map<string, MovementStrategy>();

// 봇 초기화
initializeBots(worms, targetDirections, botMovementStrategies);

// Socket.IO 이벤트 핸들러 설정
setupSocketHandlers(io, worms, foods, targetDirections);

// 게임 루프 시작
const gameLoop = createGameLoop(io, worms, foods, targetDirections, botMovementStrategies);
gameLoop();

httpServer.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
