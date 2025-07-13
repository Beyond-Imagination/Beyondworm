export const GAME_CONSTANTS = {
    // Map
    MAP_WIDTH: 15000,
    MAP_HEIGHT: 10000,

    // Tick
    TICK_RATE: 20, // 초당 틱 수
    TICK_MS: 1000 / 20, // 틱 간격 (밀리초 단위)
    dt : 1 / 20, // 각 틱의 시간 (초 단위)

    // Worm
    HEAD_SPEED: 350, // 머리가 마우스를 쫓는 속도(px/s)
    HEAD_SPRINT_SPEED: 550, // 달리기 속도
    SPRINT_FOOD_DROP_INTERVAL: 500, // 달리기 중 먹이 방출 간격 (ms)
};
