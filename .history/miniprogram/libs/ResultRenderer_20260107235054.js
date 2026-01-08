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

    // 1. 获取基础数据
    const baseProfile = this._getBaseProfile(mbti_type);

    // 2. 计算维度数据 (Gauge)
    const spectrumData = this._getSpectrumData(spectrum_scores);

    // 3. ⚡️ 核心修改：生成精选的3个贴纸 (Core, Trait, Egg)
    const threeStickers = this._generateThreeStickers(spectrumData, triggered_eggs, achievements);

    return {
      poster: {
        type: mbti_type,
        title: baseProfile.alias,
        slogan: baseProfile.slogan,
        summary: baseProfile.summary,
        bg_image: baseProfile.image_path,
        life_script: baseProfile.life_script
      },
      keywords: this._getCoreTags(mbti_type),
      gauge: spectrumData,
      stickers: threeStickers // 这里现在只返回 3 个对象
    };
  }

  // --- Helpers ---

  _getBaseProfile(mbti) {
    return RESULTS_DATA.find(item => item.id === mbti) || RESULTS_DATA[0];
  }

  _getCoreTags(mbti) {
    const chars = mbti.split('');
    const dict = CORE_TAGS[mbti];
    return chars.map(char => ({ char, text: dict ? dict[char] : "未知" }));
  }

  _getSpectrumData(scores) {
    const mapKey = { 'EI': 'E_dimension', 'SN': 'N_dimension', 'TF': 'F_dimension', 'JP': 'J_dimension' };
    let result = {};

    for (let logicKey in scores) {
      const score = scores[logicKey];
      const dimKey = mapKey[logicKey];

      let level = Math.ceil(score / 10);
      if (level === 0) level = 1;
      if (level > 10) level = 10;

      const pool = TAGS_POOL[0][dimKey];
      const tagList = pool[String(level)] || pool["5"];
      const dynamicTag = tagList[Math.floor(Math.random() * tagList.length)];

      const statusMap = STATUS_MAP[dimKey];
      let statusText = "未知状态";
      for (let rangeKey in statusMap) {
        const [min, max] = rangeKey.split('-').map(Number);
        if (score >= min && score <= max) {
          statusText = statusMap[rangeKey];
          break;
        }
      }

      result[logicKey] = { score, level, tag: dynamicTag, status: statusText };
    }
    return result;
  }

  // ⚡️ 新增：严格筛选 3 个贴纸的逻辑
  _generateThreeStickers(spectrumData, eggs, achievements) {
    // 1. 将所有维度按"极端程度"排序 (离50分越远越极端)
    const sortedDims = Object.values(spectrumData).sort((a, b) => {
      const intensityA = Math.abs(a.score - 50);
      const intensityB = Math.abs(b.score - 50);
      return intensityB - intensityA; // 降序
    });

    // Slot 1: 核心人设 (取最极端的那个维度标签)
    const coreTag = sortedDims[0].tag;

    // Slot 2: 特质标签 (取第二极端的维度标签)
    const traitTag = sortedDims[1].tag;

    // Slot 3: 彩蛋位 (优先彩蛋 -> 成就 -> 保底)
    let eggText = "生活观察家"; // Default
    if (eggs && eggs.length > 0) {
      // 找彩蛋文案
      const eggKey = eggs[0];
      const eggDef = EGG_DEFINITIONS.find(e => e.tag_key === eggKey);
      if (eggDef) {
         const match = eggDef.desc.match(/\((.*?)\)/);
         eggText = match ? match[1] : eggKey;
      }
    } else if (achievements && achievements.length > 0) {
      // 找成就文案
      const achKey = achievements[0];
      const achDef = ACH_DEFINITIONS[achKey];
      if (achDef) eggText = achDef.title;
    } else {
      // 随机兜底
      eggText = DEFAULTS[Math.floor(Math.random() * DEFAULTS.length)];
    }

    // 返回固定数组，供前端按索引取用
    return [
      { text: coreTag }, // index 0
      { text: traitTag }, // index 1
      { text: eggText }   // index 2
    ];
  }
}

module.exports = new ResultRenderer();
