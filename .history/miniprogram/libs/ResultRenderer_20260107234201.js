const RESULTS_DATA = require('../data/results_data.js');
const TAGS_POOL = require('../data/tags_pool.js');
const CORE_TAGS = require('../data/coretags.js');
const STATUS_MAP = require('../data/spectrum_status.js');
const DEFAULTS = require('../data/defaults.js');
const EGG_DEFINITIONS = require('../data/egg_triggers.js');
const ACH_DEFINITIONS = require('../data/achievements.js');

class ResultRenderer {
  render(logicOutput) {
    const { mbti_type, spectrum_scores, triggered_eggs, achievements } = logicOutput;
    const baseProfile = this._getBaseProfile(mbti_type);
    
    // 1. 生成动态趋势数据 (The Dynamic Trends)
    const trends = this._generateTrends(spectrum_scores);

    // 2. 生成 3 个精选贴纸 (The 3 Stickers)
    const stickers = this._generateThreeStickers(trends, triggered_eggs, achievements);

    return {
      poster: {
        type: mbti_type,
        title: baseProfile.alias,
        slogan: baseProfile.slogan,
        life_script: baseProfile.life_script || "一部充满奇幻色彩、温暖又略带忧伤的剧情片", // 保底文案
        summary: baseProfile.summary,
        bg_image: baseProfile.image_path,
      },
      trends: trends,
      stickers: stickers
    };
  }

  // --- Helpers ---

  _getBaseProfile(mbti) {
    return RESULTS_DATA.find(item => item.id === mbti) || RESULTS_DATA[0];
  }

  // 生成趋势图数据：决定谁是赢家
  _generateTrends(scores) {
    const mapKey = { 'EI': ['E', 'I'], 'SN': ['S', 'N'], 'TF': ['T', 'F'], 'JP': ['J', 'P'] };
    const dimMap = { 'EI': 'E_dimension', 'SN': 'N_dimension', 'TF': 'F_dimension', 'JP': 'J_dimension' };
    
    return Object.keys(scores).map(key => {
      const score = scores[key]; // 0-100 (左边维度的分值)
      const chars = mapKey[key];
      const dimKey = dimMap[key];
      
      // 计算赢家 (Winner)
      // score >= 50 意味着左边赢 (如 E)，score < 50 意味着右边赢 (如 I)
      const isLeftWin = score >= 50;
      const finalScore = score; // 保持原始分数用于绘图

      // 获取状态词
      let level = Math.ceil(score / 10);
      if (level === 0) level = 1; if (level > 10) level = 10;
      const pool = TAGS_POOL[0][dimKey];
      const tagList = pool[String(level)] || pool["5"];
      const statusText = tagList[Math.floor(Math.random() * tagList.length)];

      return {
        key,
        leftChar: chars[0],
        rightChar: chars[1],
        score: finalScore, // 0-100
        isLeftWin, // 核心逻辑标志位
        statusText, // 胶囊里的词
        tag: statusText // 用于后续提取贴纸
      };
    });
  }

  // 筛选 3 个贴纸
  _generateThreeStickers(trends, eggs, achievements) {
    // 按极端程度排序找 Core 和 Trait
    const sortedTrends = [...trends].sort((a, b) => Math.abs(a.score - 50) - Math.abs(b.score - 50)).reverse();
    
    // 彩蛋文案
    let eggText = "生活观察家";
    if (eggs && eggs.length > 0) {
      const eggDef = EGG_DEFINITIONS.find(e => e.tag_key === eggs[0]);
      if (eggDef) eggText = eggDef.desc.match(/\((.*?)\)/)?.[1] || eggs[0];
    } else if (achievements && achievements.length > 0) {
      const achDef = ACH_DEFINITIONS[achievements[0]];
      if (achDef) eggText = achDef.title;
    }

    return [
      { text: sortedTrends[0].tag, type: 'core' },
      { text: sortedTrends[1].tag, type: 'trait' },
      { text: eggText, type: 'egg' }
    ];
  }
}

module.exports = new ResultRenderer();
