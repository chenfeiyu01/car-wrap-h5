# 素材搜集结果

2026-09-15。以下开发素材已实际保存到项目目录，新增采购费用为 0；没有购买素材或使用参考站点的未授权车模。

## 可直接作为开发输入的素材

| 素材 | 本地入口 | 体积/规格 | 来源与用途 |
| --- | --- | --- | --- |
| Kenney sedan，处理版 | [kenney-sedan-prepared.glb](../assets/models/kenney-sedan-prepared.glb) | 193,700 字节；2,032 三角形 | CC0 通用轿车，用于车型切换与材质流程 |
| Kenney SUV，处理版 | [kenney-suv-prepared.glb](../assets/models/kenney-suv-prepared.glb) | 230,364 字节；2,474 三角形 | CC0 通用 SUV，第二款形体与层级不同的测试车型 |
| Studio Small 03 | [studio_small_03_1k.hdr](../assets/environments/studio_small_03_1k.hdr) | 1,686,299 字节；1024 × 512 | Poly Haven / Greg Zaal，CC0，展示环境反射 |
| 12 色演示色库 | [color-library.json](../assets/materials/color-library.json) | sRGB 十六进制值 | 项目自建数据，非厂商 SKU |
| 4 类膜面参数 | [finish-presets.json](../assets/materials/finish-presets.json) | 亮面、哑光、缎面、金属感 | 项目自建近似参数，尚未实物标定 |

Kenney 官方来源：[Car Kit](https://kenney.nl/assets/car-kit)，本次下载为 Car Kit 3.1，压缩包自带 [CC0 许可](../assets/licenses/Kenney-Car-Kit-License.txt)。环境来源与许可见 [Poly Haven 记录](../assets/licenses/Poly-Haven-CC0.md)。[下载证据](download-evidence.json)记录原网址、读取时间和校验和。

原始模型和贴图也保留于 `assets/models/kenney-sedan.glb`、`assets/models/kenney-suv.glb`、`assets/models/Textures/colormap.png`；原版依赖这一外部 PNG，不能只拷贝原版 GLB。`*-prepared.glb` 已内嵌 PNG，无外部资源依赖。

## 已完成的样例适配

原模型在车身、玻璃、轮胎等区域共用一张调色板及同一个材质。直接全局改材质会误染，因此离线按当前源文件的 UV 调色板区域，把原彩色外板拆为独立 primitive 和 `body_paint` 材质，保留其它几何、原始纹理及节点关系。

轿车分出 134 个可涂色三角形，SUV 分出 178 个。两款模型均使用 `body` 节点下的 primitive 1 作为开发绑定；完整节点/mesh 索引见 [绑定记录](prepared-model-bindings.json)。转换脚本 [prepare-kenney-assets.py](prepare-kenney-assets.py)校验了原始文件 SHA-256，避免对未来不同版本的素材误用同一分区规则。

这里的可涂色面仅为模型原彩色外板，原灰色顶盖和装饰等保持固定。该分区用于开发验证；渲染后的视觉隔离效果仍需在第一阶段逐面检查，不把结构检查等同于已经做过视觉验收。

两款是低面数风格化模型，不是 SU7 等真实车型，也不能代表写实画质或生产模型性能。它们的 UV 用于调色板，不能直接承接整车彩绘图案。压缩包的小尺寸预览图仅适合作为素材索引；正式 fallback 大图在渲染基线阶段生成。

## 实际检查结果

[资产校验记录](asset-validation.json)：两款处理版 GLB 均为 **0 error / 0 warning**；分别有 8 / 9 条 info，内容为未使用的切线、纯色材质的 UV 和转换后保留的原索引 accessor，属于可裁剪数据提示。为保留源几何，本轮不再做无关优化。

HDR 经 Three.js HDRLoader 完整 CPU 解码，分辨率 1024 × 512，所有解码值有限；大小和 MD5 与 Poly Haven 官方 files API 一致。12 色及 4 组材质数据通过 ID 唯一性、颜色格式和参数范围检查。

验证范围为文件格式、结构、CPU 解析及配置数据。**未进行浏览器 WebGL 渲染、视觉隔离验收、应用构建或微信真机测试。**

## 写实车型候选，未纳入开工素材

[FormDrive](https://github.com/nesdesignco/FormDrive) 的 README 列出 Ricy 的 [2005 Ford Mustang GT](https://sketchfab.com/3d-models/2005-ford-mustang-gt-26b6b60cf2804370ac3c64424242dc1f) 与 Ameer Studio 的 [Tesla 2018 Model 3](https://sketchfab.com/3d-models/tesla-2018-model-3-5ef9b845aaf44203b6d04e2c677e444f)，并将各自模型标注为 CC BY 4.0。

本次只能确认该仓库的声明；两条原作者页面访问返回 403，未独立完成原作者许可复核，因此未下载，也未认定可供客户商业交付。商家确定车型后再核对原作者许可、品牌边界、文件规格与成本，不从示例工程源码 MIT 推导模型权限。当前授权通用样例已足够开始基础研发。
