const sql = require('./sql')
const hash = require('string-hash')
const NodeCache = require('node-cache')
// 本地缓存，暂时没有失效时间，通过通知进行清空操作。
const localCache = new NodeCache({checkperiod: 0})

// 为了提高后台性能，将处理交由前端处理
function route (app) {
  // 获取全部包信息
  app.post('/app/full', function (req, res) {
    let tags = req.body.tags
    let appVersion = req.body.appVersion
    if (tags === undefined || appVersion === undefined) {
      return res.json({error: '参数传入错误'})
    }
    // tag 不能无限多。
    if (tags.length > 30) {
      return res.json({error: '参数传递错误！！！'})
    }
    let key = appVersion + JSON.stringify(tags)
    key = hash(key)
    localCache.get(key, function (err, value) {
      if (err) {
        console.log('node-cache 异常 ： ' + err)
        res.json({error: '未知错误，node-cache 异常！！!'})
      } else {
        if (value) {
          res.json(value)
        } else {
          let splited = appVersion.split('.')
          let appVersionCode = parseInt(splited[0]) * 1000 * 1000 + parseInt(splited[1]) * 1000 + parseInt(splited[2])
          // 如果为空值，则查数据库，并设置缓存。
          sql.queryOfflinePackages(tags, appVersionCode, (err, data) => {
            if (err) {
              res.json({error: err.message})
              console.log(err)
            } else {
              res.json(data)
              localCache.set(key, data)
            }
          })
        }
      }
    })
  })
  // 检测一个单独的包的更新情况。
  app.post('/app/pack', function (req, res) {
    let packName = req.body.moduleName
    let tags = req.body.tags
    let appVersion = req.body.appVersion
    if (packName === undefined || tags === undefined || appVersion === undefined) {
      res.json({error: '参数传入错误'})
      return
    }
    if (tags.length > 30) {
      return res.json({error: '参数传递错误'})
    }
    let key = appVersion + JSON.stringify(tags)
    key = hash(key)
    localCache.get(key, function (err, value) {
      if (err) {
        console.log('node-cache 异常 ： ' + err)
        res.json({error: '未知错误，node-cache 异常！！!'})
      } else {
        if (value) {
          let packInfo = value[packName]
          if (packInfo) {
            res.json(packInfo)
          } else {
            res.json({error: '包未配置！！！'})
          }
        } else {
          let splited = appVersion.split('.')
          let appVersionCode = parseInt(splited[0]) * 1000 * 1000 + parseInt(splited[1]) * 1000 + parseInt(splited[2])
          sql.queryOfflinePackages(tags, appVersionCode, (err, data) => {
            if (err) {
              res.json({error: err.message})
              console.log(err)
            } else {
              localCache.set(key, data)
              let packInfo = data[packName]
              if (packInfo) {
                res.json(packInfo)
              } else {
                res.json({error: '包未配置！！！'})
              }
            }
          })
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
