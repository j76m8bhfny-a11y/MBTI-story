// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  try {
    // 1. 先去数据库查一下，这个 openid 对应的用户是否存在
    // 注意：这里的 'users' 必须和你数据库里建立的集合名称一致
    const userCheck = await db.collection('users').where({
      _openid: openid
    }).get()

    // 2. 如果没查到记录（是新用户），就添加一条
    if (userCheck.data.length === 0) {
      await db.collection('users').add({
        data: {
          _openid: openid, // 云开发会自动加，显式写上也无妨
          createTime: db.serverDate(), // 记录创建时间
          lastLoginTime: db.serverDate(),
          // 可以加一些默认字段，比如来源等
          source: event.source || 'unknown' 
        }
      })
      console.log('新用户入库成功:', openid)
    } else {
      // 3. 如果是老用户，可以更新一下最后登录时间（可选）
      await db.collection('users').where({
        _openid: openid
      }).update({
        data: {
          lastLoginTime: db.serverDate()
        }
      })
      console.log('老用户登录:', openid)
    }

  } catch (err) {
    console.error('数据库操作失败:', err)
    // 即使数据库操作失败，也不要阻断登录，还是要把 openid 返回给前端
  }
  
  // 4. 返回前端需要的信息（保持原有的返回结构，这样前端 app.ts 不用改）
  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}