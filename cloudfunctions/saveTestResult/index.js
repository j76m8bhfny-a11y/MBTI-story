// 云函数：保存测试结果
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { openid } = wxContext
  
  // 接收前端传来的数据
  const { 
    mbti_result, 
    dimension_scores, 
    avatar_file_id,
    answers_snapshot 
  } = event
  
  try {
    // 1. 更新 users 集合（如果有头像则更新）
    if (avatar_file_id) {
      await db.collection('users').doc(openid).update({
        data: {
          avatar_file_id: avatar_file_id,
          last_login: db.serverDate()
        }
      })
    }
    
    // 2. 插入 test_logs 集合
    const result = await db.collection('test_logs').add({
      data: {
        _openid: openid,
        mbti_result: mbti_result,
        dimension_scores: dimension_scores,
        answers_snapshot: answers_snapshot || [],
        timestamp: db.serverDate(),
        is_shared: false
      }
    })
    
    return {
      success: true,
      _id: result._id,
      message: '保存成功'
    }
  } catch (err) {
    console.error('保存测试结果失败', err)
    return {
      success: false,
      error: err.message
    }
  }
}
