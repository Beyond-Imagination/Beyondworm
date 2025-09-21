export const FE_CONSTANTS = {
    // Camera
    CAMERA_MOVE_LERP_SPEED: 1, // 카메라 움직임 보간 속도 (0~1, 클수록 빠르게 따라감)
    CAMERA_ZOOM_LERP_SPEED: 0.08, // 카메라 줌 보간 속도
    CAMERA_PADDING: 200, // 카메라가 맵 밖을 얼마나 더 보여줄지 결정하는 값

    // Map
    BORDER_COLOR: 0xffffff, // 흰색, 맵의 경계선 색상
    BORDER_THICKNESS: 20, // 맵의 경계선 두께
    BOUNDARY_COLOR: 0xff0000, // 빨간색, 맵의 죽음의 영역
    BOUNDARY_TRANSPARENCY: 0.2, // 20% 죽음의 영역 투명도

    // UI
    ZORDER_SEGMENT: 1000,
    ZORDER_MAP_END_ELEMENT: 1001,
    WORM_POSITION_LERP_FACTOR: 0.3,
    NICKNAME_Y_OFFSET: 20,
    NICKNAME_STYLE: {
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
        fontFamily: "Arial, sans-serif",
    },
    ZORDER_NICKNAME: 1000,
};
