export const GAME_CONSTANTS = {
    // Map
    MAP_WIDTH: 3000,
    MAP_HEIGHT: 2000,

    // Segment
    SEGMENT_SPACING: 14, // 세그먼트 간 고정 거리(px)
    SEGMENT_DEFAULT_COUNT: 5, // 기본 세그먼트(원) 개수
    SEGMENT_MAX_COUNT: 25, // 최대 세그먼트(원) 개수
    SEGMENT_DEFAULT_RADIUS: 40, // 기본 세그먼트(원) 반지름(px)
    SEGMENT_GROWTH_RADIUS: 2, // 먹이를 먹을 때 세그먼트 반지름 증가량(px)

    HEAD_SPEED: 350, // 머리가 마우스를 쫓는 속도(px/s)
    HEAD_SPRINT_SPEED: 550, // 달리기 속도
    SPRINT_FOOD_DROP_INTERVAL: 500, // 달리기 중 먹이 방출 간격 (ms)

    // Camera
    CAMERA_LERP_SPEED: 0.08, // 카메라 줌 보간 속도 (0~1, 클수록 빠르게 따라감)

    // ...추가 상수들...
    FOOD_RADIUS: 30, // 먹이(원) 반지름(px)
    MAX_FOOD_COUNT: 25, // 최대 먹이 개수

    // UI
    ZORDER_SEGMENT: 1000,

    // ...추가 상수들...
};
