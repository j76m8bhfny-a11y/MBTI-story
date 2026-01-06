# 🎬 《重启人生》结果页完整设计方案 (The Life Script Ticket)

## 1. 设计核心理念

* **视觉隐喻**：一张记录了你人生重启轨迹的**“电影票根”**（或“人生账单”）。
* **情感基调**：文艺、治愈、有质感（New Skeuomorphism + 杂志风）。
* **核心目标**：通过**“高颜值票根”** + **“超精准标签”** 激发 16-40 岁女性用户的截图分享欲。

---
### 📱 页面结构图 (Wireframe Diagram)

Plaintext

```
+-------------------------------------------------------+
|  [ 顶部导航栏: 透明 / 返回 ]                            |
+-------------------------------------------------------+
|  (全屏背景: 米色纸纹 #F9F7F2)                          |
|                                                       |
|           ↓ (卡片由此开始，悬浮在背景上) ↓                |
|  +=================================================+  |
|  | [1. 电影海报区 (Movie Poster)]                  |  |
|  |                                                 |  |
|  |   (插画全宽铺满，底部渐变透明)                    |  |
|  |   ...........................................   |  |
|  |   :             [ ENFP ]                    :   |  |
|  |   :      (巨大透明水印，压在插画边缘)          :   |  |
|  |   :.........................................:   |  |
|  |                                                 |  |
|  |   [ 主标题: 住在云端的造梦师 ] (宋体，加粗)      |  |
|  |         [ Slogan: 现实满地六便士... ] (手写体)   |  |
|  |                                                 |  |
|  +-------------------------------------------------+  |
|  | [2. 极简光谱区 (Minimalist Gauge)]              |  |
|  |                                                 |  |
|  |   E (高亮) --------●------------- I (灰)        |  |
|  |              (间歇性社牛)                       |  |
|  |                                                 |  |
|  |   N (高亮) ----●----------------- S (灰)        |  |
|  |              (脑洞微开)                         |  |
|  |                                                 |  |
|  + - - - - - - - - - - - - - - - - - - - - - - - +  | <-- 虚线撕裂口
|  |                                                 |  |
|  | [3. 惊喜贴纸区 (Sticker Tags)]                  |  |
|  |                                                 |  |
|  |  [#核心人设] (黑底白字，微倾斜 -2°)              |  |
|  |                                                 |  |
|  |       [#特质标签] (空心黑框，微倾斜 +3°)         |  |
|  |                                                 |  |
|  |  ✨ [#彩蛋:在逃公主] (金色手绘圈，带闪光)        |  |
|  |                                                 |  |
|  +-------------------------------------------------+  |
|  | [4. 导演手记 (Director's Note)]                 |  |
|  |                                                 |  |
|  |   "在这次重启人生中，你选择了..."                |  |
|  |   (首字下沉，行间距 1.8，像信件一样)             |  |
|  |                                                 |  |
|  |                  Signature: @你的昵称           |  |
|  |                  Date: 2026.01.07               |  |
|  +=================================================+  |
|           ↑ (锯齿状边缘 / 票据底纹) ↑                    |
|                                                       |
|   (底部留白，防止按钮遮挡)                             |
+-------------------------------------------------------+
|  [ 底部悬浮栏 (Glassmorphism 毛玻璃) ]                  |
|  [ ↺ 重拍剧本 ]          [ 📤 领取人生票根 (高亮) ]     |
+-------------------------------------------------------+
```




## 2. 页面结构拆解 (UI Architecture)

页面由**全屏背景**、**悬浮票根容器**、**底部操作栏**三部分组成。

### 2.1 全屏背景 (Background Layer)

* **颜色**：米色纸纹 (`#F9F7F2`)。
* **纹理**：叠加 5% 透明度的噪点图，模拟纸张触感。
* **安全区**：顶部留白 88px（避让刘海），底部留白 120px（避让按钮）。

### 2.2 悬浮票根容器 (The Ticket Container)

这是页面的主体，是一个长条形的卡片，悬浮在屏幕中间。

#### **区域 A：电影海报 (The Poster)**

* **底图**：读取 `results_data.json` 中的 `image_path`（如 `bg_infp.png`）。全宽铺满，底部渐变透明过渡到米色。
* **MBTI 水印**：巨大的、透明度 8% 的 MBTI 代码（如 `ENFP`），字体 Impact 或 DIN，压在插画边缘，营造杂志感。
* **主标题**：读取 `results_data.json` 中的 `alias`（如 **“住在云端的造梦师”**）。使用**宋体 (Serif) 加粗**。
* **Slogan**：读取 `slogan` 字段，使用手写体，错落排版。

#### **区域 B：极简光谱 (The Gauge)**

* **设计**：去框线化，只保留一根细线。
* **数据源**：
* **左/右极文字**：读取 `spectrum_status.json`（如“全场焦点”、“虚实结合”）。**注意：这里不显示搞笑标签，只显示客观状态。**
* **高亮逻辑**：倾向哪边，哪边的字变大变色（主色橙/蓝/红/黄）。


* **样式**：
```text
E (全场焦点) --------●------------- I (偏好独处) [变灰]

```



#### **区域 C：撕裂线 (The Rip)**

* **视觉**：在光谱区和贴纸区之间，画一条虚线，左右两侧各挖一个半圆缺口，模拟票据撕裂痕迹。

#### **区域 D：惊喜贴纸 (Sticker Tags)**

* **布局**：流式布局，标签像手账贴纸一样**微微倾斜**。
* **三个卡槽 (Slots)**：
1. **Slot 1 (核心人设)**：黑底白字。来源：`coretags.json`。
2. **Slot 2 (特质标签)**：空心黑框。来源：`tags_pool.json`。
3. **Slot 3 (惊喜彩蛋)**：金色手绘圈+闪光。来源：`egg_triggers` / `achievements`。



#### **区域 E：导演手记 (Director's Note)**

* **内容**：读取 `results_data.json` 中的 `summary`。
* **排版**：首字下沉 (Drop Cap)，行间距 1.8，像一封信。
* **落款**：
* Signature: @用户昵称
* Date: 2026.01.07 (当前日期)


* **底部边缘**：锯齿状 (Zigzag)，模拟撕下来的小票边缘。

### 2.3 底部操作栏 (Fixed Footer)

* **材质**：毛玻璃效果 (`backdrop-filter: blur(10px)`)。
* **按钮**：
* 左：↺ 重拍剧本 (Retest)
* 右：📤 **领取人生票根** (Generate Poster) - **带流光动效**。



---

## 3. 数据映射逻辑 (Data Logic Guide)

这是开发最关心的部分：**“页面上的字到底从哪个 JSON 里的哪个字段取？”**

| UI 模块 | 显示内容 | 数据来源文件 | 逻辑/Key | 示例值 |
| --- | --- | --- | --- | --- |
| **海报区** | 背景图 | `results_data.json` | 根据 MBTI 匹配 `id` -> `image_path` | `bg_enfp.png` |
|  | 主标题 | `results_data.json` | `alias` | "住在云端的造梦师" |
|  | Slogan | `results_data.json` | `slogan` | "现实满地六便士..." |
| **光谱区** | 状态词 | `spectrum_status.json` | 根据 `score` (0-100) 匹配区间 | "全场焦点" (E>80) |
| **贴纸区** | **Tag 1 (核心)** | `coretags.json` | 找 4 维度中**分最高**的维度 (Dominant) | "#人形萨摩耶" (ENFP且E最高) |
|  | **Tag 2 (特质)** | `tags_pool.json` | 找 4 维度中**绝对值最大**的维度 + Level(1-10) | "#社交恐怖分子" (E Level 9) |
|  | **Tag 3 (彩蛋)** | `egg_triggers` / `achievements` | 优先彩蛋 -> 其次成就 -> 最后低保 | "✨ #在逃公主" |
| **手记区** | 正文 | `results_data.json` | `summary` | "在这次人生重启中..." |

---

## 4. 关键算法伪代码 (Frontend Algorithms)

### 4.1 决定三个贴纸 (Sticker Logic)

```javascript
function generateStickers(mbti, scores, userAnswers) {
  let stickers = [];

  // --- Slot 1: 核心人设 (Core) ---
  // 逻辑: 找出 E,N,F,P 四个维度中百分比最高的那个 (Dominant Trait)
  // scores = { E: 90, N: 60, F: 55, P: 80 }
  let maxDim = getKeyWithMaxScore(scores); // 返回 "E"
  // 从 coretags.json 取值
  let coreTag = CoreTags[mbti][maxDim]; // CoreTags["ENFP"]["E"]
  stickers.push({ text: coreTag, type: 'core', style: 'rotate(-2deg)' });

  // --- Slot 2: 特质标签 (Trait) ---
  // 逻辑: 找出偏离中心(50%)最远的维度，计算 Level (1-10)
  // 假设 E 偏离最远，Level 为 9
  let traitTagList = TagsPool["E_dimension"]["9"];
  let traitTag = getRandom(traitTagList);
  stickers.push({ text: traitTag, type: 'trait', style: 'rotate(1.5deg)' });

  // --- Slot 3: 惊喜彩蛋 (Surprise) ---
  let eggTag = null;
  
  // 1. 检查 One-Shot 彩蛋 (egg_triggers.json)
  for (let trigger of EggTriggers) {
    if (userAnswers[trigger.q_id] === trigger.opt_idx) {
      eggTag = TagsPool.easter_eggs[trigger.tag_key]; // 取出文案
      break; 
    }
  }

  // 2. 如果没彩蛋，检查成就 (achievements.json)
  if (!eggTag) {
    // ... 检查成就逻辑 ...
  }

  // 3. 都没有，用低保 (Fallback)
  if (!eggTag) {
     eggTag = "生活观察家"; // 从 Defaults 列表取
  }

  stickers.push({ text: eggTag, type: 'egg', style: 'rotate(-3deg)' });

  return stickers;
}

```

### 4.2 光谱高亮逻辑

```javascript
// 假设 E_score = 85 (偏向 E)
// 左侧文字 (I端): 变小，变灰
// 右侧文字 (E端): 变大，变主色，文案取 spectrum_status.json["E_dimension"]["81-100"] -> "全场焦点"

```

---

## 5. 样式代码片段 (Copy-Paste CSS)

为了实现“票据感”，这几段 CSS 请直接发给开发：

**1. 底部锯齿边缘 (Zigzag Edge)**

```css
.ticket-bottom-edge {
  width: 100%;
  height: 24rpx;
  background-image: linear-gradient(135deg, transparent 50%, #fff 50%), 
                    linear-gradient(45deg, #fff 50%, transparent 50%);
  background-size: 24rpx 24rpx;
  background-repeat: repeat-x;
  background-position: bottom;
}

```

**2. 中间撕裂线 (Tear Line)**

```css
.tear-line-container {
  position: relative;
  display: flex;
  align-items: center;
  margin: 30rpx 0;
}
/* 左右两个半圆缺口 */
.tear-line-container::before, 
.tear-line-container::after {
  content: '';
  position: absolute;
  width: 30rpx;
  height: 30rpx;
  background-color: #F9F7F2; /* 必须和页面大背景色一致 */
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}
.tear-line-container::before { left: -15rpx; }
.tear-line-container::after { right: -15rpx; }

/* 虚线 */
.dashed-line {
  flex: 1;
  border-bottom: 2px dashed #E0E0E0;
  margin: 0 20rpx;
}

```

**3. MBTI 水印效果**

```css
.mbti-watermark {
  position: absolute;
  top: 100rpx;
  right: -20rpx;
  font-family: 'Impact', sans-serif;
  font-size: 160rpx;
  color: rgba(0,0,0, 0.06); /* 极淡的透明度 */
  pointer-events: none;
  z-index: 0;
}

```

---

## 6. 海报生成策略 (Canvas Strategy)

**注意**：小程序 `canvas` 生成图片时，不支持复杂的 CSS 阴影和高级混合模式。

**降级方案**：

1. **背景图**：直接绘制 `image_path` 图片。
2. **白色卡片**：在 Canvas 上画一个圆角矩形，填充白色。
3. **文字**：使用 Canvas API `fillText` 绘制标题、Slogan、标签。
4. **标签框**：
* **Core**: 画黑底矩形 + 白字。
* **Trait**: 画黑框空心矩形 + 黑字。
* **Egg**: 画金色框 + 金字 + 画一个小星星图标 (Image)。


5. **二维码**：右下角绘制小程序码。

通过这套方案，您的小程序将拥有一个**逻辑严密、视觉高级、且极具传播力**的结果页。