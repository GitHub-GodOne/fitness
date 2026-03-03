# 3D Human Body Model Integration

## 功能说明

步骤五现在使用真实的 3D 人体解剖模型（Male.OBJ），通过 Three.js 渲染，提供更真实的肌肉选择体验。

## 技术实现

### 1. 模型加载
- 使用 `OBJLoader` 加载 `/public/model/Male.OBJ` 文件（44MB）
- 自动居中和缩放模型以适应视口
- 应用肌肉红色材质（#cc6666）

### 2. 交互功能
- **点击选择** - 点击模型的不同部位选择目标肌肉群
- **高亮显示** - 选中的部位显示为亮红色（#ff3333）并带发光效果
- **悬停效果** - 鼠标悬停时显示浅红色（#ee5555）
- **3D 旋转** - 使用 OrbitControls 可以旋转、缩放查看模型

### 3. 身体部位映射

根据模型的 Y 轴坐标范围映射到不同的身体部位：

```typescript
const BODY_PART_REGIONS = {
  neck: { minY: 1.55, maxY: 1.75 },      // 颈部
  shoulders: { minY: 1.35, maxY: 1.55 }, // 肩部
  chest: { minY: 1.1, maxY: 1.35 },      // 胸部
  arms: { minY: 0.7, maxY: 1.4 },        // 手臂
  back: { minY: 1.0, maxY: 1.5 },        // 背部
  waist: { minY: 0.8, maxY: 1.1 },       // 腰部
  glutes: { minY: 0.6, maxY: 0.9 },      // 臀部
  legs: { minY: 0.0, maxY: 0.7 },        // 腿部
};
```

### 4. 光照系统

使用多层光照营造真实的肌肉解剖效果：

- **环境光** - 基础照明（intensity: 0.5）
- **方向光** - 主光源和辅助光源，带阴影
- **点光源** - 红色点光源模拟血管效果
- **聚光灯** - 顶部聚光灯增强细节
- **边缘光** - 蓝色边缘光增加深度感

### 5. 材质系统

```typescript
MeshStandardMaterial {
  color: 0xcc6666,        // 肌肉红色
  roughness: 0.7,         // 粗糙度
  metalness: 0.1,         // 金属度
  emissive: 0xff0000,     // 发光颜色（选中时）
  emissiveIntensity: 0.3  // 发光强度
}
```

## 性能优化

1. **懒加载** - 使用 Suspense 延迟加载模型
2. **加载提示** - 显示加载动画，提升用户体验
3. **阴影优化** - 使用 2048x2048 阴影贴图
4. **材质复用** - 所有网格共享相同的材质配置

## 用户体验

1. **加载状态** - 显示 "Loading 3D model..." 提示
2. **交互提示** - 显示选择说明和已选数量
3. **选中标签** - 显示已选择的身体部位标签
4. **重置按钮** - 一键清除所有选择

## 文件结构

```
/public/model/Male.OBJ                          # 3D 人体模型文件（44MB）
/src/shared/components/body-part-selector-3d.tsx # 3D 选择器组件
```

## 使用示例

```tsx
<BodyPartSelector3D
  selected={selectedBodyParts}
  onChange={setSelectedBodyParts}
  disabled={isGenerating}
/>
```

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

需要支持 WebGL 2.0

## 已知限制

1. 模型文件较大（44MB），首次加载需要时间
2. 移动设备性能可能受限，建议在桌面端使用
3. 身体部位检测基于 Y 轴坐标，可能需要根据实际模型调整

## 未来改进

1. 添加模型压缩（使用 GLB 格式）
2. 支持更精确的网格选择（基于网格名称）
3. 添加动画效果（肌肉收缩动画）
4. 支持前后视图切换
5. 添加血管系统可视化
