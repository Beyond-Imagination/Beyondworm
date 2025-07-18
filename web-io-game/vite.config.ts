import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
    root: ".", // index.html 이 root 에 있으니 그대로
    base: "/Beyondworm/",
    build: {
        outDir: "dist/client",
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@": "/src", // 편리한 경로 단축
            "@beyondworm/shared": path.resolve(__dirname, "../shared/src"),
        },
    },
});
