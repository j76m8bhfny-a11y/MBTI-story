module.exports = {
  "money_maker": {
    "id": "money_maker",
    "title": "💰 搞钱天赋",
    "tags": [
      "财神爷干女儿",
      "人间清醒",
      "没有感情的赚钱机器",
      "早晚是富婆"
    ],
    "trigger_condition": {
      "type": "cumulative_count",
      "threshold": 4,
      "target_tags": ["high_return", "efficiency", "profit_first"],
      "desc": "在职业、理财、挖角类题目中，累计选择利益最大化选项超过 4 次"
    }
  },
  "lay_flat": {
    "id": "lay_flat",
    "title": "🛌 躺平冠军",
    "tags": [
      "退堂鼓一级演奏家",
      "咸鱼翻身还是咸鱼",
      "国家一级保护废物",
      "佛系青年"
    ],
    "trigger_condition": {
      "type": "cumulative_count",
      "threshold": 5,
      "target_tags": ["give_up", "lazy", "follow_crowd"],
      "desc": "在作业、加班、冲突类题目中，累计选择'无所谓'、'差不多'、'随大流'超过 5 次"
    }
  },
  "involution_king": {
    "id": "involution_king",
    "title": "🌪️ 卷王之王",
    "tags": [
      "不睡觉的超人",
      "内卷发动机",
      "行走的KPI",
      "效率狂魔"
    ],
    "trigger_condition": {
      "type": "cumulative_count",
      "threshold": 4,
      "target_tags": ["hard_work", "perfectionist", "plan_strict"],
      "desc": "在学习、工作、育儿题目中，累计选择'严格计划'、'通宵'、'追求完美'超过 4 次"
    }
  },
  "rebel_soul": {
    "id": "rebel_soul",
    "title": "🤘 天生反骨",
    "tags": [
      "规则破坏者",
      "野生灵魂",
      "甚至没下载反诈APP",
      "去他的规矩"
    ],
    "trigger_condition": {
      "type": "cumulative_count",
      "threshold": 3,
      "target_tags": ["defy_authority", "break_rules", "unique"],
      "desc": "在面对老师、领导、长辈建议时，累计选择'对抗'、'无视'或'特立独行'超过 3 次"
    }
  },
  "social_master": {
    "id": "social_master",
    "title": "🤝 端水大师",
    "tags": [
      "高情商",
      "处世哲学十级",
      "谁也不得罪",
      "人类观察员"
    ],
    "trigger_condition": {
      "type": "cumulative_count",
      "threshold": 4,
      "target_tags": ["smooth", "compromise", "mediate"],
      "desc": "在冲突处理、婆媳矛盾、职场背锅题目中，累计选择'委婉'、'糊弄'或'圆滑处理'超过 4 次"
    }
  },
  "drama_queen": {
    "id": "drama_queen",
    "title": "🎭 戏精本精",
    "tags": [
      "内心戏奥斯卡",
      "抓马女王",
      "生活就是舞台",
      "加戏达人"
    ],
    "trigger_condition": {
      "type": "cumulative_count",
      "threshold": 3,
      "target_tags": ["emotional", "exaggerated", "spotlight"],
      "desc": "在日记、朋友圈、情感表达类题目中，累计选择情绪化、夸张的选项超过 3 次"
    }
  }
};