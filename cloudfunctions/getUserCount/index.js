// cloudfunctions/getUserCount/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    // 统计 users 集合中的记录总数
    // 注意：如果你存用户的集合叫其他名字（如 user_logs），请修改这里的 'users'
    const result = await db.collection('users').count()
    return {
      success: true,
      total: result.total
    }
  } catch (err) {
    return {
      success: false,
      err: err
    }
  }
}