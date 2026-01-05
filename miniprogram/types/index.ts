/**
 * 题目选项接口
 */
export interface QuestionOption {
  text: string;
  value: number; // 如果后续需要把 index 映射为分数
}

/**
 * 题目接口
 */
export interface Question {
  _id?: string;       // 云数据库自动生成的 ID
  id: number;         // 题目序号
  dim: string;        // 维度: 'EI' | 'SN' | 'TF' | 'JP'
  dir: number;        // 方向: 1 | -1
  txt: string;        // 题干
  opts: string[];     // 选项文本数组
}

/**
 * 用户答案接口
 */
export interface Answer {
  q_id: number;       // 题目 ID
  selected_index: number; // 选中的选项索引 (0-6)
}

/**
 * 维度分数接口
 */
export interface DimensionScores {
  E_I: number;  // 外向/内向
  S_N: number;  // 感觉/直觉
  T_F: number;  // 思考/情感
  J_P: number;  // 判断/感知
}

/**
 * MBTI 结果接口
 */
export interface MBTIResult {
  type: string;           // MBTI 类型，如 'ENFP'
  dimensionScores: DimensionScores; // 各维度分数
}

/**
 * 用户资料接口
 */
export interface UserProfile {
  _id?: string;
  _openid?: string;
  nickname: string;
  avatar_file_id: string;
  created_at?: Date;
  last_login?: Date;
}

/**
 * 测试日志接口
 */
export interface TestLog {
  _id?: string;
  _openid?: string;
  mbti_result: string;
  dimension_scores: DimensionScores;
  answers_snapshot: Answer[];
  timestamp?: Date;
  is_shared: boolean;
}
