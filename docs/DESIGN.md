# DESIGN.md - Project Life-MBTI (V2.0 Production Ready)

## 0. 设计综述 (Executive Summary)

* **目标用户**: 16-40岁女性（追求精致感、治愈感、仪式感）。
* **核心隐喻**: **"心灵手账" (Digital Journal)**。
* **设计哲学**: 在高颜值（Ins风/杂志感）与高可用性（阅读效率/性能）之间取得完美平衡。

---

## 1. 色彩系统 (Color System: The Healing Palette)

采用低饱和度、高明度的“莫兰迪色系”，通过 AAA 级对比度测试。

| 角色 | 色值 (HEX) | 说明 | 心理学暗示 |
| --- | --- | --- | --- |
| **Canvas** | **`#FFFBF5`** | 奶油白 | 像书页一样的纸质感，防视疲劳。 |
| **Primary** | **`#BFA6D9`** | 雾霾紫 | 梦幻、潜意识、神秘但温柔。 |
| **Accent** | **`#FFB7B2`** | 蜜桃粉 | 活力点缀，用于指针/强倾向反馈。 |
| **Text Main** | **`#4A4A4A`** | 深暖灰 | 比纯黑更柔和，阅读舒适度高。 |
| **Text Sub** | **`#9B9B9B`** | 中性灰 | 用于辅助说明。 |

---

## 2. 字体与排版 (Typography & Layout)

**修正策略**: 严格区分“装饰性文本”与“功能性文本”，彻底解决阅读疲劳问题。

### 2.1 排版规则

* **标题/短语 ( < 10字 )**: **居中对齐 (Center)**。
* *适用*: 结果页大标题、顶部阶段提示、按钮文字。
* *目的*: 营造仪式感和平衡感。


* **场景描述/题目 ( > 10字 )**: **左对齐 (Left)**。
* *适用*: 60道测试题正文。
* *布局技巧*: 文本容器在屏幕居中，但容器内的文字左对齐。
* *目的*: 也就是 **F-Pattern** 阅读模式，固定左侧视线落点，降低眼球扫视负荷。



### 2.2 字体参数

* **正文 (Body)**:
* Size: `17px` (34rpx) —— 兼顾精致与易读。
* Weight: `400` (Regular) —— **严禁使用粗体**，避免笨重感。
* Line-Height: `1.8` —— 也就是 1.8倍行距，增加呼吸感。


* **标题 (Heading)**:
* Size: `22px` (44rpx)。
* Weight: `600` (Semi-Bold)。



---

## 3. 核心交互组件 (Interactive Components)

### 3.1 "态度光谱"刻度尺 (The Attitude Ruler)

**修正策略**: 修正符号隐喻，消除“中心化偏差”。

* **符号语义**:
* **中心 (0)**: **空心圆环 (○)** 或 **菱形 (◇)**。
* *隐喻*: "空"、"无感"、"待定"。不带任何褒义色彩，防止用户无脑选中间。


* **中间级 (±1, ±2)**: 实心圆点 (• ●)，大小递增。
* **两端极值 (±3)**: **闪光星形 (✨)** 或 **大光晕点**。
* *隐喻*: "高光时刻"、"强烈共鸣"。暗示这是一种值得确认的态度。




* **滑块 (Cursor)**:
* 形态: **水滴** 或 **磨砂玻璃球**。
* 动效: `Spring` 物理回弹。松手后滑块会像果冻一样“弹”进刻度槽。



### 3.2 按钮与卡片 (Android 兼容性优化)

**修正策略**: 放弃实时模糊，采用“伪磨砂”方案，确保千元机流畅运行。

* **材质模拟 (Pseudo-Glass)**:
* ❌ 禁用: `backdrop-filter: blur(20px)` (会导致 Android 掉帧/变灰)。
* ✅ 采用: 高透明度的乳白色叠加。
```css
background: rgba(255, 255, 255, 0.92); /* 高不透明度模拟磨砂质感 */
border: 1px solid rgba(255, 255, 255, 0.6); /* 强化边缘光泽 */
box-shadow: 0 8px 32px rgba(191, 166, 217, 0.15); /* 柔和的有色投影 */

```




* **形状**:
* 按钮: `999px` 全圆角。
* 卡片: `24px` 大圆角 (iOS 风格)。



---

## 4. 全局反馈规范 (Feedback System)

* **触觉反馈 (Haptics)**:
* 滑动经过刻度: `uni.vibrateShort({ type: 'light' })` (轻微、清脆)。
* 吸附归位: `uni.vibrateShort({ type: 'medium' })` (确切的顿挫感)。


* **视觉反馈 (Visual)**:
* 点击按钮: 按钮整体 `scale(0.96)` (轻微缩小)。
* 切换题目: **淡入淡出 (Fade)** 300ms，严禁使用左右滑动的推拉效果（避免产生眩晕感）。



---

## 5. Vant Weapp 样式覆盖 (Production Code)

请将以下代码块直接追加到 `app.wxss`。

```css
page {
  /* --- 🎨 调色板 (Palette) --- */
  --van-primary-color: #BFA6D9; /* 雾霾紫 */
  --van-background-color: #FFFBF5; /* 奶油白 */
  --van-text-color: #4A4A4A; /* 深暖灰 */
  
  /* --- 🧩 组件形态 (Shape) --- */
  /* 按钮：伪磨砂风格，大圆角 */
  --van-button-border-radius: 999px;
  --van-button-default-height: 48px;
  --van-button-default-background-color: rgba(255, 255, 255, 0.92);
  --van-button-default-border-color: rgba(255, 255, 255, 0.5);
  /* 按钮投影 (需配合 class 使用，变量无法定义 shadow) */
  
  /* --- 📝 排版细节 (Typography) --- */
  --van-font-size-md: 17px; /* 增大字号 */
  --van-line-height-md: 1.8; /* 增大行高 */
  
  /* --- 📦 容器 (Container) --- */
  --van-cell-group-inset-padding: 0 24px;
  --van-border-radius-lg: 24px;
  
  /* --- 🚫 禁用样式修正 --- */
  /* 避免禁用态太丑 */
  --van-button-disabled-opacity: 0.6;
}

/* --- 🛠️ 通用辅助类 (Utility Classes) --- */

/* 伪磨砂玻璃效果 (Android Safe) */
.glass-effect {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 24px rgba(191, 166, 217, 0.15);
}

/* 文本阅读优化 */
.scenario-text {
  text-align: left; /* 强制左对齐 */
  font-weight: 400; /* Regular */
  line-height: 1.8;
  color: #4A4A4A;
}

/* 标题仪式感 */
.ritual-title {
  text-align: center;
  font-weight: 600;
  letter-spacing: 1px;
}

```

---

## 6. 开发红线检查清单 (Dev Checklist)

在验收阶段，请测试/开发人员务必核对以下三点：

1. **[ ] Android 真机测试**: 确保在千元机上，所有半透明背景没有变成“纯灰色块”，且滑动流畅。
2. **[ ] 文本对齐检查**: 检查 Q1-Q5 的长文本是否为左对齐？阅读时眼睛是否累？
3. **[ ] 中心偏差测试**: 观察测试用户（内部测试）是否还会无脑选中间？如果中间仍是高频选项，需进一步缩小中心圆环的视觉权重。

## 7. 工程配置 (Critical Config)强制浅色模式 (Force Light Mode)
本项目的视觉传达高度依赖“奶油色系”，严禁受系统深色模式影响。 开发人员必须在 project.config.json 或 app.json 中明确配置：
JSON
"window": {
  "backgroundTextStyle": "light",
  "navigationBarBackgroundColor": "#FFFBF5",
  "navigationBarTitleText": "LifeMBTI",
  "navigationBarTextStyle": "black"
},
"darkmode": false  // ⛔️ 核心：彻底禁用深色模式自动适配