import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    root: ".", // index.html이 apps/client에 있으므로 그대로
    base: "/Beyondworm/", // 필요에 따라 "/" 또는 배포 경로로 수정
    build: {
        outDir: resolve(__dirname, "dist"),
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"), // src 경로를 절대경로로 지정
        },
    },
});
