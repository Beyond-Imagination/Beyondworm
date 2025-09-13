const tickRate = 30; // 초당 틱 수

export const GAME_CONSTANTS = {
    // Map
    MAP_WIDTH: 15000,
    MAP_HEIGHT: 10000,
    MAP_BOUNDARY_OFFSET: 50, // 맵 경계를 넘어도 죽지 않는 오프셋(px)

    // Tick
    TICK_RATE: tickRate, // 초당 틱 수
    TICK_MS: 1000 / tickRate, // 틱 간격 (밀리초 단위)
    dt: 1 / tickRate, // 각 틱의 시간 (초 단위)

    // Worm
    HEAD_SPEED: 350, // 머리가 마우스를 쫓는 속도(px/s)
    HEAD_SPRINT_SPEED: 550, // 달리기 속도
    SPRINT_FOOD_DROP_INTERVAL: 500, // 달리기 중 먹이 방출 간격 (ms)
    TURN_RATE: 5.0, // 지렁이 회전 속도 (라디안/초)

    // Bot
    BOT_COUNT: 6, // 맵에 생성될 봇 개수

    // Segment
    SEGMENT_SPACING: 14, // 세그먼트 간 고정 거리(px)
    SEGMENT_DEFAULT_COUNT: 5, // 기본 세그먼트(원) 개수
    SEGMENT_DEFAULT_RADIUS: 40, // 기본 세그먼트(원) 반지름(px)
    SEGMENT_GROWTH_RADIUS: 1.5, // 먹이를 먹을 때 세그먼트 반지름 증가량(px)

    // Food
    FOOD_RADIUS: 30, // 먹이(원) 반지름(px)
    MINIMUM_FOOD_COUNT: 200, // 맵상의 최소 먹이 개수
    FOOD_COLOR: 0xff3333, // 먹이 색상 (빨간색)

    // Collision
    MAX_COLLISION_TOLERANCE: 25, // 충돌 허용 보정치(px)
};
