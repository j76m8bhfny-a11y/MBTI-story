
## 1. 架构总览 (System Overview)

本项目采用 **"Hybrid Local-Cloud" (本地优先 + 云端存档)** 架构。

- **计算层 (Local)**: 极致的交互响应。MBTI 算分、页面路由、逻辑判断完全在前端完成，**零网络延迟**。
    
- **持久层 (Cloud)**: 利用微信云开发 (TCB) 处理“永久头像存储”、“结果存档”，确保数据不随小程序缓存清理而丢失。
    
- **传输层 (URL State)**: 采用极简 URL Payload 携带社交信息，**无数据库依赖**即可实现裂变。
    

### 1.1 技术选型

|**模块**|**选型**|**理由 & 约束**|
|---|---|---|
|**View**|**WXML + WXSS**|原生渲染，性能最优。|
|**Logic**|**TypeScript**|强类型约束，防止 `undefined` 导致的白屏。|
|**UI Lib**|**Vant Weapp**|**约束: 禁止全局引入**。仅在需要的 Page 中局部注册 (`usingComponents`)，确保 Tree-shaking 生效。|
|**Backend**|**WeChat Cloud**|云函数 (Node.js) + 云数据库 (NoSQL) + 云存储 (CDN)。|
|**Canvas**|**Canvas 2D API**|像素级控制海报生成。|

---

## 2. 工程目录结构 (Directory Structure)

采用标准的微信小程序 `miniprogram + cloudfunctions` 结构。

Plaintext

```
Project-Root
├── cloudfunctions/             # ☁️ 云函数根目录
│   ├── saveTestResult/         # [核心] 存档用户测试结果
│   ├── getShareCode/           # [降级] 生成小程序码 (Plan B)
│   └── userHandshake/          # [鉴权] 静默登录与用户创建
│
├── miniprogram/                # 📱 小程序前端
│   ├── assets/                 
│   │   └── svg/                # [Vector] 矢量资源目录
│   │       └── ruler-scale.svg # [P0] 刻度尺矢量图 (保证任何分辨率下锐利)
│   ├── components/             # 自定义组件
│   │   ├── ruler-slider/       # [P0] 磁吸刻度尺 (核心交互)
│   │   ├── top-notification/   # [P0] 顶部通知条 (替代 Toast)
│   │   └── privacy-popup/      # 隐私协议弹窗
│   ├── data/
│   │   └── questions.ts        # 60道题目配置
│   ├── pages/
│   │   ├── index/              # 首页
│   │   ├── test/               # 答题页
│   │   └── result/             # 结果页
│   ├── utils/
│   │   ├── mbti-core.ts        # [算法] 算分逻辑
│   │   ├── poster-painter.ts   # [绘图] 海报合成逻辑
│   │   └── payload-helper.ts   # [工具] URL参数截断与编码器
│   └── app.ts                  # 全局逻辑
│
├── project.config.json         # 工程配置
└── tsconfig.json               # TypeScript 配置
```

---

## 3. 数据库设计 (Cloud Database Schema)

_(此处保持 V1.6.1 设计不变：`users`, `test_logs`)_

---

## 4. 关键技术决策 (Key Technical Decisions)

### 4.1 鉴权策略：静默登录 (Silent Auth)

- **流程**: `App.onLaunch` -> `userHandshake` 云函数 -> 获取 `_id`。
    
- **原则**: 绝不在用户开始答题前要求授权。
    

### 4.2 刻度尺交互实现 (Magnetic Ruler Logic)

为了实现“精密仪器感”，**严禁使用位图 (PNG/JPG)** 渲染刻度线。

- **渲染方案 (Vector Rendering)**:
    
    - **方案 A (推荐)**: 使用 CSS `background-image: url("data:image/svg+xml,...")` 嵌入 Base64 SVG。
        
    - **方案 B**: 使用 CSS `linear-gradient` 纯代码绘制刻度线。
        
    - **目的**: 确保在 iPhone Retina 屏幕及 Android 高分屏上，刻度线边缘像刀锋一样锐利，无锯齿。
        
- **核心算法**:
    
    - 监听 `touch` 事件，计算偏移量。
        
    - 实现 `Math.round()` 磁吸逻辑。
        
    - 配合 `Haptics` (震动) 提供物理反馈。
        

### 4.3 URL State Transfer (社交裂变 - 优化版)

- **编码**: `encodeURIComponent` + 截断 (前10字符)。
    
- **容错**: `decodeURIComponent` 失败时降级显示“神秘朋友”，杜绝白屏。
    

### 4.4 头像持久化 (Avatar Persistence)

- **红线**: `chooseAvatar` 临时路径 -> `wx.cloud.uploadFile` -> 存 FileID。
    

---

## 5. 工程化构建与性能 (Build & Performance)

### 5.1 包体积控制 (Bundle Optimization) - 🚨 强制执行

为了确保主包体积 < 1.5MB (留出 500KB 给首屏资源)：

1. **Vant Weapp 按需引入**:
    
    - **禁止**: 在 `app.json` 中 `usingComponents` 注册 Vant 组件。
        
    - **必须**: 在具体页面 (如 `pages/result/index.json`) 中仅引入该页用到的组件 (如 `van-popup`)。
        
2. **Tree Shaking**:
    
    - 启用开发者工具“上传代码时自动压缩混淆”。
        
    - 启用“上传代码时自动移除无用样式”。
        

### 5.2 资源分层策略

- **Main Package**: 核心代码 + SVG 资源 (体积极小)。
    
- **Sub Packages**: 高清位图 (Results BG) 必须分包或走 CDN。
    

---

## 6. 开发优先级 (Sprint Plan)

1. **P0 (Interaction)**: 开发 `ruler-slider` 组件 (使用 CSS/SVG 绘制刻度，调教磁吸手感)。
    
2. **P0 (Social)**: 实现 URL `payload-helper` 及结果页海报绘制。
    
3. **P1 (Backend)**: 云函数环境搭建与 `users` 集合索引建立。
    

---
