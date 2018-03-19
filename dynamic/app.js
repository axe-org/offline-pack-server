const sql = require('./sql')
let packageInfo = {} // 当前最新包信息
// 当前 管理平台与接口是放在一起的， 就直接上传完成刷新吧，省事。
// 初始化时调用一次， 然后每次上传包完成，或者修改包时，刷新一次。
function refreshPackInfo () {
  sql.getLastestPackagesInfo((err, packages) => {
    if (err) {
      // 则 10秒后重试
      console.log('数据库出错， 不应该啊 :' + err)
    } else {
      packageInfo = packages
    }
  })
}
// 为了提高后台性能，将处理交由前端处理
function route (app) {
  // 获取全部包信息
  app.get('/app/allPacks', function (req, res) {
    res.json(packageInfo)
  })
  // 检测一个单独的包的更新情况。
  app.get('/app/pack', function (req, res) {
    let packName = req.query.moduleName
    if (!packName || !packageInfo[packName]) {
      res.json({error: '包未配置！！！'})
    } else {
      res.json(packageInfo[packName])
    }
  })
}
// 初始化
setTimeout(() => {
  // 因为数据库要初始化 😢
  refreshPackInfo()
}, 3000)

// 同时，每10分钟主动刷新一次数据。
setInterval(refreshPackInfo, 600 * 1000)

module.exports = {
  router: route,
  path: '/app',
  refreshPackInfo: refreshPackInfo
}
