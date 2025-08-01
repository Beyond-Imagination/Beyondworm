import { Socket, Server as SocketIOServer } from "socket.io";
import { Worm, Food } from "@beyondworm/shared";
import { createPlayerWorm } from "../worm/factory";
import { validateAndProcessFoodEaten } from "../game/engine";
import { MovementStrategy } from "../types/movement";

/**
 * 플레이어 연결 시 초기화를 처리합니다.
 */
function handlePlayerConnection(
    socket: Socket,
    io: SocketIOServer,
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    manageBots: (
        worms: Map<string, Worm>,
        targetDirections: Map<string, { x: number; y: number }>,
        botMovementStrategies: Map<string, MovementStrategy>,
    ) => void,
): void {
    console.log("🔥 Client connected:", socket.id);

    // 새로운 플레이어 생성 및 초기 상태 설정
    const playerWorm = createPlayerWorm(socket.id);

    // 상태 저장
    worms.set(socket.id, playerWorm);
    targetDirections.set(socket.id, { x: playerWorm.direction.x, y: playerWorm.direction.y });

    // 봇 관리 (첫 플레이어가 들어오면 봇 생성)
    manageBots(worms, targetDirections, botMovementStrategies);

    // 클라이언트에게 초기 상태 전송
    socket.emit("init", {
        id: socket.id,
        worms: Array.from(worms.values()),
        foods: Array.from(foods.values()),
    });

    // 다른 클라이언트들에게 새 플레이어 알림
    socket.broadcast.emit("player-joined", {
        worm: playerWorm,
    });
}

/**
 * 플레이어 연결 해제를 처리합니다.
 */
function handlePlayerDisconnection(
    socket: Socket,
    io: SocketIOServer,
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    manageBots: (
        worms: Map<string, Worm>,
        targetDirections: Map<string, { x: number; y: number }>,
        botMovementStrategies: Map<string, MovementStrategy>,
    ) => void,
): void {
    console.log("👋 Client disconnected:", socket.id);

    // 상태 정리
    worms.delete(socket.id);
    targetDirections.delete(socket.id);

    // 봇 관리 (마지막 플레이어가 나가면 봇 제거)
    manageBots(worms, targetDirections, botMovementStrategies);

    // 다른 클라이언트들에게 플레이어 떠남 알림
    io.emit("player-left", socket.id);
}

/**
 * 플레이어 상태 업데이트를 처리합니다.
 */
function handleStateUpdate(
    socket: Socket,
    data: { x: number; y: number },
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
): void {
    const worm = worms.get(socket.id);
    if (worm) {
        // 방향 벡터를 정규화하여 목표 방향으로 설정
        const magnitude = Math.hypot(data.x, data.y);
        if (magnitude > 0) {
            targetDirections.set(socket.id, {
                x: data.x / magnitude,
                y: data.y / magnitude,
            });
        }
    }
}

/**
 * 스프린트 시작을 처리합니다.
 */
function handleSprintStart(socket: Socket, worms: Map<string, Worm>): void {
    const worm = worms.get(socket.id);
    if (worm) {
        worm.isSprinting = true;
    }
}

/**
 * 스프린트 중지를 처리합니다.
 */
function handleSprintStop(socket: Socket, worms: Map<string, Worm>): void {
    const worm = worms.get(socket.id);
    if (worm) {
        worm.isSprinting = false;
    }
}

/**
 * 클라이언트로부터 먹이 먹기 리포트를 처리합니다.
 */
function handleFoodEatenReport(
    socket: Socket,
    io: SocketIOServer,
    data: { foodId: string },
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
): void {
    // 클라이언트 리포트 기반으로 먹이 먹기 검증 및 처리
    const success = validateAndProcessFoodEaten(socket.id, data.foodId, worms, foods);

    if (success) {
        // 검증 성공 - 모든 클라이언트에게 먹이가 먹혔음을 알림
        io.emit("food-eaten", [{ wormId: socket.id, foodId: data.foodId }]);
    }
}

/**
 * 소켓 이벤트 핸들러들을 설정합니다.
 */
export function setupSocketHandlers(
    io: SocketIOServer,
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    manageBots: (
        worms: Map<string, Worm>,
        targetDirections: Map<string, { x: number; y: number }>,
        botMovementStrategies: Map<string, MovementStrategy>,
    ) => void,
): void {
    io.on("connection", (socket: Socket) => {
        // 플레이어 연결 처리
        handlePlayerConnection(socket, io, worms, foods, targetDirections, botMovementStrategies, manageBots);

        // 연결 해제 이벤트
        socket.on("disconnect", () => {
            handlePlayerDisconnection(socket, io, worms, targetDirections, botMovementStrategies, manageBots);
        });

        // 상태 업데이트 이벤트
        socket.on("update-state", (data: { x: number; y: number }) => {
            handleStateUpdate(socket, data, worms, targetDirections);
        });

        // 먹이 먹기 리포트 이벤트 (리포트 기반 처리)
        socket.on("food-eaten-report", (data: { foodId: string }) => {
            handleFoodEatenReport(socket, io, data, worms, foods);
        });

        // 스프린트 이벤트들
        socket.on("sprint-start", () => {
            handleSprintStart(socket, worms);
        });

        socket.on("sprint-stop", () => {
            handleSprintStop(socket, worms);
        });
    });
}
