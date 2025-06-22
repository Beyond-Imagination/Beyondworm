import { GAME_CONSTANTS } from "./constants";

export type GameSettingsType = typeof GAME_CONSTANTS;

export default class GameSettings {
  private static _instance: GameSettings;
  private _settings: GameSettingsType;

  private constructor() {
    // constants.ts의 값으로 초기화
    this._settings = { ...GAME_CONSTANTS };
  }

  // 싱글턴 인스턴스 반환
  public static get instance(): GameSettings {
    if (!GameSettings._instance) {
      GameSettings._instance = new GameSettings();
    }
    return GameSettings._instance;
  }

  // 값 가져오기
  public get<K extends keyof GameSettingsType>(key: K): GameSettingsType[K] {
    return this._settings[key];
  }

  /**
   * 게임 설정 값을 변경합니다.
   * 
   * - 단일 값 변경: set("MAP_WIDTH", 20000)
   * - 여러 값 한 번에 변경: set({ MAP_WIDTH: 20000, MAP_HEIGHT: 15000 })
   * 
   * @param key 설정할 항목의 이름 (문자열)
   * @param value 설정할 값
   * @param settings 여러 값을 한 번에 설정할 때 사용하는 객체
   * 
   * @example
   * // 단일 값 변경
   * GameSettings.instance.set("MAP_WIDTH", 20000);
   * 
   * // 여러 값 한 번에 변경
   * GameSettings.instance.set({ MAP_WIDTH: 20000, MAP_HEIGHT: 15000 });
   */
  public set<K extends keyof GameSettingsType>(key: K, value: GameSettingsType[K]): void;
  public set(settings: Partial<GameSettingsType>): void;

  // 구현
  public set(keyOrSettings: any, value?: any): void {
    if (typeof keyOrSettings === "string") {
      // 단일 값 설정
      this._settings[keyOrSettings as keyof GameSettingsType] = value;
    } else if (typeof keyOrSettings === "object" && keyOrSettings !== null) {
      // 여러 값 한 번에 설정
      Object.entries(keyOrSettings).forEach(([key, val]) => {
        if (key in this._settings && val !== undefined) {
          (this._settings as any)[key] = val;
        }
      });
    }
  }

  // 전체 설정 객체 반환
  public getAll(): GameSettingsType {
    return { ...this._settings };
  }
}