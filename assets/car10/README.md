# Car 10 展厅版

用户提供 10-Car.obj（231 MB），缺少引用的 10-Car.mtl。原 OBJ 已保留。

当前 H5 使用 `public/models/car10-taillights.glb`，完整几何 Draco 压缩，约 288.9 万三角形/8.7 MiB；不是最初 15% 减面版。编辑源：`car10-taillights.blend`（尾灯材质拆分），原始完整源 `car10-quality.blend` 保留。`car10-web.blend` 为早期减面版，保留作为过程文件。

灯罩与车窗分开处理，车漆、钢材、镀铬、轮胎均重配 PBR。环境光使用程序生成的摄影灯卡，地面阴影按完整车型用 Cycles 烘焙。最终参考以 `studio-browser.png` 的真实浏览器截图为准，早期 car10.png 仅旧预览图。

执行：`scripts/car10_quality.py` 导出完整几何，glTF Transform 4.5.0 draco（position16/normal14/texcoord14）压缩，`scripts/car10_shadow.py` 烘焙阴影。阴影适用于固定车辆和灯光、自由相机；材质调校在 `src/viewer/VehicleScene.ts` 和 `studio.ts`。

尾灯修复：`scripts/car10_taillights.py` 重绑现有 72 个内构部件和上部灯罩，输出独立 Blender 文件及临时完整 GLB；使用同样的 Draco 量化参数压缩为 `car10-taillights.glb`。材质在 `src/viewer/car10Materials.ts` 调整，原模型没有缺失尾灯内构。
