# Agent 开发规范（详细版）

本规范用于指导在 **ShipAny 框架** 下开发高质量、可维护、可复用、性能友好的前端/全栈 Agent 模块。目标是：**代码简洁、结构清晰、行为稳定、易扩展、易协作**。

---

## 一、设计目标（Design Goals）

所有 Agent 的设计与实现，必须同时满足以下目标：

1. **中英文国际化（i18n）完整适配**
2. **移动端优先（Mobile First）**，桌面端渐进增强
3. **组件化、模块化**，高复用、低耦合
4. **健壮性优先**：异常可控、状态可追踪
5. **性能优先**：减少不必要渲染、请求与计算
6. **遵循 ShipAny 框架约定**，不重复造轮子
7. **代码可读性 > 技巧性**，新人可快速理解

---

## 二、项目结构规范（Structure Convention）

### 2.1 Agent 推荐目录结构

```text
agent/
├── components/        # 仅 Agent 内部使用的组件
│   ├── AgentCard.tsx
│   ├── AgentForm.tsx
│   └── index.ts
├── hooks/             # Agent 专属 hooks
│   └── useAgent.ts
├── services/          # API / 数据访问层
│   └── agent.service.ts
├── locales/           # 国际化文案
│   ├── en.json
│   └── zh.json
├── types.ts           # 类型定义
├── constants.ts       # 常量（枚举、key 等）
├── utils.ts           # 纯函数工具（无副作用）
└── index.tsx          # Agent 入口
```

**规则**：

- 不跨 Agent 引用私有文件
- 公共能力一律使用 ShipAny 已有模块
- Agent 内部文件禁止“巨型文件”（>300 行）

---

## 三、国际化（i18n）规范

### 3.1 基本原则

- **禁止硬编码文案**
- 所有用户可见文本必须来自 i18n
- key 语义化，而不是 UI 描述

### 3.2 推荐写法

```ts
// locales/en.json
{
  "agent.title": "AI Video Generator",
  "agent.error.network": "Network error, please try again"
}
```

```ts
// 使用
const { t } = useI18n();

t("agent.title");
```

### 3.3 禁止行为

❌ `t('AI Video Generator')`
❌ 文案拼接
❌ 在组件中直接判断语言

---

## 四、移动端适配规范（Responsive Design）

### 4.1 设计原则

- Mobile First
- 使用弹性布局（Flex / Grid）
- 禁止写死宽高（除非明确需求）

### 4.2 推荐做法

- 使用 ShipAny 内置响应式组件
- 使用 `rem / % / vw`
- 媒体查询只做增强，不做兜底

---

## 五、组件化规范（Component Design）

### 5.1 组件分类

| 类型       | 说明                      |
| ---------- | ------------------------- |
| 展示型组件 | 无业务逻辑，仅 props 渲染 |
| 容器型组件 | 状态管理、数据获取        |
| 复合组件   | 由多个展示组件组成        |

### 5.2 组件设计原则

- 单一职责
- props 明确、可预测
- 不在组件内直接请求 API（使用 service）

```ts
interface AgentCardProps {
  title: string;
  onClick?: () => void;
}
```

---

## 六、状态与数据管理规范

### 6.1 数据流原则

- 单向数据流
- 状态尽量靠近使用位置
- 全局状态仅用于跨模块共享

### 6.2 推荐方案

- 组件状态：`useState`
- 复杂逻辑：`useReducer`
- 异步数据：ShipAny 内置 data hooks

---

## 七、异常处理规范（Robustness）

### 7.1 必须处理的异常

- 网络错误
- 超时
- 空数据
- 非法参数

### 7.2 推荐写法

```ts
try {
  const res = await agentService.fetch();
  if (!res) throw new Error("EMPTY_RESULT");
} catch (err) {
  logger.error(err);
  showToast(t("agent.error.network"));
}
```

**规则**：

- 不吞异常
- 用户可见错误必须可理解
- 内部错误必须可追踪

---

## 八、日志与可观测性规范（Logging & Observability）

日志是 Agent 稳定性与可维护性的核心组成部分，本规范要求 **所有 Agent 都具备可追踪、可还原、可分析的问题定位能力**。

### 8.1 日志设计目标

- **帮助快速定位问题**（What / Where / Why）
- **不中断用户体验**
- **不泄露隐私与敏感信息**
- **对性能影响可控**

---

### 8.2 日志分级规范（强制）

| 级别    | 使用场景                     |
| ------- | ---------------------------- |
| `debug` | 本地调试、开发阶段详细信息   |
| `info`  | 关键业务流程节点（正常路径） |
| `warn`  | 可恢复异常、非预期但不致命   |
| `error` | 明确失败、需要排查的问题     |

**规则**：

- 生产环境禁止输出大量 `debug`
- 所有 `catch` 必须至少记录 `warn` 或 `error`

---

### 8.3 日志内容规范

每一条日志应尽量包含以下信息：

- Agent 名称 / 模块名
- 行为或阶段（action / stage）
- 核心参数（已脱敏）
- 错误码或错误类型

#### 推荐结构化日志

```ts
logger.error("agent.fetch.failed", {
  agent: "video-generator",
  action: "fetchVideo",
  reason: err.message,
  traceId,
});
```

❌ 禁止直接 `console.log(err)`
❌ 禁止输出完整用户输入或隐私数据

---

### 8.4 日志位置规范

必须记录日志的场景：

- Agent 初始化失败
- API 请求失败 / 超时
- 关键状态流转
- 不符合预期的分支

不应记录日志的场景：

- 高频 UI 行为（如 hover）
- 可预期的用户输入错误（用 UI 提示即可）

---

### 8.5 与异常处理的协作原则

- **日志 ≠ 用户提示**
- 日志用于工程排查
- Toast / UI Message 用于用户感知

```ts
try {
  await agentService.fetch();
} catch (err) {
  logger.error("agent.fetch.failed", { err });
  showToast(t("agent.error.network"));
}
```

---

### 8.6 性能与日志

- 避免在 render 中打日志
- 避免在循环中频繁记录日志
- 大对象日志需裁剪

---

## 九、性能优化规范（Performance）

### 8.1 必须遵守

- 避免不必要的 re-render
- 使用 `useMemo / useCallback`
- 组件懒加载

### 8.2 推荐实践

- 列表使用 key
- 图片懒加载
- 防抖 / 节流

---

## 九、复用与“不要重复造轮子”原则

### 9.1 优先级

1. ShipAny 内置能力
2. 项目公共组件
3. Agent 内部封装
4. 新实现（最后选择）

### 9.2 判断是否该封装

- 是否被使用 ≥ 2 次
- 是否有业务语义

---

## 十、代码风格与可读性

### 10.1 强制规范

- 命名语义化
- 函数不超过 50 行
- 注释解释“为什么”，不是“做什么”

### 10.2 示例

```ts
// 好
const isAgentReady = status === "ready";

// 不好
const flag = status === "ready";
```

---

## 十一、Agent 入口规范

```ts
export default function Agent() {
  return (
    <AgentLayout>
      <AgentCore />
    </AgentLayout>
  )
}
```

- 入口只做组合
- 不写复杂逻辑

---

## 十二、Checklist（提交前自检）

- [ ] 无硬编码文案
- [ ] 移动端可用
- [ ] 无重复实现
- [ ] 异常已处理
- [ ] 性能无明显浪费
- [ ] 结构符合 ShipAny 规范

---

## 结语

> **Agent 不是页面，而是可长期演进的能力单元。**

任何代码改动，都应以：

- 是否更易维护
- 是否更易复用
- 是否更易理解

作为最终判断标准。
