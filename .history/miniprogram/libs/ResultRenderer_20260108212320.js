// miniprogram/libs/ResultRenderer.js
const RESULTS_DATA = require('../data/results_data.js');
const TAGS_POOL = require('../data/tags_pool.js');
const STATUS_MAP = require('../data/spectrum_status.js');
const EGG_DEFINITIONS = require('../data/egg_triggers.js');
const ACH_DEFINITIONS = require('../data/achievements.js');

class ResultRenderer {
  render(logicOutput) {
    const { mbti_type, spectrum_scores, triggered_eggs, achievements } = logicOutput;
    const baseProfile = this._getBaseProfile(mbti_type);
    
    // 1. 生成动态趋势数据 (同时获取 胶囊词 和 贴纸候选词)
    const trends = this._generateTrends(spectrum_scores);

    // 2. 生成精选贴纸 (Core + Achievement + Egg)
    const stickers = this._generateStickers(trends, triggered_eggs, achievements);

    return {
      poster: {
        type: mbti_type,
        title: baseProfile.alias,
        slogan: baseProfile.slogan,
        life_script: baseProfile.life_script || "一部充满奇幻色彩、温暖又略带忧伤的剧情片",
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

  // 生成趋势图数据
  _generateTrends(scores) {
    const mapKey = { 'EI': ['E', 'I'], 'SN': ['S', 'N'], 'TF': ['T', 'F'], 'JP': ['J', 'P'] };
    const dimMap = { 'EI': 'E_dimension', 'SN': 'N_dimension', 'TF': 'F_dimension', 'JP': 'J_dimension' };
    
    return Object.keys(scores).map(key => {
      const score = scores[key]; // 0-100 (左边维度的分值)
      const chars = mapKey[key];
      const dimKey = dimMap[key];
      
      const isLeftWin = score >= 50;

      // === [A] 获取胶囊文案 (Status Text) ===
      // 逻辑：根据分数段去 spectrum_status.js 找严谨的定义
      // === 胶囊文案 (严谨) ===
      let rangeKey = "41-60";
      if (score <= 20) rangeKey = "0-20";
      else if (score <= 40) rangeKey = "21-40";
      else if (score <= 60) rangeKey = "41-60";
      else if (score <= 80) rangeKey = "61-80";
      else rangeKey = "81-100";
      
      const statusText = STATUS_MAP[dimKey][rangeKey] || "未知";

      // === [B] 获取贴纸文案 (Fun Tag) ===
      // 逻辑：根据 1-10 级去 tags_pool.js 找趣味标签
      let level = Math.ceil(score / 10);
      if (level === 0) level = 1; if (level > 10) level = 10;
      
      const pool = TAGS_POOL[0][dimKey];
      // 兼容处理：如果找不到对应level，默认用level 5
      const tagList = pool[String(level)] || pool["5"];
      const funTag = tagList[Math.floor(Math.random() * tagList.length)];

      // === 🔥 核心修复：计算气泡的对齐方式 ===
      // score 是左边维度的分值 (0-100)
      // 如果 score 很小 (偏右 I/N/F/P)，或者很大 (偏左 E/S/T/J)，需要特殊处理
      let pillClass = ''; 
      
      // 注意：这里我们假设 WXML 里会用 {{item.score}}% 来定位
      // 如果 score > 85 (也就是在最右边 85%-100%) -> 气泡要靠右对齐 (避免出界)
      // 如果 score < 15 (也就是在最左边 0%-15%)  -> 气泡要靠左对齐
      // (具体的方向取决于你的 left 写法，下面 WXML 我会统一成正向逻辑)
      
      if (score >= 85) {
        pillClass = 'pos-left'; // 靠右
      } else if (score <= 15) {
        pillClass = 'pos-right';  // 靠左
      }

      return {
        key,
        leftChar: chars[0],
        rightChar: chars[1],
        score: score,
        isLeftWin,
        statusText, // 用于趋势图胶囊
        funTag,      // 用于生成贴纸
        pillClass
      };
    });
  }

  // 辅助：将分数映射到 0-20, 21-40... 的 Key
  _getScoreRangeKey(score) {
    if (score <= 20) return "0-20";
    if (score <= 40) return "21-40";
    if (score <= 60) return "41-60";
    if (score <= 80) return "61-80";
    return "81-100";
  }

  // 生成贴纸列表 (按你的新逻辑)
  _generateStickers(trends, eggs, achievements) {
    const stickers = [];
    
    // 1. 先对性格维度按“极端程度”排序
    // (比如 E 95分 > J 80分 > N 60分 > F 55分)
    const sortedTrends = [...trends].sort((a, b) => Math.abs(a.score - 50) - Math.abs(b.score - 50)).reverse();

    // -----------------------------------------------------
    // [槽位 1] 核心主宰 (Core): 绝对是性格最鲜明的那一点
    // -----------------------------------------------------
    stickers.push({
      text: sortedTrends[0].funTag, 
      type: 'core' // 黑底白字
    });

    // -----------------------------------------------------
    // [槽位 2] 稀有成就 (Trait/Achievement)
    // -----------------------------------------------------
    // 逻辑：如果有成就，就展示成就；
    //      如果没有成就，就展示“第二鲜明”的性格词 (不做保底废物！)
    if (achievements && achievements.length > 0) {
      const achKey = achievements[0];
      const achDef = ACH_DEFINITIONS[achKey];
      if (achDef) {
        stickers.push({
          text: achDef.title, 
          type: 'trait' // 白底黑框
        });
      }
    } else {
      // 🔥 没成就？那就把你的第二人格拿出来！
      stickers.push({
        text: sortedTrends[1].funTag, 
        type: 'trait'
      });
    }

    // -----------------------------------------------------
    // [槽位 3] 隐藏彩蛋 (Egg)
    // -----------------------------------------------------
    // 逻辑：有彩蛋就秀彩蛋，没彩蛋就... 
    //      (选项 A: 留空，保持稀缺感) -> 我推荐这个
    //      (选项 B: 再补一个第三性格) -> 如果你非要凑3个，可以用 sortedTrends[2]
    if (eggs && eggs.length > 0) {
      const eggKey = eggs[0];
      const eggDef = EGG_DEFINITIONS.find(e => e.tag_key === eggKey);
      if (eggDef) {
        const match = eggDef.desc.match(/\((.*?)\)/);
        const eggText = match ? match[1] : eggKey;
        stickers.push({
          text: eggText, 
          type: 'egg' // 米黄底虚线框
        });
      }
    }

    return stickers;
  }
}

module.exports = new ResultRenderer();