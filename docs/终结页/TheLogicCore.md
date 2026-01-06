基于你提供的完整数据包，特别是 `question_data.json`（60道题，7级选项）和 `spectrum_status.json`（0-100分值定义），我为你构建了**核心映射逻辑 (The Logic Core)**。

这套逻辑是整个 App 的心脏，负责把用户的“点击”转化为“人格”。

---

### 1. 基础计分模型 (Scoring Matrix)

你的题目是 **7级量表 (Likert Scale 1-7)**。
为了计算方便，我们在代码逻辑中将其映射为 **权重分 (Weight)**。

设定：每个维度的 **正向 (Direction +)** 代表左边字母（E, S, T, J），**负向 (Direction -)** 代表右边字母（I, N, F, P）。

| 用户选择 (Option Index) | 权重 (Weight) | 含义 (Semantics) | 示例 (Q1: 课间休息) |
| --- | --- | --- | --- |
| **Index 0** (第1个选项) | **+3** | **极度显著 (A端)** | 直接冲到操场大喊 (极E) |
| **Index 1** (第2个选项) | **+2** | 显著 | 拍前桌肩膀 |
| **Index 2** (第3个选项) | **+1** | 轻微倾向 | 试探性微笑 |
| **Index 3** (第4个选项) | **0** | **中立/无倾向** | 等别人来找我 |
| **Index 4** (第5个选项) | **-1** | 轻微倾向 | 看着别人玩 |
| **Index 5** (第6个选项) | **-2** | 显著 | 假装看书 |
| **Index 6** (第7个选项) | **-3** | **极度显著 (B端)** | 躲进厕所 (极I) |

---

### 2. 维度计算公式 (Dimension Calculation)

假设共有 60 题，平均每个维度 15 题。
单维度（如 E vs I）的原始分区间为：`[-45, +45]` (15题 * ±3分)。

我们需要把这个原始分转化为 **0-100 的百分比**，以匹配 `spectrum_status.json`。

#### A. 核心公式

* **Sum_weights**: 用户在该维度所有题目的得分总和（例如 +12）。
* **Max_possible**: 该维度题目数 × 3（例如 15 × 3 = 45）。

#### B. 举例 (计算 E/I 维度)

* 用户 E/I 维度答了 15 题，累计得分 **+9** (说明偏 E)。
* Max = 45。
* 百分比 = `(9 + 45) / 90 * 100` = `54 / 90 * 100` = **60%**。

**映射结果：**

* **60%** 对应 `spectrum_status.json` 里的 `"E_dimension"` -> `"41-60": "社交平衡"`。
* 因为 > 50%，所以主字母判定为 **E**。

---

### 3. 平局判定机制 (Tie-Breaker Rule)

这是所有 MBTI 算法最头疼的地方：如果算出 **50% (0分)** 怎么办？
为了避免出现 `XNTP` 这种无效结果，必须定义**“默认流向”**。

**策略：基于人口统计学的“稀缺性补偿”原则 (Vibe Bias)**
如果是 50/50，我们倾向于判定为**更内敛/更有深度**的一端（因为用户通常更喜欢被描述为“有深度”而非“普通”）。

* **E vs I 平局** → 判定为 **I** (内向者通常更需要心理认同)
* **S vs N 平局** → 判定为 **N** (直觉/脑洞更符合我们“电影票根”的文艺调性)
* **T vs F 平局** → 判定为 **F** (情感更适合做情感化文案)
* **J vs P 平局** → 判定为 **P** (随性更符合“自由灵魂”的定位)

---

### 4. 完整处理流程 (The Pipeline)

这是你写代码时的逻辑伪代码：

```python
class LogicCore:
    def __init__(self):
        # 初始原始分
        self.raw_scores = {"EI": 0, "SN": 0, "TF": 0, "JP": 0}
        # 题目计数 (防止未来题目数量变动)
        self.counts = {"EI": 0, "SN": 0, "TF": 0, "JP": 0}
        
        # 定义平局倾向 (Bias)
        self.tie_breaker = {"EI": "I", "SN": "N", "TF": "F", "JP": "P"}
        # 定义字母映射 (Positive=Left, Negative=Right)
        self.map_char = {
            "EI": {1: "E", -1: "I"},
            "SN": {1: "S", -1: "N"},
            "TF": {1: "T", -1: "F"},
            "JP": {1: "J", -1: "P"}
        }

    def process_answer(self, q_item, opt_index):
        """
        输入: 单个题目对象(q_item), 用户选择索引(0-6)
        """
        # 1. 计算权重 (+3 到 -3)
        weight = 3 - opt_index 
        
        # 2. 累加分数
        dim = q_item['dim']
        self.raw_scores[dim] += weight
        self.counts[dim] += 1
        
        # 3. (并行) 检查彩蛋触发
        # 这一步调用 EggChecker，检查 egg_triggers.json
        # 这一步调用 AchievementTracker，更新 tag 计数

    def get_final_result(self):
        result_type = ""
        spectrum = {}
        
        # 遍历四个维度
        for dim in ["EI", "SN", "TF", "JP"]:
            raw = self.raw_scores[dim]
            max_score = self.counts[dim] * 3
            
            # 1. 计算百分比 (0-100) -> 用于进度条和 spectrum_status.json
            pct = ((raw + max_score) / (2 * max_score)) * 100
            spectrum[dim] = round(pct, 1) # 保留一位小数
            
            # 2. 判定字母
            if raw > 0:
                char = self.map_char[dim][1]
            elif raw < 0:
                char = self.map_char[dim][-1]
            else:
                # 3. 平局处理
                char = self.tie_breaker[dim]
                
            result_type += char
            
        return {
            "mbti_type": result_type,  # e.g., "ENFP"
            "spectrum_scores": spectrum # e.g., {"EI": 85.0, ...}
        }

```

---

### 5. 进阶：如何关联“标签池” (Advanced Tagging)

在 `tags_pool.json` 中，你有 1-10 个等级。逻辑核心需要把 **0-100% 的分** 映射为 **1-10 的 Level**。

**映射公式：**



*(如果 Percent 是 0，强制设为 Level 1)*

* **举例**：
* 用户 E 维度得分 **85%**。
* Level = `ceil(8.5)` = **9**。
* 去 `tags_pool.json` 找 E 维度的 Level 9 → **“社交恐怖分子”**。



---

### 总结 (Summary)

1. **输入**：用户对 60 道题的 `opt_idx` (0-6)。
2. **核心转化**：`Weight = 3 - opt_idx`。
3. **归一化**：将原始累加分转化为 0-100% 的区间。
4. **裁决**：
* `> 50%`：取左边字母 (E/S/T/J)。
* `< 50%`：取右边字母 (I/N/F/P)。
* `= 50%`：取右边字母 (Bias Rule)。


5. **输出**：
* **Result ID** (`ENFP`) -> 查 `results_data.json`。
* **Dimension Levels** (1-10) -> 查 `tags_pool.json`。



这套逻辑完全适配你现有的所有 JSON 数据结构。