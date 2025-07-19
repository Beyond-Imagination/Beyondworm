import { GAME_CONSTANTS, Worm, WormType } from "@beyondworm/shared";
import { MovementStrategy } from "../types/movement";
import { getAngleDifference, vectorToAngle, angleToVector } from "../utils/math";

/**
 * 봇의 움직임 로직
 */
export function updateBotDirection(
    bot: Worm,
    allWorms: Worm[],
    botMovementStrategies: Map<string, MovementStrategy>,
    targetDirections: Map<string, { x: number; y: number }>,
): void {
    const strategy = botMovementStrategies.get(bot.id);
    if (strategy) {
        const newTargetDirection = strategy.update(bot, allWorms);

        // 새로운 목표 방향이 있으면 설정
        if (newTargetDirection) {
            targetDirections.set(bot.id, newTargetDirection);
        }
    }
}

/**
 * 지렁이의 방향을 부드럽게 회전시킵니다.
 */
function updateWormRotation(worm: Worm, targetDirection: { x: number; y: number }, deltaTime: number): void {
    const currentAngle = vectorToAngle(worm.direction.x, worm.direction.y);
    const targetAngle = vectorToAngle(targetDirection.x, targetDirection.y);
    const angleDiff = getAngleDifference(currentAngle, targetAngle);

    const maxTurnThisFrame = GAME_CONSTANTS.TURN_RATE * deltaTime;

    // 각도 차이가 작으면 즉시 적용, 크면 서서히 회전
    if (Math.abs(angleDiff) < maxTurnThisFrame) {
        // 목표 방향에 거의 도달했으므로 즉시 적용
        worm.direction.x = targetDirection.x;
        worm.direction.y = targetDirection.y;
    } else {
        // 서서히 회전
        const turnDirection = angleDiff > 0 ? 1 : -1;
        const newAngle = currentAngle + turnDirection * maxTurnThisFrame;
        const newDirection = angleToVector(newAngle);
        worm.direction.x = newDirection.x;
        worm.direction.y = newDirection.y;
    }
}

/**
 * 지렁이 머리의 위치를 업데이트합니다.
 */
function updateWormHead(worm: Worm, deltaTime: number): void {
    const dirX = worm.direction.x;
    const dirY = worm.direction.y;
    const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);

    // 방향 벡터가 0이 아닐 경우에만 이동 처리 (정규화하여 속도 유지)
    if (magnitude > 0) {
        const normalizedDirX = dirX / magnitude;
        const normalizedDirY = dirY / magnitude;

        const speed = worm.isSprinting ? GAME_CONSTANTS.HEAD_SPRINT_SPEED : GAME_CONSTANTS.HEAD_SPEED;

        // 머리 위치 업데이트
        const head = worm.segments[0];
        head.x += normalizedDirX * speed * deltaTime;
        head.y += normalizedDirY * speed * deltaTime;
    }
}

/**
 * 지렁이의 몸통 세그먼트들이 머리를 따라오도록 업데이트합니다.
 */
function updateWormSegments(worm: Worm): void {
    // 세그먼트들 따라오게 하기
    for (let i = 1; i < worm.segments.length; i++) {
        const prev = worm.segments[i - 1];
        const curr = worm.segments[i];

        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        const distance = Math.hypot(dx, dy);

        if (distance > GAME_CONSTANTS.SEGMENT_SPACING) {
            const moveX = (dx / distance) * (distance - GAME_CONSTANTS.SEGMENT_SPACING);
            const moveY = (dy / distance) * (distance - GAME_CONSTANTS.SEGMENT_SPACING);

            curr.x += moveX;
            curr.y += moveY;
        }
    }
}

/**
 * 개별 지렁이의 상태를 업데이트합니다.
 */
function updateSingleWorm(
    worm: Worm,
    deltaTime: number,
    targetDirections: Map<string, { x: number; y: number }>,
): void {
    // 부드러운 회전 로직 적용
    const targetDirection = targetDirections.get(worm.id);
    if (targetDirection) {
        updateWormRotation(worm, targetDirection, deltaTime);
    }

    // 머리 위치 업데이트
    updateWormHead(worm, deltaTime);

    // 몸통 세그먼트들 업데이트
    updateWormSegments(worm);
}

/**
 * 게임 세계의 상태를 업데이트합니다.
 * @param deltaTime 이전 프레임과의 시간 차이 (초 단위)
 * @param worms 모든 지렁이들의 맵
 * @param targetDirections 각 지렁이의 목표 방향 맵
 * @param botMovementStrategies 봇들의 움직임 전략 맵
 */
export function updateWorld(
    deltaTime: number,
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
): void {
    const allWorms = Array.from(worms.values());

    for (const worm of allWorms) {
        // 봇인 경우 AI 움직임 업데이트
        if (worm.type === WormType.Bot) {
            updateBotDirection(worm, allWorms, botMovementStrategies, targetDirections);
        }

        // 개별 지렁이 상태 업데이트
        updateSingleWorm(worm, deltaTime, targetDirections);
    }
}
