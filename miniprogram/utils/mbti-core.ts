import { Answer, DimensionScores, MBTIResult, Question } from '../types/index';

/**
 * 计算单题得分
 * 公式: SingleScore = (SelectedIndex - 3) * QuestionDirection
 * 
 * @param selectedIndex 选中的选项索引 (0-6)
 * @param direction 题目方向 (1: 正向, -1: 反向)
 * @returns 单题得分 (-3 到 3)
 */
export function calculateSingleScore(selectedIndex: number, direction: number): number {
  return (selectedIndex - 3) * direction;
}

/**
 * 计算 MBTI 结果
 * 
 * @param answers 用户答案数组
 * @param questions 题目数组
 * @returns MBTI 结果
 */
export function calculateMBTI(answers: Answer[], questions: Question[]): MBTIResult {
  // 初始化 4 个维度的累加器
  const dimensionScores: DimensionScores = {
    E_I: 0,
    S_N: 0,
    T_F: 0,
    J_P: 0
  };

  // 创建题目 ID 到题目的映射，方便查找
  const questionMap = new Map<number, Question>();
  questions.forEach(q => questionMap.set(q.id, q));

  // 遍历答案，累加分数到对应维度
  answers.forEach(answer => {
    const question = questionMap.get(answer.q_id);
    if (!question) return;

    const score = calculateSingleScore(answer.selected_index, question.dir);
    
    // 根据维度累加分数
    switch (question.dim) {
      case 'EI':
        dimensionScores.E_I += score;
        break;
      case 'SN':
        dimensionScores.S_N += score;
        break;
      case 'TF':
        dimensionScores.T_F += score;
        break;
      case 'JP':
        dimensionScores.J_P += score;
        break;
    }
  });

  // 判定 MBTI 类型
  const type = determineMBTIType(dimensionScores);

  return {
    type,
    dimensionScores
  };
}

/**
 * 根据维度分数判定 MBTI 类型
 * 
 * @param scores 维度分数
 * @returns MBTI 类型字符串 (如 'ENFP')
 */
function determineMBTIType(scores: DimensionScores): string {
  const e = scores.E_I > 0 ? 'E' : 'I';
  const s = scores.S_N > 0 ? 'S' : 'N';
  const t = scores.T_F > 0 ? 'T' : 'F';
  const j = scores.J_P > 0 ? 'J' : 'P';

  return e + s + t + j;
}

/**
 * 获取维度描述
 * 
 * @param type MBTI 类型
 * @returns 维度描述对象
 */
export function getDimensionDescriptions(type: string): {
  EI: string;
  SN: string;
  TF: string;
  JP: string;
} {
  return {
    EI: type[0] === 'E' ? '外向 (E)' : '内向 (I)',
    SN: type[1] === 'S' ? '感觉 (S)' : '直觉 (N)',
    TF: type[2] === 'T' ? '思考 (T)' : '情感 (F)',
    JP: type[3] === 'J' ? '判断 (J)' : '感知 (P)'
  };
}
