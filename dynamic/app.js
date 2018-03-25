const sql = require('./sql')
const NodeCache = require('node-cache')
// 本地缓存，暂时没有失效时间，通过通知进行清空操作。
const localCache = new NodeCache({checkperiod: 0})

function getLastestPackageInfoFromSql (appID, appVersion, callback) {
  sql.getLastestPackagesInfo(appID, appVersion, (err, packages) => {
    if (err) {
      console.log('数据库出错 :' + err)
      callback(err)
    } else {
      let key = appID + appVersion
      localCache.set(key, packages)
      callback(null, packages)
    }
  })
}

// 为了提高后台性能，将处理交由前端处理
function route (app) {
  // 获取全部包信息
  app.get('/app/allPacks', function (req, res) {
    let appID = req.query.appID
    let appVersion = req.query.appVersion
    if (!appID || !appVersion) {
      res.json({error: '参数传入错误'})
      return
    }
    let key = appID + appVersion
    localCache.get(key, function (err, value) {
      if (err) {
        console.log('node-cache 异常 ： ' + err)
        res.json({error: '未知错误，node-cache 异常！！!'})
      } else {
        if (value === undefined) {
          // 如果为空值，则查数据库，并设置缓存。
          getLastestPackageInfoFromSql(appID, appVersion, (err, packages) => {
            if (err) {
              res.json({error: '数据库异常！！！'})
            } else {
              res.json(packages)
            }
          })
        } else {
          res.json(value)
        }
      }
    })
  })
  // 检测一个单独的包的更新情况。
  app.get('/app/pack', function (req, res) {
    let packName = req.query.moduleName
    let appID = req.query.appID
    let appVersion = req.query.appVersion
    if (!appID || !appVersion || !packName) {
      res.json({error: '参数传入错误'})
      return
    }
    let key = appID + appVersion
    localCache.get(key, function (err, value) {
      if (err) {
        console.log('node-cache 异常 ： ' + err)
        res.json({error: '未知错误，node-cache 异常！！!'})
      } else {
        if (value === undefined) {
          // 如果为空值，则查数据库，并设置缓存。
          getLastestPackageInfoFromSql(appID, appVersion, (err, packages) => {
            if (err) {
              res.json({error: '数据库异常！！！'})
            } else {
              let packInfo = packages[packName]
              if (packInfo) {
                res.json(packInfo)
              } else {
                res.json({error: '包未配置！！！'})
              }
            }
          })
        } else {
          let packInfo = value[packName]
          if (packInfo) {
            res.json(packInfo)
          } else {
            res.json({error: '包未配置！！！'})
          }
        }
      }
    })
  })
}

module.exports = {
  router: route,
  path: '/app',
  refreshPackInfo: function () {
    // 清空缓存
    localCache.flushAll()
  }
}
