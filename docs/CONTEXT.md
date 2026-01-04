
# `CONTEXT.md`

> Role: Technical Committee Chair
> 
> Version: 1.6.1 (Final Polish)
> 
> Status: FROZEN (Strict Adherence Required)

## 1. Project Metadata

- **Project Name**: LifeMBTI ("重启人生" MBTI Simulator)
    
- **Platform**: WeChat Mini-Program (Native)
    
- **Core Value**: An immersive, "Life Simulation" styled MBTI test replacing abstract questions with 60 localized life scenarios.
    
- **Key Architecture**: **Local-First** (Zero-latency interaction) + **URL State Transfer** (Database-free social fission) + **Cloud Storage** (Asset persistence).
    
- **Target Audience**: 16-40y Females (Keywords: Exquisite, Healing, Ritualistic).
    

---

## 2. Tech Stack (Mandatory)

All code generated must strictly adhere to this stack.

|**Layer**|**Technology**|**Constraint**|
|---|---|---|
|**Runtime**|**WeChat Native**|WXML, WXSS, TypeScript (Strict Mode).|
|**UI Library**|**Vant Weapp**|`@vant/weapp`. Must use **NPM Build** flow.|
|**Logic**|**TypeScript**|No `any` types allowed. Strict null checks.|
|**Backend**|**WeChat Cloud (TCB)**|Cloud Functions (Node.js), Cloud DB (NoSQL).|
|**Rendering**|**CSS3 / SVG**|**No Bitmap images** for UI controls (Ruler/Buttons).|

---

## 3. Project Configuration (Critical Setup)

### 3.1 Directory & Build Config (`project.config.json`)

JSON

```
{
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "setting": {
    "packNpmManually": true,
    "packNpmRelationList": [
      {
        "packageJsonPath": "./package.json",
        "miniprogramNpmDistDir": "./miniprogram/"
      }
    ]
  }
}
```

### 3.2 Global App Config (`miniprogram/app.json`)

**Strict Rule**: Force Light Mode and specific Vant setup.

JSON

```
{
  "pages": [
    "pages/index/index",
    "pages/test/index",
    "pages/result/index"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#FFFBF5",
    "navigationBarTitleText": "LifeMBTI",
    "navigationBarTextStyle": "black"
  },
  "darkmode": false,
  "style": "v2",
  "sitemapLocation": "sitemap.json"
}
```

### 3.3 Dependency Management (NPM)

#### A. Miniprogram (Vant Weapp)

1. Run `npm install` in project root.
    
2. **Action**: In WeChat DevTools, run `Tools -> Build npm`.
    
3. **Import Rule**: When registering components in `page.json`:
    
    - ✅ **Correct**: `"van-button": "@vant/weapp/button/index"`
        
    - ❌ **Wrong**: `"van-button": "../../miniprogram_npm/@vant/weapp/button/index"` (Do not use physical paths).
        

#### B. Cloud Functions (Backend)

**CRITICAL**: Dependencies are **NOT** inherited from the root.

1. You **MUST** define `package.json` inside **EACH** cloud function folder (e.g., `cloudfunctions/saveTestResult/`).
    
2. You **MUST** run `npm install` inside that specific folder before deploying.
    
3. **Mandatory Dependency**: `wx-server-sdk` is required in every cloud function.
    

---

## 4. Database Schema (CloudBase JSON)

**Rule**: Do not read/write fields not defined here.

### Collection: `questions` (题目表)
* **用途**: 存储所有测试题目。
* **Source**: 结构严格参考 `assets/question_data.json`。
* **Schema Definition**:
    ```json
    {
      "id": 1,              // [Number] 题目唯一序号 (Business ID)
      "dim": "EI",          // [String] 维度标识 (E:外向 / I:内向)
      "dir": 1,             // [Number] 正反向计分标识 (1: 正向, -1: 反向)
      "txt": "...",         // [String] 题目情境描述
      "opts": [             // [Array<String>] 选项列表
         "直接冲到...",      // Index 0 (对应最 E 的选项?) -> AI需注意：选项顺序是否对应分值
         "拍拍前桌...",
         ...
      ]
    }
    ```
* **⚠️ Data Logic Note (重要逻辑)**: 
    * `opts` 是一个字符串数组。
    * 前端渲染时，必须遍历 `opts` 生成按钮。
    * **计分逻辑**: 既然 JSON 中没有显式的分数 (`score`) 字段，默认假设 **数组索引 (Index)** 与分值相关，或者该题目是单选。*(请在开发逻辑中确认：是根据选中的 index 计算分数，还是只是单纯记录用户的选择？此处假设为记录选择文本或 Index)*。
    
### Collection: `users`

_Stores user identity and permanent asset links._

JSON

```
{
  "_id": "OPENID_derived_string",
  "_openid": "OFFICIAL_OPENID",
  "nickname": "String (User Provided)",
  "avatar_file_id": "String (cloud://... Permanent Storage Path)",
  "created_at": "ServerDate",
  "last_login": "ServerDate"
}
```

### Collection: `test_logs`

_Stores test history._

JSON

```
{
  "_id": "Auto_Generated",
  "_openid": "OFFICIAL_OPENID",
  "mbti_result": "String (e.g., 'ENFP')",
  "dimension_scores": {
    "E_I": "Number (-30 to +30)",
    "S_N": "Number",
    "T_F": "Number",
    "J_P": "Number"
  },
  "answers_snapshot": [ 
      { "q_id": 1, "selected_index": 0 }
  ],
  "timestamp": "ServerDate",
  "is_shared": "Boolean"
}
```

---

## 5. Design Guidelines & CSS System

### 5.1 The "Healing Palette" Variables

**Rule**: In WXSS, **ALWAYS** use `var(--variable-name)`. Never hardcode Hex codes.

**Paste this block into `miniprogram/app.wxss`:**

CSS

```
page {
  /* --- 🎨 Palette (Morandi / Cream) --- */
  --van-primary-color: #BFA6D9;       /* Haze Purple: Mystery/Subconscious */
  --van-background-color: #FFFBF5;    /* Cream White: Paper texture */
  --van-text-color: #4A4A4A;          /* Warm Grey: Main Text */
  --text-sub-color: #9B9B9B;          /* Neutral Grey: Sub Text */
  --accent-color: #FFB7B2;            /* Peach: Highlights/Pointers */

  /* --- 🧩 Shape & Feel --- */
  --van-button-border-radius: 999px;  /* Pill Shape */
  --van-button-default-height: 48px;
  --van-button-default-background-color: rgba(255, 255, 255, 0.92); /* Pseudo-Glass */
  --van-button-default-border-color: rgba(255, 255, 255, 0.5);
  
  /* --- 📝 Typography --- */
  --van-font-size-md: 17px;           /* Large body text */
  --van-line-height-md: 1.8;          /* High breathing room */
  
  /* --- 📦 Layout --- */
  --van-cell-group-inset-padding: 0 24px;
  --van-border-radius-lg: 24px;
}

/* Utility: Android-Safe Glass Effect */
.glass-effect {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 24px rgba(191, 166, 217, 0.15);
}

/* Utility: F-Pattern Layout Helper */
.scenario-text {
  text-align: left;
  font-weight: 400;
  line-height: 1.8;
  color: var(--van-text-color);
}
```

### 5.2 Key Interaction: The Magnetic Ruler

- **Visuals**: No Numbers. Pure Geometry.
    
    - Center (0) = Hollow Circle (○)
        
    - Extremes (±3) = Solid Large Point/Star (⬤)
        
- **Implementation**: SVG Background or CSS Gradients only. **No Bitmap Images** to ensure sharpness on Retina screens.
    
- **Feedback**: `uni.vibrateShort` on tick crossing.
    

---

## 6. Functional Specs & Logic (Critical)

### 6.1 Data Persistence (Red Line)

- **Avatar**: The path returned by `chooseAvatar` is temporary. You **MUST** immediately upload it via `wx.cloud.uploadFile` to get a `fileID` before saving to the DB.
    

### 6.2 Social Fission (URL Payload)

- **Sender**: User A finishes test -> Generate Share URL.
    
    - Format: `/pages/index?mode=guest&mbti=ENFP&nick=ENCODED_NAME`
        
- **Receiver**: User B opens URL ->
    
    1. Parse `mode=guest`.
        
    2. Decode `nick` (Handle `decodeURIComponent` errors safely).
        
    3. Render User A's result using local assets (`bg_enfp.png`).
        
    4. Show "Reset My Life" button (Clears params -> Reloads app).
        

### 6.3 Canvas Generation (Robustness)

- Use `Promise.race` for generating the result poster.
    
    - **Plan A (4s)**: Download High-Res BG + Avatar -> Draw Canvas.
        
    - **Plan B (Timeout)**: Fallback to solid color background + QR Code.
        
    - **Avoid White Screen**: Never block UI indefinitely while drawing.
        

---

## 7. Development Rules (The Code of Law)

1. **Vant First Policy**: Before writing custom UI, check Vant Weapp documentation. Use `van-button`, `van-popup`, `van-transition` wherever possible.
    
2. **Strict TypeScript**: Define Interfaces for all data models (e.g., `interface Question`, `interface UserProfile`). No implicit `any`.
    
3. **Cloud Deployment**: If you modify code in `cloudfunctions/`, you must output a comment/log reminding the user: _"⚠️ Please right-click 'cloudfunctions' and select 'Upload and Deploy: Cloud Installation'"_.
    
4. **Error Handling**:
    
    - Network requests must have `catch` blocks.
        
    - Critical failures (e.g., Load failed) must use `wx.showToast({ icon: 'none' })` to inform the user.
        
5. **Performance**:
    
    - **Debounce**: All "Confirm/Next" buttons must have a 500ms debounce/throttle.
        
    - **Tree Shaking**: Only register Vant components in `page.json` `usingComponents`, NOT globally.
6. **Type Definitions (强制使用)**
    所有涉及题目的代码，必须使用以下 Interface，禁止使用 `any`：

    ```typescript
    // miniprogram/types/index.ts (建议新建类型文件)

    export interface QuestionOption {
    text: string;
    value: number; // 如果后续需要把 index 映射为分数
    }

    export interface Question {
    _id?: string;       // 云数据库自动生成的 ID
    id: number;         // 题目序号
    dim: string;        // 维度: 'EI' | 'SN' | 'TF' | 'JP'
    dir: number;        // 方向: 1 | -1
    txt: string;        // 题干
    opts: string[];     // 选项文本数组
    }
