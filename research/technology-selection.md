# 技术与开源仓库调研

核验日期：2026-09-15。原始证据：[GitHub 元数据](repositories.json)、[npm 版本和约束](package-versions.json)、[平台文档读取](platform-evidence.json)。

## 决定

采用 React + TypeScript + Vite 构建移动 H5，直接封装 Three.js 渲染器。复用官方加载、控制、材质能力；业务配置和 UI 独立实现。无需为了小程序 web-view 改用原生小程序 Three 适配层，也无需把现成汽车演示工程整库搬入。

## 候选比较

| 项目 | 维护与许可核验 | 适合部分 | 本项目选择 |
| --- | --- | --- | --- |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | 未归档；GitHub pushed_at 2026-09-14；MIT | 3D 渲染、PBR 材质、模型加载、相机交互 | 核心依赖，直接使用 |
| [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 未归档；pushed_at 2026-09-13；MIT | React 声明式 3D，复杂场景组件组织 | 本次不引入；不是性能否定，而是当前单场景无额外需要，且版本配对须谨慎 |
| [google/model-viewer](https://github.com/google/model-viewer) | 未归档；pushed_at 2026-07-07；Apache-2.0 | 快速 glTF 展示、材质接口、AR | 可做轻量展示；本需求有明确资源调度、车身绑定、容器适配，直接 Three 更方便掌控 |
| [BabylonJS/Babylon.js](https://github.com/BabylonJS/Babylon.js) | 未归档；pushed_at 2026-09-14；Apache-2.0 | 完整渲染引擎、工具链 | 有能力完成；本项目暂无切换引擎的收益，不同时引入两套 |
| [nesdesignco/FormDrive](https://github.com/nesdesignco/FormDrive) | 未归档；pushed_at 2026-07-24；README 和 LICENSE 明示源码 MIT、第三方模型另行授权 | 汽车配置器的场景/车型组织思路 | 只作参考；不能从源码许可推断车型可自由使用，也未证明该工程已适配微信 |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | 未归档；pushed_at 2026-09-14；MIT | 资产检查、压缩、纹理处理 | 需要优化实际车型时使用，生产页面不打包 CLI |

`pushed_at` 仅证明仓库近期有推送，不等于默认分支最后提交时间、发布质量或维护承诺。本次 GitHub commits API 返回限流 403，已记录，未把未知的最后提交编造为已核实。主要选择依据是功能、许可和依赖适配，非 star 排名。

Three.js 官方 [汽车材质示例](https://threejs.org/examples/webgl_materials_car.html) 可参考渲染参数与灯光，不直接把其中 Ferrari 资产当成可随客户项目再分发的素材。

## 依赖基线

| 包 | 本次核验版本 | 使用位置 |
| --- | --- | --- |
| `react` / `react-dom` | 19.3.0 / 19.3.0 | 页面运行时 |
| `three` / `@types/three` | 0.186.0 / 0.186.0 | 渲染运行时 / 开发类型 |
| `vite` | 8.3.0 | 构建 |
| `@vitejs/plugin-react` | 6.1.1 | React 构建适配，声明配对 Vite 8 |
| `typescript` | 7.0.2 | 类型检查 |
| `gltf-validator` | 2.0.0-dev.3.10 | 离线资产检查；这是该包当前 latest 的实际版本字符串，不误称稳定 2.0 正式版 |
| `@gltf-transform/cli` | 4.5.0 | 可选离线优化工具 |

本机实际为 Node 24.11.0、npm 11.6.1。Vite 与 React 插件的 Node 约束为 `^20.19.0 || >=22.12.0`，该环境满足声明范围。正式开工时生成并提交项目锁文件，避免浮动依赖。

特别发现：`@react-three/fiber@9.7.0` 的 npm peerDependencies 要求 `react >=19 <19.3`，而当前 `react` latest 为 19.3.0。不能简单地将所有包按 latest 一起装入。采用直接 Three.js 后无需该 React renderer；未来要引入 Fiber 时重新核对兼容矩阵。

版本元数据不等于安装、构建或真机兼容性证明；本轮额外的依赖预检结果以 `dependency-preflight.json` 为准，完整应用构建与微信验收留在开发阶段。

## 微信文档确认

直接读取官方 [web-view 文档](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html) HTTP 200，核实了业务域名配置、个人类型限制、页面铺满，以及 message 延迟到特定时机触发的边界。官方 JS-SDK 1.6.0 地址也实际返回 200。正式功能按文档和真机表现验收，不依赖第三方旧教程。
