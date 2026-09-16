import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {createAIMiddleware} from './server/ai-wrap.mjs';
export default defineConfig({ plugins:[react(),{name:'zan-ai-wrap',configureServer(server){server.middlewares.use(createAIMiddleware());},configurePreviewServer(server){server.middlewares.use(createAIMiddleware());}}], build:{rollupOptions:{output:{manualChunks:(id:string)=>id.includes('/node_modules/three/')?'three':undefined}}} });
