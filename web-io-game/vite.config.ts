import { defineConfig } from "vite";

export default defineConfig({
    root: ".",           // index.html 이 root 에 있으니 그대로
    build: {
        outDir: "dist/client",
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['phaser'] // 'phaser'를 vendor.js로 분리
                }
            }
        }
    },
    resolve: {
        alias: {
            "@": "/src",     // 편리한 경로 단축
        },
    },
});
