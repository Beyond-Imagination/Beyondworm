import { defineConfig } from "vite";
import path from "path";

// defineConfig는 함수를 인자로 받을 수 있으며, 이 함수는 현재 명령어('serve' 또는 'build')를 기반으로 설정을 반환합니다.
export default defineConfig(({ command }) => {
    // 명령어에 따라 shared 라이브러리의 올바른 경로를 결정합니다.
    const sharedPath =
        command === "serve"
            ? path.resolve(__dirname, "../shared/src") // 개발 서버의 경우, 원본 소스 파일을 사용합니다.
            : path.resolve(__dirname, "../shared/dist"); // 프로덕션 빌드의 경우, 빌드된 파일을 사용합니다.

    return {
        root: ".", // index.html 이 root 에 있으니 그대로
        base: "/Beyondworm/",
        build: {
            outDir: "dist/client",
            emptyOutDir: true,
        },
        resolve: {
            alias: {
                "@": "/src", // 편리한 경로 단축
                "@beyondworm/shared": sharedPath, // 동적으로 결정된 경로를 사용합니다.
            },
        },
    };
});
