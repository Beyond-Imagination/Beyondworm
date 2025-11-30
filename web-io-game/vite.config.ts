import { defineConfig } from "vite";
import path from "path";

// defineConfig는 함수를 인자로 받을 수 있으며, 이 함수는 현재 명령어('serve' 또는 'build')를 기반으로 설정을 반환합니다.
export default defineConfig(({ command }) => {
    const alias = {
        "@": path.resolve(__dirname, "src"), // 편리한 경로 단축
    };

    if (command === "serve") {
        alias["@beyondworm/shared"] = path.resolve(__dirname, "../shared/src"); // 개발 서버의 경우, 원본 소스 파일을 사용합니다.
    }

    return {
        root: ".", // index.html 이 root 에 있으니 그대로
        base: "/Beyondworm/",
        build: {
            outDir: "dist/client",
            emptyOutDir: true,
        },
        optimizeDeps: {
            include: ["@beyondworm/shared"],
        },
        resolve: {
            alias, // 동적으로 결정된 경로를 사용합니다.
        },
    };
});
