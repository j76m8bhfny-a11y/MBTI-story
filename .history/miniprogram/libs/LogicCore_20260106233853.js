// 引入相关配置文件
const ACH_DEFINITIONS = require('./achievements.json');
const EGG_TRIGGERS = require('./egg_triggers.json');

class LogicCore {
  constructor() {
    // 1. 初始化分数盘
    this.scores = { EI: 0, SN: 0, TF: 0, JP: 0 };
    this.counts = { EI: 0, SN: 0, TF: 0, JP: 0 };
    
    // 2. 初始化标签计数器 (用于成就判定)
    // 格式: { "lazy": 5, "efficiency": 2 ... }
    this.tagTracker = {}; 
    
    // 3. 记录触发的彩蛋 Key
    this.triggeredEggs = []; 
  }

  /**
   * 处理单题选择
   * @param {Object} question - 题目对象 { id: 1, dim: 'EI', tags: ['lazy', 'give_up'] }
   * @param {Number} optIndex - 用户选了第几个 (0-6)
   */
  processAnswer(question, optIndex) {
    // A. 计算基础维度分
    const weight = 3 - optIndex; // 0->+3, 6->-3
    if (this.scores.hasOwnProperty(question.dim)) {
      this.scores[question.dim] += weight;
      this.counts[question.dim] += 1;
    }

    // B. 追踪 Tag (用于成就)
    // 假设 question.options[optIndex] 包含该选项对应的 tag，或者题目本身有 tag
    // 这里简化模型：假设每个选项有对应的 hidden_tags
    const selectedTags = this._getTagsForOption(question, optIndex);
    selectedTags.forEach(tag => {
      this.tagTracker[tag] = (this.tagTracker[tag] || 0) + 1;
    });

    // C. 检查单题彩蛋 (Egg Check)
    // 遍历 egg_triggers.json 看看这道题这个选项是不是彩蛋
    const egg = EGG_TRIGGERS.find(e => e.q_id === question.id && e.opt_idx === optIndex);
    if (egg) {
      this.triggeredEggs.push(egg.tag_key);
    }
  }

  /**
   * 获取最终计算结果
   */
  getFinalResult() {
    let mbtiCode = "";
    let spectrumScores = {};

    // 1. 维度结算
    const dimensions = [
      { key: 'EI', pos: 'E', neg: 'I', tie: 'I' }, // 平局 Bias: I
      { key: 'SN', pos: 'S', neg: 'N', tie: 'N' }, // 平局 Bias: N
      { key: 'TF', pos: 'T', neg: 'F', tie: 'F' }, // 平局 Bias: F
      { key: 'JP', pos: 'J', neg: 'P', tie: 'P' }  // 平局 Bias: P
    ];

    dimensions.forEach(dim => {
      const raw = this.scores[dim.key];
      const max = this.counts[dim.key] * 3;
      
      // 转百分比 (用于 UI 进度条)
      // 公式: (raw + max) / (2 * max) * 100
      let pct = 50;
      if (max > 0) {
        pct = ((raw + max) / (2 * max)) * 100;
      }
      spectrumScores[dim.key] = parseFloat(pct.toFixed(1));

      // 判定字母
      if (raw > 0) mbtiCode += dim.pos;
      else if (raw < 0) mbtiCode += dim.neg;
      else mbtiCode += dim.tie; // 平局处理
    });

    // 2. 成就结算 (扫描所有成就条件)
    const unlockedAchievements = this._checkAchievements();

    return {
      mbti_type: mbtiCode,         // "INFP"
      spectrum_scores: spectrumScores, // { EI: 45.5, ... }
      triggered_eggs: this.triggeredEggs, // ["corner_creature"]
      achievements: unlockedAchievements  // ["lay_flat"]
    };
  }

  // --- Helpers ---

  _getTagsForOption(question, optIndex) {
    // 实际开发中，这里需要从你的 question_data.json 里读取该选项对应的 tags
    // 暂时返回空数组或模拟数据
    return question.options[optIndex].tags || []; 
  }

  _checkAchievements() {
    const unlocked = [];
    // 遍历 achievements.json 对象
    for (const [key, ach] of Object.entries(ACH_DEFINITIONS)) {
      const condition = ach.trigger_condition;
      if (condition.type === 'cumulative_count') {
        let count = 0;
        // 检查目标 tags 的累计值
        condition.target_tags.forEach(tag => {
          count += (this.tagTracker[tag] || 0);
        });
        
        if (count >= condition.threshold) {
          unlocked.push(key);
        }
      }
    }
    return unlocked;
  }
}

module.exports = LogicCore;