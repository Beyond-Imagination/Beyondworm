import { GAME_CONSTANTS, Worm, WormType, Food, BotType } from "@beyondworm/shared";
import { MovementStrategy } from "../types/movement";
import { getAngleDifference, vectorToAngle, angleToVector } from "../utils/math";
import { v4 as uuidv4 } from "uuid";
import { createBotWorm, createMovementStrategy } from "../worm/factory";
import { Server as SocketIOServer } from "socket.io";

/**
 * 특정 위치에 먹이를 생성합니다.
 */
export function createFoodAtPosition(x: number, y: number): Food {
    return {
        id: `food_${uuidv4()}`,
        x: x,
        y: y,
        radius: GAME_CONSTANTS.FOOD_RADIUS,
        color: GAME_CONSTANTS.FOOD_COLOR,
    };
}

/**
 * 랜덤 먹이를 생성합니다.
 */
export function createRandomFood(): Food {
    return createFoodAtPosition(
        Math.random() * (GAME_CONSTANTS.MAP_WIDTH - 200) + 100,
        Math.random() * (GAME_CONSTANTS.MAP_HEIGHT - 200) + 100,
    );
}

/**
 * 먹이 목록을 업데이트합니다 (부족한 먹이를 추가).
 */
export function updateFoods(foods: Map<string, Food>): void {
    while (foods.size < GAME_CONSTANTS.MINIMUM_FOOD_COUNT) {
        const food = createRandomFood();
        foods.set(food.id, food);
    }
}

function updateWormRadius(worm: Worm): void {
    worm.radius = worm.score * GAME_CONSTANTS.SEGMENT_GROWTH_RADIUS + GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS;
}

/**
 * 지렁이가 먹이를 먹었을 때의 처리를 합니다.
 */
export function processFoodEaten(worm: Worm): void {
    // 점수 증가
    worm.score += 1;

    updateWormRadius(worm); // 반지름 업데이트

    // 새 세그먼트 추가
    const lastSegment = worm.segments[worm.segments.length - 1];
    worm.segments.push({
        x: lastSegment.x,
        y: lastSegment.y,
    });
}

/**
 * 봇의 움직임 로직
 */
export function updateBotDirection(
    bot: Worm,
    allWorms: Worm[],
    foods: Map<string, Food>,
    botMovementStrategies: Map<string, MovementStrategy>,
    targetDirections: Map<string, { x: number; y: number }>,
): void {
    const strategy = botMovementStrategies.get(bot.id);
    if (strategy) {
        const newTargetDirection = strategy.update(bot, allWorms, foods);

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

        // 스프린트 중이면서 점수가 0 이상일 때만 스프린트 속도 적용
        const speed = worm.isSprinting && worm.score > 0 ? GAME_CONSTANTS.HEAD_SPRINT_SPEED : GAME_CONSTANTS.HEAD_SPEED;

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
 * @param foods 모든 먹이들의 맵
 * @param targetDirections 각 지렁이의 목표 방향 맵
 * @param botMovementStrategies 봇들의 움직임 전략 맵
 */
export function updateWorld(
    deltaTime: number,
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
): void {
    const allWorms = Array.from(worms.values());

    for (const worm of allWorms) {
        // 봇인 경우 AI 움직임 업데이트
        if (worm.type === WormType.Bot) {
            updateBotDirection(worm, allWorms, foods, botMovementStrategies, targetDirections);
        }

        // 개별 지렁이 상태 업데이트
        updateSingleWorm(worm, deltaTime, targetDirections);
    }
}

/**
 * 클라이언트 리포트 기반으로 먹이 먹기를 검증하고 처리합니다.
 */
export function validateAndProcessFoodEaten(
    wormId: string,
    foodId: string,
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
): boolean {
    const worm = worms.get(wormId);
    const food = foods.get(foodId);

    if (!worm || !food) {
        return false; // 지렁이나 먹이가 존재하지 않음
    }

    const head = worm.segments[0];

    // 먹이와의 실제 거리 검증
    const foodDistance = Math.hypot(head.x - food.x, head.y - food.y);
    const collisionDistance = worm.radius + food.radius;

    // 머리 중심좌표로 부터 먹이 중심좌표까지의 거리가 머리와 먹이의 반지름 합에 약간의 보정치를 더한값보다 크면 검증실패
    if (foodDistance > collisionDistance + GAME_CONSTANTS.MAX_COLLISION_TOLERANCE) {
        console.log(`❌ Food distance validation failed: Player ${wormId}, food distance: ${foodDistance}`);
        return false;
    }

    // 3. 검증 통과 - 먹이 먹기 처리
    processFoodEaten(worm);
    foods.delete(foodId); // 먹이 제거

    console.log(`✅ Food eaten validated: Player ${wormId} ate food ${foodId}`);
    return true;
}

/**
 * 봇들의 먹이 충돌을 서버에서 직접 처리합니다.
 * (봇은 클라이언트가 아니므로 리포트할 수 없음)
 */
export function handleBotFoodCollisions(
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
): { wormId: string; foodId: string }[] {
    const collisions: { wormId: string; foodId: string }[] = [];

    for (const worm of worms.values()) {
        // 봇만 처리
        if (worm.type !== WormType.Bot) continue;

        const head = worm.segments[0];

        for (const food of foods.values()) {
            const distance = Math.hypot(head.x - food.x, head.y - food.y);
            const collisionDistance = worm.radius + food.radius;

            if (distance < collisionDistance) {
                // 봇이 먹이를 먹음
                processFoodEaten(worm);
                foods.delete(food.id); // 먹이 제거
                collisions.push({ wormId: worm.id, foodId: food.id });
                break; // 한 번에 하나의 먹이만 먹도록
            }
        }
    }

    return collisions;
}

/**
 * 플레이어가 죽었을 때 게임에서 제거하는 함수
 */
function removeDeadPlayer(
    playerId: string,
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    io: SocketIOServer,
): void {
    const worm = worms.get(playerId);
    if (worm && worm.isDead && worm.type === WormType.Player) {
        console.log(`🚪 Removing dead player: ${playerId}`);

        // 플레이어 상태 제거
        worms.delete(playerId);
        targetDirections.delete(playerId);

        // 다른 클라이언트들에게 플레이어 떠남 알림
        io.emit("player-left", playerId);
    }
}

/**
 * 이전 틱이 끝나고 현재 틱이 시작하기전까지 죽은 지렁이들을 되살림
 */
export function handleKilledWorms(
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
    io: SocketIOServer,
): void {
    for (const [wormId, worm] of worms) {
        if (worm.isDead) {
            if (worm.type === WormType.Bot) {
                respawnBot(wormId, worms, targetDirections, botMovementStrategies);
            } else if (worm.type === WormType.Player) {
                removeDeadPlayer(wormId, worms, targetDirections, io);
            }
        }
    }
}

function respawnBot(
    botId: string,
    worms: Map<string, Worm>,
    targetDirections: Map<string, { x: number; y: number }>,
    botMovementStrategies: Map<string, MovementStrategy>,
): void {
    // 기존 봇 데이터 제거
    const bot = worms.get(botId);
    if (!bot) {
        return;
    }
    worms.delete(botId);
    targetDirections.delete(botId);
    botMovementStrategies.delete(botId);

    // 새로운 랜덤 타입의 봇 생성
    const numericBotTypes = Object.values(BotType).filter((v) => typeof v === "number") as BotType[];
    const botType = numericBotTypes[Math.floor(Math.random() * numericBotTypes.length)];
    const newBot = createBotWorm(botType);
    newBot.id = botId;
    newBot.color = bot.color; // 기존 봇의 색상 유지

    // 새 봇 데이터 저장
    worms.set(botId, newBot);
    targetDirections.set(botId, { x: newBot.direction.x, y: newBot.direction.y });
    botMovementStrategies.set(botId, createMovementStrategy(botType));

    console.log(`🤖 Bot ${botId} respawned as type ${botType}`);
}

/**
 * 지렁이를 죽이고 다음 틱이 시작되면 되살림
 */
function killWorm(worm: Worm, foods: Map<string, Food>): void {
    console.log(`💀 Killing worm: ${worm.id}`);

    // 죽기 전에 먹이 떨어뜨리기
    dropFoodOnDeath(worm, foods);

    worm.isDead = true;
}

/**
 * 클라이언트 리포트 기반으로 충돌을 검증하고 처리합니다.
 */
export function validateAndProcessCollision(
    reporterWormId: string,
    colliderWormId: string,
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
): boolean {
    const reporterWorm = worms.get(reporterWormId);
    const colliderWorm = worms.get(colliderWormId);

    if (!reporterWorm || !colliderWorm) {
        return false; // 지렁이가 존재하지 않음
    }

    // 죽은 지렁이는 충돌 검증하지 않음
    if (reporterWorm.isDead || colliderWorm.isDead) {
        return false;
    }

    // 충돌자의 머리가 리포터의 몸통(머리 제외)과 충돌했는지 검증
    if (checkHeadToBodyCollision(colliderWorm, reporterWorm)) {
        killWorm(colliderWorm, foods);
        console.log(`✅ Collision validated: ${colliderWormId} died by hitting ${reporterWormId}`);
        return true;
    }

    console.log(`❌ Collision validation failed: ${colliderWormId} vs ${reporterWormId}`);
    return false;
}

/**
 * 서버에서 직접 모든 지렁이 간의 충돌을 감지하고 처리합니다.
 */
export function handleWormCollisions(
    worms: Map<string, Worm>,
    foods: Map<string, Food>,
): { killedWormId: string; killerWormId: string }[] {
    const collisionsToProcess: { killed: Worm; killer: Worm }[] = [];
    const allWorms = Array.from(worms.values());

    // O(n^2) 충돌 검사지만 봇 개수가 적을테니 성능에 큰 영향은 없을 것
    for (const bodyWorm of allWorms) {
        // 봇이 아니거나 죽은 지렁이의 몸통은 충돌 검사하지 않음
        if (bodyWorm.isDead || bodyWorm.type !== WormType.Bot) continue;

        for (const headWorm of allWorms) {
            if (headWorm.isDead) continue;

            // headWorm의 머리가 bodyWorm의 몸통에 충돌했는지 확인
            if (checkHeadToBodyCollision(headWorm, bodyWorm)) {
                collisionsToProcess.push({ killed: headWorm, killer: bodyWorm });
            }
        }
    }

    const finalCollisions: { killedWormId: string; killerWormId: string }[] = [];
    const killedThisTick = new Set<string>();

    for (const { killed, killer } of collisionsToProcess) {
        if (!killed.isDead && !killedThisTick.has(killed.id)) {
            killWorm(killed, foods);
            killedThisTick.add(killed.id);
            finalCollisions.push({ killedWormId: killed.id, killerWormId: killer.id });
            console.log(`💥 Server collision: ${killed.id} died by hitting ${killer.id}'s body`);
        }
    }

    return finalCollisions;
}

/**
 * 한 지렁이의 머리가 다른 지렁이의 몸통에 충돌했는지 확인합니다.
 */
function checkHeadToBodyCollision(headWorm: Worm, bodyWorm: Worm): boolean {
    if (headWorm.id === bodyWorm.id) return false; // 같은 지렁이 제외

    const head = headWorm.segments[0];
    const collisionDistance = headWorm.radius + bodyWorm.radius;

    // 머리가 다른 지렁이의 몸통(머리 제외)과 충돌했는지 확인
    for (let i = 1; i < bodyWorm.segments.length; i++) {
        const segment = bodyWorm.segments[i];
        const distance = Math.hypot(head.x - segment.x, head.y - segment.y);

        if (distance < collisionDistance + GAME_CONSTANTS.MAX_COLLISION_TOLERANCE) {
            return true;
        }
    }

    return false;
}

/**
 * 스프린트 중인 지렁이의 먹이 떨어뜨리기를 처리합니다.
 */
export function handleSprintFoodDrop(worms: Map<string, Worm>, foods: Map<string, Food>, dt: number): void {
    for (const worm of worms.values()) {
        // 스프린트중이면서 죽지 않았고 점수가 0 이상인 지렁이만 처리
        if (!worm.isSprinting || worm.isDead || worm.score <= 0) continue;

        worm.sprintFoodDropTimer += dt * 1000; // ms 단위로 타이머 증가

        // 달린지 충분한 시간이 지났으면 먹이 떨어뜨리기
        if (worm.sprintFoodDropTimer >= GAME_CONSTANTS.SPRINT_FOOD_DROP_INTERVAL) {
            worm.sprintFoodDropTimer -= GAME_CONSTANTS.SPRINT_FOOD_DROP_INTERVAL;
            // 꼬리 세그먼트 제거
            const tailSegment = worm.segments.pop();
            if (tailSegment) {
                // 제거된 꼬리 위치에 먹이 생성
                const food = createFoodAtPosition(tailSegment.x, tailSegment.y);
                foods.set(food.id, food);

                // 점수 감소
                worm.score = Math.max(0, worm.score - 1);
                updateWormRadius(worm); // 반지름 업데이트

                console.log(
                    `🏃 Sprint food drop: Worm ${worm.id} dropped food at (${tailSegment.x}, ${tailSegment.y})`,
                );
            }
        }
    }
}

/**
 * 지렁이가 죽을 때 몸통을 따라 먹이를 떨어뜨립니다.
 */
export function dropFoodOnDeath(worm: Worm, foods: Map<string, Food>): void {
    const foodCount = Math.floor(worm.score / 2); // 죽을 때 점수의 반만큼 먹이 생성

    if (foodCount <= 0) return;

    // 세그먼트들 중에서 균등하게 분배하여 먹이 생성
    const step = Math.max(1, Math.floor(worm.segments.length / foodCount));

    for (let i = 0; i < worm.segments.length; i += step) {
        const segment = worm.segments[i];
        const food = createFoodAtPosition(segment.x, segment.y);
        foods.set(food.id, food);
    }

    console.log(`💀 Death food drop: Worm ${worm.id} dropped about ${foodCount} foods`);
}
