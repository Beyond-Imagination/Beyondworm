import { GAME_CONSTANTS, Worm, WormType, BotType, WormSegment } from "@beyondworm/shared";
import { MovementStrategy } from "../types/movement";
import { FoodSeekerMovementStrategy } from "../strategies/FoodSeekerMovementStrategy";
import { PlayerTrackerMovementStrategy } from "../strategies/PlayerTrackerMovementStrategy";
import { v4 as uuidv4 } from "uuid";

/**
 * 움직임 전략 팩토리
 */
export function createMovementStrategy(botType: BotType): MovementStrategy {
    switch (botType) {
        case BotType.FoodSeeker:
            return new FoodSeekerMovementStrategy();
        case BotType.PlayerTracker:
            return new PlayerTrackerMovementStrategy();
        default:
            console.error(`Unknown bot type: ${botType}`);
            throw new Error(`Unknown bot type: ${botType}`);
    }
}

/**
 * 지렁이 세그먼트들을 생성합니다.
 */
function createWormSegments(): WormSegment[] {
    const segments: WormSegment[] = [];
    const startPosition = generateRandomStartPosition();

    for (let i = 0; i < GAME_CONSTANTS.SEGMENT_DEFAULT_COUNT; i++) {
        segments.push({
            x: startPosition.x - i * GAME_CONSTANTS.SEGMENT_SPACING,
            y: startPosition.y,
        });
    }
    return segments;
}

/**
 * 랜덤한 시작 위치를 생성합니다.
 */
function generateRandomStartPosition(): { x: number; y: number } {
    return {
        x: Math.floor(Math.random() * (GAME_CONSTANTS.MAP_WIDTH - 200)) + 100,
        y: Math.floor(Math.random() * (GAME_CONSTANTS.MAP_HEIGHT - 200)) + 100,
    };
}

/**
 * 봇의 고유 ID를 생성합니다.
 */
function generateBotId(): string {
    return `bot_${uuidv4()}`;
}

/**
 * 랜덤한 봇 색상을 선택합니다.
 */
function getRandomBotColor(): number {
    const colors = [0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 랜덤한 방향 벡터를 생성합니다.
 */
function generateRandomDirection(): { x: number; y: number } {
    return {
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
    };
}

/**
 * 봇 지렁이 생성 함수
 */
export function createBotWorm(botType: BotType): Worm {
    return {
        id: generateBotId(),
        nickname: `Bot-${botType}`,
        score: 0,
        type: WormType.Bot,
        botType,
        segments: createWormSegments(),
        direction: generateRandomDirection(),
        isSprinting: false,
        color: getRandomBotColor(),
        isDead: false,
        radius: GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS,
        sprintFoodDropTimer: 0,
    };
}

/**
 * 플레이어 지렁이 생성 함수
 */
export function createPlayerWorm(playerId: string, nickname: string): Worm {
    return {
        id: playerId,
        nickname: nickname,
        score: 0,
        type: WormType.Player,
        segments: createWormSegments(),
        direction: generateRandomDirection(),
        isSprinting: false,
        color: 0xff0000, // 플레이어는 빨간색
        isDead: false,
        radius: GAME_CONSTANTS.SEGMENT_DEFAULT_RADIUS,
        sprintFoodDropTimer: 0,
    };
}
