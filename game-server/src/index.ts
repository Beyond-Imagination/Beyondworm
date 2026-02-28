import dotenv from "dotenv";
import express from "express";
import { createServer, Server } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { GAME_CONSTANTS, Worm, BotType, Food, WormType, RankingData, RankingEntry } from "@beyondworm/shared";
import { MovementStrategy } from "./types/movement";
import { createBotWorm, createMovementStrategy } from "./worm/factory";
import {
    updateWorld,
    updateFoods,
    handleBotFoodCollisions,
    handleWormCollisions,
    handleSprintFoodDrop,
    handleKilledWorms,
    handleMapBoundaryExceedingWorms,
    initializePositionHistory,
} from "./game/engine";
import { setupSocketHandlers } from "./socket/handlers";
import { registerWithLobby } from "./lobby/lobbyApi";

dotenv.config(); // .env 로드

const PORT = Number(process.env.PORT ?? 3001);

/**
 * Express 앱을 설정합니다.
 */
function setupExpressApp(): express.Application {
    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get("/health", (req, res) => {
        res.status(200).json({ status: "ok" });
    });

    return app;
}

/**
 * Socket.IO 서버를 생성합니다.
 */
function createSocketIOServer(httpServer: Server): SocketIOServer {
    const corsOriginList = process.env.CORS_ALLOWED_ORIGINS
        ? process.env.CORS_ALLOWED_ORIGINS.split(",")
        : ["http://localhost:5173"]; // 개발용 기본값
    console.log("CORS_ALLOWED_ORIGINS:", corsOriginList);
    return new SocketIOServer(httpServer, {
        cors: {
            origin: corsOriginList,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });
}

/**
 * 봇들을 초기화합니다.
 * @returns 생성된 봇 목록
 */
function initializeBots(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    positionHistories: Map<string, { x: number; y: number }[]>,
): Worm[] {
    const createdBots: Worm[] = [];

    for (let i = 0; i < GAME_CONSTANTS.BOT_COUNT; i++) {
        const botTypeCount = Object.keys(BotType).length / 2;
        const botType = Math.floor(Math.random() * botTypeCount) as BotType;
        const bot = createBotWorm(botType);

        worms.set(bot.id, bot);
        targetDirections.set(bot.id, { x: bot.direction.x, y: bot.direction.y });
        botMovementStrategies.set(bot.id, createMovementStrategy(botType));
        positionHistories.set(bot.id, initializePositionHistory(bot));

        createdBots.push(bot);
    }

    return createdBots;
}

/**
 * 모든 봇들을 제거합니다.
 */
function removeAllBots(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    positionHistories: Map<string, { x: number; y: number }[]>,
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
        positionHistories.delete(botId);
    }

    console.log(`🤖 Removed ${botIds.length} bots - no players online`);
}

/**
 * 플레이어가 있는지 확인하고 필요에 따라 봇을 관리합니다.
 * @returns 새로 생성된 봇 목록
 */
function manageBots(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    positionHistories: Map<string, { x: number; y: number }[]>,
    playerCount: number,
): Worm[] {
    let botCount = 0;
    for (const worm of worms.values()) {
        if (worm.type === WormType.Bot) {
            botCount++;
        }
    }

    if (playerCount === 0) {
        // 서버에 연결된 플레이어가 없으면 모든 봇 제거
        if (botCount > 0) {
            removeAllBots(worms, targetDirections, botMovementStrategies, positionHistories);
        }
        return [];
    } else if (botCount === 0) {
        // 플레이어가 있는데 봇이 없으면 봇 생성
        console.log(`🤖 Creating bots - ${playerCount} players online`);
        return initializeBots(worms, targetDirections, botMovementStrategies, positionHistories);
    }

    return [];
}

/**
 * 현재 지렁이들의 랭킹을 계산합니다.
 */
function calculateRankings(worms: Map<string, Worm>): RankingData {
    // 살아있는 지렁이들만 필터링하고 점수 순으로 정렬
    const aliveWorms = Array.from(worms.values())
        .filter((worm) => !worm.isDead)
        .sort((a, b) => b.score - a.score);

    // TOP 10만 선택하고 랭킹 데이터 생성
    const rankings: RankingEntry[] = aliveWorms.slice(0, 10).map((worm, index) => ({
        id: worm.id,
        nickname: worm.nickname,
        score: worm.score,
        rank: index + 1,
    }));

    return { rankings };
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
    positionHistories: Map<string, { x: number; y: number }[]>,
): void {
    // 봇 관리 (주기적으로 체크) - 새로 생성된 봇들 수집
    const newlyCreatedBots = manageBots(
        worms,
        targetDirections,
        botMovementStrategies,
        positionHistories,
        io.engine.clientsCount,
    );

    // 먹이 업데이트 (부족한 먹이 추가)
    updateFoods(foods);

    // 부활 처리 및 제거된 플레이어 수집
    const removedPlayerIds = handleKilledWorms(worms, targetDirections, botMovementStrategies, positionHistories);

    // 스프린트 중 먹이 떨어뜨리기 처리
    handleSprintFoodDrop(worms, foods, deltaTime);

    // 지렁이 상태 업데이트
    updateWorld(deltaTime, worms, foods, targetDirections, botMovementStrategies, positionHistories);

    // 맵 경계 초과 지렁이 처리
    const mapBoundaryExceedingWorms = handleMapBoundaryExceedingWorms(worms, foods);

    // 서버에서 직접 모든 지렁이 간의 충돌 감지 및 처리
    const wormCollisions = handleWormCollisions(worms, foods);

    // 봇들의 먹이 충돌 처리 (봇은 리포트할 수 없으므로 서버에서 직접 처리)
    const botCollisions = handleBotFoodCollisions(worms, foods);

    // 랭킹 계산
    const rankingData = calculateRankings(worms);

    // 1. 새로 생성된 봇들 알림
    for (const bot of newlyCreatedBots) {
        io.emit("player-joined", { worm: bot });
    }

    // 2. 제거된 플레이어들에 대한 알림
    for (const playerId of removedPlayerIds) {
        io.emit("player-left", playerId);
    }

    // 3. 맵 경계 초과로 죽은 지렁이들 알림
    for (const wormId of mapBoundaryExceedingWorms) {
        io.emit("worm-died", { killedWormId: wormId, killerWormId: null });
    }

    // 4. 지렁이 충돌 알림
    for (const collision of wormCollisions) {
        io.emit("worm-died", collision);
    }

    // 5. 봇이 먹이를 먹었다는 알림
    if (botCollisions.length > 0) {
        io.emit("food-eaten", botCollisions);
    }

    // 6. 게임 상태와 랭킹 전송
    io.emit("state-update", {
        worms: Array.from(worms.values()),
        foods: Array.from(foods.values()),
        ranking: rankingData,
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
    positionHistories: Map<string, { x: number; y: number }[]>,
): () => void {
    let lastTickTime = Date.now();

    function gameLoop(): void {
        const now = Date.now();
        const deltaTime = (now - lastTickTime) / 1000;
        lastTickTime = now;

        updateAndBroadcastGameState(
            io,
            deltaTime,
            worms,
            foods,
            targetDirections,
            botMovementStrategies,
            positionHistories,
        );

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
 * 서버 종료 시그널 처리
 * 예: SIGINT (Ctrl+C), SIGTERM
 * 필요한 정리 작업을 수행합니다.
 * 예: DB 연결 종료, 열린 리소스 해제 등
 * 그 후 프로세스를 종료합니다.
 */
// --- 메인 서버 초기화 ---

async function main() {
    // 1. 로비 서버에 등록
    await registerWithLobby();

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

    /**
     * 각 지렁이의 경로 기록을 저장하는 맵 (path-following용)
     * Key: wormId, Value: 경로 기록 배열 (과거 → 최신 순서)
     */
    const positionHistories = new Map<string, { x: number; y: number }[]>();

    // Socket.IO 이벤트 핸들러 설정
    setupSocketHandlers(io, worms, foods, targetDirections, positionHistories);

    // 게임 루프 시작
    const gameLoop = createGameLoop(io, worms, foods, targetDirections, botMovementStrategies, positionHistories);
    gameLoop();

    // 서버 종료 시그널 처리
    async function gracefulShutdown() {
        // async 추가
        console.log("Shutting down game server...");
        try {
            // io.close()가 호출될 때, Socket.IO가 내부적으로 연결된 httpServer까지 함께 종료하므로 io만 닫아도 충분.
            await new Promise<void>((resolve, reject) => {
                io.close((err) => {
                    if (err) {
                        console.error("Error closing Socket.IO server:", err);
                        return reject(err);
                    }
                    console.log("Socket.IO server closed.");
                    resolve();
                });
            });
            process.exit(0); // 모든 종료 작업 완료 후 프로세스 종료
        } catch (error) {
            console.error("Error during graceful shutdown:", error);
            process.exit(1); // 오류 발생 시 프로세스 종료
        } finally {
            // 혹시나 process.exit(0)이 동작하지 않았을 경우를 대비한 강제종료 타이머
            setTimeout(() => {
                console.error("Forcing shutdown after timeout.");
                process.exit(1);
            }, 10000); // 10초 후 강제 종료
        }
    }

    // process.on에 연결할 때 void를 사용하여 Promise가 처리되지 않음을 명시
    process.on("SIGINT", () => {
        void gracefulShutdown();
    });
    process.on("SIGTERM", () => {
        void gracefulShutdown();
    });

    httpServer.listen(PORT, () => {
        console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
}

(async () => {
    await main();
})().catch((error) => {
    console.error("Unhandled error at top level:", error);
    process.exit(1);
});
