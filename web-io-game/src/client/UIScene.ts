import Phaser from "phaser";

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: "UIScene" });
    }

    preload() {
        // UI 관련 에셋 로드
    }

    create() {
        // UI 요소 생성 및 초기화
    }

    update(time: number, delta: number) {
        // UI 상태 갱신 (필요할 때만)
    }

    // 필요에 따라 추가 메서드 작성 가능
    // shutdown() {
    //     // Scene이 종료될 때 호출
    // }
}