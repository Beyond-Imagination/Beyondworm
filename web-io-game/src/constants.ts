export const FE_CONSTANTS = {
    // Camera
    CAMERA_MOVE_LERP_SPEED: 1, // 카메라 움직임 보간 속도 (0~1, 클수록 빠르게 따라감)
    CAMERA_ZOOM_LERP_SPEED: 0.08, // 카메라 줌 보간 속도
    CAMERA_PADDING: 200, // 카메라가 맵 밖을 얼마나 더 보여줄지 결정하는 값

    // Map
    BOUNDARY_COLOR: 0xff3350, // targetFE 톤의 경계색
    BOUNDARY_TRANSPARENCY: 0.26, // 맵 밖 위험영역 투명도

    // UI
    ZORDER_SEGMENT: 1000,
    ZORDER_MAP_END_ELEMENT: 1001,
    WORM_POSITION_LERP_FACTOR: 0.3,
    NICKNAME_Y_OFFSET: 20,
    NICKNAME_STYLE: {
        fontSize: "15px",
        color: "#c2d8ff",
        stroke: "#0a1324",
        strokeThickness: 3,
        fontFamily: "Trebuchet MS, Arial, sans-serif",
    },
    ZORDER_NICKNAME: 1000,
};
