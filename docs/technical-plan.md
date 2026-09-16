# 3D 车膜 H5 技术方案

编制日期：2026-09-15。阶段：开工准备，未开始网站开发。

## 1. 目标与范围

面向商家定制交付一个可由微信小程序 `web-view` 承载的 H5。首版完成车型切换、车辆旋转/缩放/视角复位、整车改色、车膜质感切换、方案本机保存与恢复、截图预览，以及移动端加载和渲染优化。

首版以两款授权样例车型、12 个自建示例颜色、4 类材质参数验证完整流程。示例颜色不是厂商 SKU，开发样例模型不等于商家最终车型。正式车辆模型制作、实物车膜采样与色彩标定不属于网站开发。

分区拼色需要可独立寻址的车身分区；整车彩绘需要匹配车型的 UV 和贴图；自由贴纸需要投射、编辑和保存机制。这三项记录为后续扩展，不把缺少相应资产的功能伪装成首版已具备。首版不包含订单、支付、会员登录、管理后台、多租户 SaaS 或原生小程序重建。

## 2. 技术选型

| 层 | 决定 | 理由 |
| --- | --- | --- |
| 页面 | React + TypeScript + Vite | 单页移动端交互，静态部署，组件职责清楚 |
| 渲染 | Three.js `WebGLRenderer`，直接调用 | 单场景即可完成需求，可显式控制材质、加载、渲染频率和资源释放 |
| 交互 | 官方 `OrbitControls` | 单指旋转、双指缩放；限制极角/距离，关闭不需要的平移 |
| 模型 | glTF 2.0 / GLB；官方 `GLTFLoader` | 几何、材质、纹理有统一交换格式 |
| 光照与材质 | `MeshPhysicalMaterial` + HDR 环境 + PMREM | 用颜色、粗糙度、清漆等参数模拟不同膜面质感 |
| 应用状态 | React reducer + 独立序列化配置 | 不为单页先引入额外全局状态框架；逐帧状态留在渲染器 |
| 内容来源 | 本地 JSON 配置，正式部署时同源静态资源/CDN | 增加车型、颜色不需要复制页面；暂不依赖后台 |
| 容器 | 商家现有小程序中的一个 `web-view` 页面 | H5 自己绘制全部选择器、加载态和预览弹层 |
| 资产检查 | Khronos glTF Validator；需要压缩时 glTF Transform | 先验证文件，再做保留材质分区的优化 |

具体版本、依赖边界和候选仓库结论见 [选型调研](../research/technology-selection.md)，实际查询记录见 [版本快照](../research/package-versions.json)。首版不依赖 WebGPU，不采用 alpha 渲染框架。[S1][S2][S3]

## 3. 页面与用户流程

手机竖屏优先，宽度 360–430 CSS 像素作为设计检查范围，同时检查 320 宽和横屏。上方为占主要面积的车辆展示区，下方为车型、颜色和质感选择区；操作按钮包含复位、保存方案和截图。采用中性展厅背景，避免背景色干扰车膜判断。H5 不仿造微信导航栏、手机状态栏或系统边框。

流程：读取目录配置 → 展示加载状态 → 检查 WebGL 2 → 加载首车与环境 → 选颜色/质感 → 旋转查看 → 本机保存/截图预览。切车型时保留颜色与质感选择，按新车型绑定重新应用。

必须覆盖空数据、加载进度未知、下载失败重试、不支持 3D、图形上下文丢失、保存失败等状态。按钮在不具备条件时解释原因，而不是可点击却无结果。

## 4. 模块职责与契约

| 模块 | 负责 | 关键约束 |
| --- | --- | --- |
| `AppShell` / 页面组件 | 控件、选中态、加载/错误信息 | 不持有 Three.js 对象，不在 React 中逐帧更新相机 |
| `VehicleViewer` | 场景、相机、环境、按需渲染、尺寸变化、释放 | 单 canvas、单 renderer；有明确 `dispose()` 生命周期 |
| `VehicleLoader` | 模型加载、验证、规范化、并发切换 | 使用递增 requestId；迟到的旧请求不能覆盖当前选择 |
| `PaintController` | 车身材质克隆与参数应用 | 只作用于配置指定的 primitive，保留玻璃、车轮和灯具 |
| `Catalog` | 车型、颜色、膜面、许可、展示能力配置 | 校验 ID 唯一性、资产路径、材质绑定、版本 |
| `ConfigurationStore` | 本机方案序列化、读取、重置 | 数据有 schemaVersion；存储失败不影响继续操作 |
| `WechatAdapter` | 环境判断、容器返回、消息发送 | 普通浏览器可独立运行；消息不作为即时回执 |

建议正式代码目录为 `src/app`、`src/viewer`、`src/catalog`、`src/platform`、`src/styles`。当前不创建这些目录或应用脚手架。

### 配置字段

`VehicleDefinition`：`id`、`label`、`modelUrl`、`assetVersion`、`previewUrl`、`licenseId`、`transform`、`camera`、`paintTargets`、`capabilities`。

`paintTargets` 使用模型版本绑定的稳定节点路径与 primitive 索引，记录可选分区名；名称有重名时不能仅靠 `material.name` 判断。接入新模型时显式配置，禁止运行时凭颜色或模糊关键词猜测可换色区域。

`FinishPreset`：`id`、`label`、`roughness`、`metalness`、`clearcoat`、`clearcoatRoughness`。数值是开发起点，见 [膜面样本](../assets/materials/finish-presets.json)。

`SavedConfiguration`：`schemaVersion`、`vehicleId`、`assetVersion`、`colorId`、`finishId`、`cameraPose`、`updatedAt`。只保存 JSON，不序列化 Three.js 场景或巨量图像数据。读取时校验可用车型、版本和数值范围；目录变化后安全回退。

第一版保存是当前浏览器本机保存，不声称跨设备或跨商家同步。跨设备分享与云端持久化需接入商家的正式接口。

## 5. 换色与换膜实现

纯色车膜不需要为每个“车型 × 颜色”准备图片。加载后按 `paintTargets` 克隆车身材质，应用示例颜色与膜面参数，随后触发重绘。共享材质必须隔离，否则车身换色可能污染内饰、其他车型或未选中的部件。

亮面主要用较低粗糙度与清漆；哑光主要提高粗糙度；缎面取中间状态；金属感使用近似金属度与清漆参数。这里的金属感不是金属颗粒、珠光或变色龙车膜的完整物理仿真。[S2]

原始开发样例中的调色板纹理不能直接覆盖车身颜色。本轮已离线拆出原彩色外板，正式开发使用 `*-prepared.glb` 和 `research/prepared-model-bindings.json` 的映射；原中性顶盖、装饰等保持固定。首个渲染场景仍需逐面检查隔离效果，不可清空整车纹理。

统一颜色管理和曝光，在固定环境下比较膜面。baseColor 按 sRGB 处理，法线/粗糙度等数据纹理按线性数据处理。屏幕、照明和材料参数都会影响视觉效果，验收应使用统一参考图与实物色卡；不承诺屏幕显示与实物无色差。[S2][S4]

## 6. 资产接入规范

| 项目 | 首版接入要求 |
| --- | --- |
| 文件 | GLB 优先；所有外部缓冲/图片均已收齐；无运行时未知网址 |
| 坐标 | 记录源坐标轴/单位；加载时统一地面、中心与车型尺度，不破坏部件相对位置 |
| 车身 | 可在节点/primitive 或材质槽层面独立选择；车窗、轮胎、灯具不混入 |
| UV | 纯色不强制独占 UV；彩绘必须另有车型专属展开，不把调色板 UV 当作整车彩绘 UV |
| 许可 | 记录作者、原始来源、许可文件、下载时间、SHA-256；素材许可独立于仓库代码许可 |
| 校验 | Validator 无 error；warning/info 分类说明；真实渲染与机型验收另行进行 |
| 优化 | 先统计三角形、primitive、材质与贴图；压缩不代表降低面数或 GPU 内存 |

Draco、Meshopt、KTX2 按资产实际使用接入，不同时无差别加载全部解码器。解码器/转码器随部署托管，不能把海外演示 CDN 当成生产依赖。涉及 worker/WASM 的策略在微信真机上验证。优化时不能合并原本需要独立改色的分区。[S3][S5]

## 7. 性能设计与验收目标

以下是首版工程目标，尚未实测达标，也不是所有手机的承诺。

| 指标 | 初始预算/验收方式 |
| --- | --- |
| 单车资源 | 移动版模型及必要贴图合计目标 ≤5 MB；首屏全部资源目标 ≤8 MB |
| 几何与批次 | 单车目标 ≤100,000 三角形；整场景常态 ≤60 draw calls |
| 纹理 | 车身优先 1K，必要细节最高 2K；环境优先 1K；按实际纹理解码和 mipmap 计算内存 |
| 首次可操作 | 在约定中档 Android、20 Mbps/100 ms/冷缓存条件下目标 ≤5 秒，至少 10 次测量取 p75 |
| 持续交互 | 约定机型旋转 60 秒，目标 p95 帧间隔 ≤33.3 ms；统计掉帧与发热后退化 |
| 已加载车换色 | 点击到首个更新帧目标 ≤150 ms；首次 shader 编译单独记录 |
| 稳定性 | 连续切车 20 次，资源计数在回收后趋稳，无持续增长；切后台/恢复不黑屏 |

像素比初始限制在 1–1.5，合格机型再提升；不按手机物理 DPR 无上限绘制。静止时停止连续绘制，拖动和阻尼期间重绘；自动旋转默认关闭。低档减小分辨率、关闭昂贵效果和动态阴影，保留基本材质。第一版不用实时光追、SSAO、景深或多层后处理。

每次只维持一台已提交车型；切车期间的旧新资源重叠有上限。旧请求完成后若已失效则立即释放；释放 geometry、material、texture、环境 render target 和事件监听。注意 ImageBitmap 需要单独处理，不能把“JavaScript 对象失去引用”当作全部 GPU 资源已释放。[S1][S3]

当前 Three.js 不再提供 WebGL 1 路径。不支持 WebGL 2、创建 renderer 失败或重复上下文恢复失败时展示车辆静态预览和原因；降画质不能代替缺失的 WebGL 2 能力。[S1]

## 8. 微信小程序边界

官方 `web-view` 文档于 2026-09-15 通过直接 HTTP 读取验证，关键摘录保存在 [平台核验记录](../research/platform-evidence.json)。网页检索工具未能打开该页，因此以实际取得的官方页面内容为依据。[S6]

- 个人类型小程序暂不支持 `web-view`；商家需提供支持该能力的小程序主体及可配置的业务域名。H5 使用 HTTPS。
- `web-view` 铺满小程序页面；H5 的全部配置控件放在网页内部。布局处理安全区域、动态视口高度、横竖屏和触摸滚动冲突。
- `wx.miniProgram.postMessage` 在小程序后退、组件销毁、分享、复制链接等特定时机触发容器消息，不是实时双向通信。换色、保存本机方案、加载状态均在 H5 内完成。
- 截图首版生成 H5 内 PNG 预览。普通浏览器可下载；微信中长按保存能力须真机核验，不承诺 `<a download>` 或 H5 直接写相册。若要求原生相册/分享能力，需由商家接入原生预览页和必要接口，不能依赖一个 `postMessage` 获得即时结果。
- 截图避免常开 `preserveDrawingBuffer`；在明确渲染后捕获或使用离屏 render target。跨域模型/纹理必须满足 CORS，否则导出可能失败。[S1]
- 商家品牌、可用车型、默认膜色等允许由受控配置或经校验的 URL 参数传入。不得把长期密钥、会话凭证和任意下载 URL 放进分享链接。

目标测试矩阵：约定一台 iPhone、一台中档 Android、一台较低档 Android 的当前微信；记录实际 OS、微信版本、WebView/WebGL 能力。桌面 Chrome/Safari 与普通手机浏览器作为补充。模拟器不能替代微信真机，正式性能报告必须使用实际交付车型。

## 9. 部署与后续接口

本地开发可完全使用已收集素材。生产采用同源静态托管或商家 CDN，资源文件名带版本/hash，目录配置短缓存，模型/纹理长缓存。配置与模型版本一同发布，并保留可回滚的上一套配置。部署前核验 HTTPS、资源 MIME、CORS、缓存及微信业务域名。

首版不建设服务端。以后需要车型管理、云方案、原生导出或商家订单跳转时，通过独立目录/保存接口接入；服务器对商家身份与权限自行校验，不能仅信任 URL 的商家 ID。

## 参考资料

- [S1 Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- [S2 Three.js MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)
- [S3 Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [S4 Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
- [S5 glTF Transform](https://gltf-transform.dev/)
- [S6 微信 web-view 官方文档](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)
