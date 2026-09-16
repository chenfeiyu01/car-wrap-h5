# 赞 car · 把喜欢，开上路

React + TypeScript + Vite + Three.js 的独立 H5 车身配置器。

```sh
npm ci
npm run dev
```

打开 http://localhost:5173/ 。使用支持 Vite 8 的 Node.js（建议 22.12+）。

- 保时捷 718 cayman GT4 / 小米 YU7 双车型、13 种颜色、4 类膜面质感、4 种环境。
- 纯色换色 / 图案涂装；4 款线条风格与 12 款 IP 图案。
- PC 全窗口渲染与悬浮面板；手机上方车辆固定、下方面板内部滚动。
- 系统全屏及横屏锁定请求；不支持锁定的浏览器提示转动手机。
- 本机方案保存、图片导出和配置链接，无后台或云存储。

`npm run build` 构建，`npm test` 检查配置校验。真实手机横屏、触控及性能仍需验收，未部署上线。

图案来源见 public/liveries/SOURCES.md，环境来源见 public/environments/SOURCES.md。
