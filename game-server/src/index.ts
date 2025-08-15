import dotenv from "dotenv";
import express from "express";
import { createServer, Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { GAME_CONSTANTS, Worm, BotType, Food, WormType } from "@beyondworm/shared";
import { MovementStrategy } from "./types/movement";
import { createBotWorm, createMovementStrategy } from "./worm/factory";
import {
    updateWorld,
    updateFoods,
    handleBotFoodCollisions,
    handleWormCollisions,
    handleSprintFoodDrop,
    handleKilledWorms,
} from "./game/engine";
import { setupSocketHandlers } from "./socket/handlers";

dotenv.config(); // .env 로드

const PORT = Number(process.env.PORT ?? 3001);

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
    console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN);
    return new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN, // .env 파일에 CORS_ORIGIN="http://your.frontend.domain" 형식으로 설정
            methods: ["GET", "POST"],
            credentials: true,
        },
    });
}

/**
 * 봇들을 초기화합니다.
 */
function initializeBots(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    io: SocketIOServer,
): void {
    for (let i = 0; i < GAME_CONSTANTS.BOT_COUNT; i++) {
        const botTypeCount = Object.keys(BotType).length / 2;
        const botType = Math.floor(Math.random() * botTypeCount) as BotType;
        const bot = createBotWorm(botType);

        worms.set(bot.id, bot);
        targetDirections.set(bot.id, { x: bot.direction.x, y: bot.direction.y });
        botMovementStrategies.set(bot.id, createMovementStrategy(botType));

        io.emit("player-joined", {
            worm: bot,
        });
    }
}

/**
 * 모든 봇들을 제거합니다.
 */
function removeAllBots(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
): void {
    const botIds: string[] = [];

    // 봇 ID들을 먼저 수집
    for (const [id, worm] of worms.entries()) {
        if (worm.type === WormType.Bot) {
            botIds.push(id);
        }
    }

    // 수집된 봇 ID들을 제거
    for (const botId of botIds) {
        worms.delete(botId);
        targetDirections.delete(botId);
        botMovementStrategies.delete(botId);
    }

    console.log(`🤖 Removed ${botIds.length} bots - no players online`);
}

/**
 * 플레이어가 있는지 확인하고 필요에 따라 봇을 관리합니다.
 */
function manageBots(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    io: SocketIOServer,
): void {
    const playerCount = io.engine.clientsCount;
    let botCount = 0;
    for (const worm of worms.values()) {
        if (worm.type === WormType.Bot) {
            botCount++;
        }
    }

    if (playerCount === 0) {
        // 서버에 연결된 플레이어가 없으면 모든 봇 제거
        if (botCount > 0) {
            removeAllBots(worms, targetDirections, botMovementStrategies);
        }
    } else if (botCount === 0) {
        // 플레이어가 있는데 봇이 없으면 봇 생성
        console.log(`🤖 Creating bots - ${playerCount} players online`);
        initializeBots(worms, targetDirections, botMovementStrategies, io);
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
    // 봇 관리 (주기적으로 체크)
    manageBots(worms, targetDirections, botMovementStrategies, io);

    // 먹이 업데이트 (부족한 먹이 추가)
    updateFoods(foods);

    // 부활 처리
    handleKilledWorms(worms, targetDirections, botMovementStrategies, io);

    // 스프린트 중 먹이 떨어뜨리기 처리
    handleSprintFoodDrop(worms, foods, deltaTime);

    // 지렁이 상태 업데이트
    updateWorld(deltaTime, worms, foods, targetDirections, botMovementStrategies);

    // 서버에서 직접 모든 지렁이 간의 충돌 감지 및 처리
    const wormCollisions = handleWormCollisions(worms, foods);

    // 지렁이 충돌이 발생했다면 클라이언트들에게 알림
    if (wormCollisions.length > 0) {
        for (const collision of wormCollisions) {
            io.emit("worm-died", collision);
        }
    }

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

        let nextSleepTime = GAME_CONSTANTS.TICK_MS - (Date.now() - lastTickTime); // 다음 틱까지 대기 시간 계산
        if (nextSleepTime < 0) {
            nextSleepTime = 0; // 음수일 경우 0으로 설정
        }
        // 다음 루프를 스케줄링합니다.
        setTimeout(gameLoop, nextSleepTime);
    }

    return gameLoop;
}

/**
 * 로비 서버에 게임 서버를 등록합니다.
 */
async function registerToLobbyServer() {
    const lobbyUrl = process.env.LOBBY_SERVER_URL || "http://localhost:3000";
    const serverId = "game-server-1";
    const address = `http://localhost:${PORT}`;

    try {
        const res = await fetch(`${lobbyUrl}/server/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serverId, address }),
        });
        const data = await res.json();
        console.log("Lobby 등록 결과:", data);
        return true;
    } catch (err) {
        console.error("Lobby 등록 실패:", err);
        return false;
    }
}

// --- 메인 서버 초기화 ---

async function main() {
    // 1. 로비 서버에 등록 시도
    const registered = await registerToLobbyServer();
    if (!registered) {
        console.error("로비 서버 등록에 실패하여 서버를 시작하지 않습니다.");
        process.exit(1);
    }

    // 2. 서버 초기화
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

    // Socket.IO 이벤트 핸들러 설정
    setupSocketHandlers(io, worms, foods, targetDirections);

    // 게임 루프 시작
    const gameLoop = createGameLoop(io, worms, foods, targetDirections, botMovementStrategies);
    gameLoop();

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
}

void main();
