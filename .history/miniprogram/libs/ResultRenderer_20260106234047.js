// 引入数据文件
// 注意：因为本文件在 libs/ 目录下，而数据在 data/ 目录下，所以使用 ../data/
const RESULTS_DATA = require('../data/results_data.js');     // 16型主数据
const TAGS_POOL = require('../data/tags_pool.js');           // 维度程度标签库
const CORE_TAGS = require('../data/coretags.js');            // 4字母核心词
const STATUS_MAP = require('../data/spectrum_status.js');    // 能量条文案
const DEFAULTS = require('../data/defaults.js');             // 兜底贴纸
const EGG_DEFINITIONS = require('../data/egg_triggers.js');  // 彩蛋定义
const ACH_DEFINITIONS = require('../data/achievements.js');  // 成就定义

class ResultRenderer {
  constructor() {
    // 定义贴纸坑位上限 (根据 UI 设计，最多展示5个)
    this.MAX_STICKERS = 5; 
  }

  /**
   * 主渲染函数
   * @param {Object} logicOutput - 来自 Logic Core 的计算结果
   * @returns {Object} viewModel - 直接供 UI 绑定的数据对象
   */
  render(logicOutput) {
    // 解构逻辑层的输出
    const { mbti_type, spectrum_scores, triggered_eggs, achievements } = logicOutput;

    // 1. 获取基础人设数据 (Base Profile)
    const baseProfile = this._getBaseProfile(mbti_type);

    // 2. 获取核心四字标签 (Core Tags: I, S, T, J)
    const coreTags = this._getCoreTags(mbti_type);

    // 3. 计算并获取动态维度文案 (Spectrum Data)
    const spectrumData = this._getSpectrumData(spectrum_scores);

    // 4. 组装贴纸墙 (Sticker Wall: 彩蛋 + 成就 + 兜底)
    const stickers = this._mixStickers(triggered_eggs, achievements);

    // 5. 返回最终视图模型 (ViewModel)
    // 这个对象就是 result.js 里 setData 的 ui 对象
    return {
      // 头部海报区
      poster: {
        type: mbti_type,                // "ISTJ"
        title: baseProfile.alias,       // "时光长河的守护者"
        slogan: baseProfile.slogan,     // "在无序的世界里..."
        summary: baseProfile.summary,   // 长文案
        bg_image: baseProfile.image_path, // 图片路径
        life_script: baseProfile.life_script // "一部逻辑严密的..."
      },
      
      // 核心字母区 (用于海报视觉增强)
      keywords: coreTags, // [{ char: "I", text: "人形保险箱" }, ...]

      // 能量条区 (E/I, S/N...)
      gauge: spectrumData, // { EI: { score: 85, tag: "社交恐怖分子"... }, ... }

      // 贴纸区 (混合后的数组)
      stickers: stickers // [{ text: "角落生物", type: "egg" }, ...]
    };
  }

  // --- 内部 Helper 方法 ---

  // 1. 查找主数据 (results_data.js)
  _getBaseProfile(mbti) {
    // 假设 results_data 是一个数组，我们需要 find
    const target = RESULTS_DATA.find(item => item.id === mbti);
    // 兜底防止报错：如果找不到（比如代码写错），默认返回第一个结果
    return target || RESULTS_DATA[0]; 
  }

  // 2. 获取4个字母的核心词 (coretags.js)
  _getCoreTags(mbti) {
    // mbti = "ISTJ" -> chars = ['I', 'S', 'T', 'J']
    const chars = mbti.split(''); 
    const dict = CORE_TAGS[mbti]; // 获取该类型的字典
    
    return chars.map(char => ({
      char: char,
      text: dict ? dict[char] : "未知" // 查表 coretags.js
    }));
  }

  // 3. 核心：计算维度状态和标签 (tags_pool.js & spectrum_status.js)
  _getSpectrumData(scores) {
    // LogicCore 输出的 Key 是 "EI", "SN"...
    // 但是前端 tags_pool 用的是 "E_dimension", "N_dimension"...
    // 这里做个映射
    const mapKey = { 
      'EI': 'E_dimension', 
      'SN': 'N_dimension', 
      'TF': 'F_dimension', 
      'JP': 'J_dimension' 
    };
    
    let result = {};

    for (let logicKey in scores) {
      const score = scores[logicKey]; // 0-100
      const dimKey = mapKey[logicKey]; // "E_dimension"

      // A. 计算 Level (1-10) 用于查 tags_pool
      // 逻辑: 85分 -> Level 9 (因为数组是从1开始，或者你可以 Math.ceil(85/10))
      let level = Math.ceil(score / 10);
      if (level === 0) level = 1; 
      if (level > 10) level = 10;

      // B. 查 tags_pool.js
      // 数据结构是 [{ "E_dimension": { "1": [...], "9": [...] } }]
      // 注意 tags_pool 还是个数组，我们取第一个元素
      const pool = TAGS_POOL[0][dimKey]; 
      
      // 防止 level 超出范围的保护
      const tagList = pool[String(level)] || pool["5"];
      
      // 随机取一个标签，保持每次结果的新鲜感
      const dynamicTag = tagList[Math.floor(Math.random() * tagList.length)];

      // C. 查 spectrum_status.js (状态词)
      const statusMap = STATUS_MAP[dimKey];
      let statusText = "未知状态";
      // 遍历范围 key "0-20", "21-40"
      for (let rangeKey in statusMap) {
        const [min, max] = rangeKey.split('-').map(Number);
        if (score >= min && score <= max) {
          statusText = statusMap[rangeKey];
          break;
        }
      }

      result[logicKey] = {
        score: score,       // 85 (用于进度条长度)
        level: level,       // 9
        tag: dynamicTag,    // "社交恐怖分子"
        status: statusText  // "全场焦点"
      };
    }
    return result;
  }

  // 4. 贴纸混合逻辑 (优先彩蛋 -> 成就 -> 默认)
  _mixStickers(eggs, achievements) {
    let finalStickers = [];

    // A. 放入彩蛋 (来自 egg_triggers.js)
    // Logic 传过来的是 key，我们需要去 egg_triggers 找对应的展示文案
    if (eggs && eggs.length > 0) {
      eggs.forEach(eggKey => {
        const eggDef = EGG_DEFINITIONS.find(e => e.tag_key === eggKey);
        if (eggDef) {
            // 提取括号里的词，比如 "Q1... (角落生物)" -> "角落生物"
            // 如果提取失败，就用 tag_key 本身
            const match = eggDef.desc.match(/\((.*?)\)/);
            const text = match ? match[1] : eggDef.tag_key;
            finalStickers.push({ text: text, type: 'egg' }); // 金色贴纸
        }
      });
    }

    // B. 放入成就 (来自 achievements.js)
    if (achievements && achievements.length > 0) {
      achievements.forEach(achKey => {
        const achDef = ACH_DEFINITIONS[achKey]; 
        if (achDef) {
          finalStickers.push({ text: achDef.title, type: 'achievement' }); // 红色贴纸
        }
      });
    }

    // C. 补全默认 (来自 defaults.js)
    // 只有当贴纸不够 5 个时才补
    const needed = this.MAX_STICKERS - finalStickers.length;
    if (needed > 0) {
      // 随机打乱 defaults 数组，取前 needed 个
      const shuffled = [...DEFAULTS].sort(() => 0.5 - Math.random());
      const fillers = shuffled.slice(0, needed);
      fillers.forEach(text => {
        finalStickers.push({ text: text, type: 'default' }); // 黑白贴纸
      });
    }

    // 最后再截取一次，确保不超过 MAX (防止彩蛋+成就本身就超过5个的情况)
    return finalStickers.slice(0, this.MAX_STICKERS);
  }
}

// 导出实例
module.exports = new ResultRenderer();