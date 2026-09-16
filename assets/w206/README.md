# 车辆与轮组来源

用户提供：Downloads/C_W206.glb、轮子 1.glb、轮子 2.FBX。原件保持不变。

- scripts/convert-wheel-fbx.mjs：Three.js读取ASCII FBX，输出中间GLB。FBX只有默认材质，没有纹理。
- scripts/prepare-w206.py：后台Blender转换；去掉奔驰附带地面，车头朝+Z；车漆材质绑定；给四个轮位及原卡钳标记extras；两轮组按轮胎外径归一化并居中、外侧朝+X，Draco压缩。
- wheel-2根据零件名称配置橡胶、合金、石墨和刹车PBR材质，为展示重建材质，不宣称原厂材质。
- 发布资源：public/models/mercedes-w206.glb (约26MB)、wheel-1.glb (约1.7MB)、wheel-2.glb (约3.1MB)。

现有三款车源模型不改动。wheelBindings.ts按核实的材质/零件清单选择轮组，从轮胎顶点计算四个轮位。Q50四轮合并网格也按位置拆分安装位。轮组一保留原车刹车；轮组二自带刹车，隐藏原盘/卡钳。径向等比缩放，轴向适配原轮胎宽度；不作为真实改装尺寸或机械兼容性数据。
