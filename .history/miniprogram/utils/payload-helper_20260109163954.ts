/**
 * URL Payload 辅助工具
 * 用于社交裂变场景下的参数编码与解码
 */

export interface SharePayload {
  mode: 'guest';
  mbti: string;
  nick: string;
}

/**
 * 编码分享参数
 * @param payload 分享数据
 * @returns 编码后的 URL 参数字符串
 */
export function encodeSharePayload(payload: SharePayload): string {
  try {
    // 1. 编码昵称（防止特殊字符导致 URL 解析失败）
    const encodedNick = encodeURIComponent(payload.nick);
    
    // 2. 截断前 10 个字符（避免 URL 过长）
    const truncatedNick = encodedNick.substring(0, 10);
    
    // 3. 构建查询参数
    const params = new URLSearchParams();
    params.append('mode', payload.mode);
    params.append('mbti', payload.mbti);
    params.append('nick', truncatedNick);
    
    return params.toString();
  } catch (err) {
    console.error('编码分享参数失败', err);
    return '';
  }
}

/**
 * 解码分享参数
 * @param query URL 查询参数对象
 * @returns 解码后的分享数据，失败返回 null
 */
export function decodeSharePayload(query: any): SharePayload | null {
  try {
    if (!query || query.mode !== 'guest') {
      return null;
    }

    // 1. 解码昵称（容错处理）
    let decodedNick = '';
    try {
      decodedNick = decodeURIComponent(query.nick || '');
    } catch (err) {
      console.warn('解码昵称失败，使用默认值', err);
      decodedNick = '神秘朋友';
    }

    // 2. 验证 MBTI 类型
    const mbti = (query.mbti || '').toUpperCase();
    const validMBTI = /^(E|I)(S|N)(T|F)(J|P)$/.test(mbti);
    if (!validMBTI) {
      console.warn('无效的 MBTI 类型', mbti);
      return null;
    }

    return {
      mode: 'guest',
      mbti: mbti,
      nick: decodedNick
    };
  } catch (err) {
    console.error('解码分享参数失败', err);
    return null;
  }
}

/**
 * 生成分享 URL
 * @param payload 分享数据
 * @returns 完整的分享 URL
 */
export function generateShareURL(payload: SharePayload): string {
  const queryString = encodeSharePayload(payload);
  return `/pages/index/index?${queryString}`;
}
