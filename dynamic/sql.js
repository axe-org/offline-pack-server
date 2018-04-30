// sql 实现， 这里使用 sqlite3
const sqlite3 = require('sqlite3')
const path = require('path')
const config = require('./config')
const fs = require('fs')

let db
let file = path.join(config.workPath, 'package.sqlite3')
// 建表
let mode = !fs.existsSync(file)
  ? sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
  : sqlite3.OPEN_READWRITE
db = new sqlite3.Database(file, mode, err => {
  if (err) {
    console.log('Creating DB Failed' + err)
    throw err
  } else {
    // 创建 package 表
    // id : 自增主键
    // name ： 随便起名， 模块名
    // version : 离线包的版本号， 这里的版本号就随便设置，但是是数字类型的。
    // status 状态， 1表示启用中，2表示被关闭。 0表示创建中。
    // download_time 下载时机 ， 0 表示检测更新时下载， 1表示使用模块时下载， 2表示 切换到wifi环境时下载， 当然进入应用时也会下载
    // download_force 是否强制下载， 进入模块时，如果需要检测更新，是否阻断式，还是后台静默下载
    // tag 标签， 目前只支持一个tag . 如果传空时， 默认设置为 ''
    // app_version app版本， 三段式。
    // app_version_code 转换为数字。以进行排序和比较
    // update_log 用户填充的日志内容。
    // created_time 提交时间
    // stoped_time 停止时间
    // download_url 下载地址
    // patch_urls patch补丁的地址， 这里是json字符串格式。
    db.run(`CREATE TABLE IF NOT EXISTS package (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(20) NOT NULL,
          version INT(5) NULL ,
          status INT(1) NULL,
          download_time INT(1) NULL,
          download_force INT(1) NULL,
          tag VARCHAR(30) NOT NULL,
          app_version VARCHAR(11) NOT NULL,
          app_version_code INTEGER NOT NULL,
          update_log TEXT,
          created_time DATETIME NOT NULL,
          stoped_time DATETIME,
          download_url VARCHAR(100),
          patch_urls TEXT
      )`)
  }
})

// 提交包
function sumbitPackageInfo (info, callback) {
  // 提交时检测版本号之类的信息。
  // 如果 tag 为空， 这里我们设置为 '' ， 以及检测时添加''
  if (info.tag === undefined) {
    info.tag = ''
  }
  db.run(`INSERT INTO package VALUES 
  (NULL, ? , ? , 1 , ? , ? , ? , ? , ? , ? ,DATETIME('now','localtime'),DATETIME('now','localtime'), ? , ?);`,
  [info.name, info.version, info.download_time, info.download_force, info.tag,
    info.app_version, info.app_version_code, info.update_log, info.download_url, info.patch_urls], callback)
}

// 查出最新的3个包的版本号和下载地址
// 回调第一个值为 err ，如果包检测或者数据库出问题，则会返回err
// 回调的第二个值为 {version : downloadURL} , 即之前3个包的下载地址，可能为空。 用于制作增量包。
function getLastestPackageVersion (name, callback) {
  db.all('SELECT version,download_url FROM package WHERE name = ? AND status = 1 ORDER BY version DESC LIMIT 3', [name], function (err, rows) {
    if (err) {
      callback(err)
    } else {
      let ret = {}
      rows.forEach(function (row) {
        ret[row.version] = row.download_url
      })
      callback(null, ret)
    }
  })
}

// 查询包信息 status 是状态列表为 [0,1,2]
// 0 是处理中， 1是启动中 ，2是停用
// pageNum 分页数量， 默认每页12个数据, 从0 开始
// callback(err,[packageInfo],pageCount) pageCount 为分页总数。
function getPackageInfo (statusList, likeName, pageNum, callback) {
  let limitSQL = ' WHERE 1=1 '
  let params = []
  if (statusList.length === 0) {
    console.log('列表不能为空')
    callback(null, [])
  }
  if (statusList.length !== 3) {
    // 避免直接拼装字符串导致的SQL注入。
    limitSQL += ' AND status IN (' + statusList.map(function (item) {
      return parseInt(item)
    }).join(',') + ') '
  }
  if (likeName && likeName !== '') {
    limitSQL += ' AND name like  ? '
    params.push('%' + likeName + '%')
  }
  // pageSize设置为12
  params.push(pageNum * 12)
  db.all('SELECT * FROM package ' + limitSQL + ' ORDER BY created_time DESC LIMIT 12 OFFSET ? ', params,
    function (err, rows) {
      if (err) {
        callback(err)
      } else {
        let array = []
        rows.forEach(function (row) {
          array.push(row)
        })
        params.pop()
        db.get('SELECT count(*) FROM package ' + limitSQL, params, function (err, row) {
          if (err) {
            callback(err)
          } else {
            let count = row['count(*)']
            callback(err, array, parseInt(count / 12) + 1)
          }
        })
      }
    })
}
// 停止某个包
function stopPackage (packageId, callback) {
  db.run(`UPDATE package SET status = 2 , stoped_time = DATETIME('now','localtime') 
  WHERE status = 1 AND id = ?;`, [packageId], (err) => {
    callback(err)
  })
}

// 停止指定模块的所有包
function stopModule (module, callback) {
  db.run(`UPDATE package SET status = 2 , stoped_time = DATETIME('now', 'localtime') WHERE status = 1 AND module = ?`,
    module, (err) => {
      callback(err)
    })
}

// 传入 tag 和 appversion ,以获取最新包信息。
function queryOfflinePackages (tags, appVersionCode, callback) {
  let params = [appVersionCode]
  let tagSQL = ''
  tags.push('')
  tagSQL = ' AND tag IN (' + tags.map(() => {
    return '?'
  }).join(',') + ') '
  params = [appVersionCode, ...tags]
  db.all(`SELECT * , MAX(version) FROM package WHERE status = 1 AND app_version_code <= ?  ${tagSQL} GROUP BY name;`, params, function (err, rows) {
    if (err) {
      callback(err)
    } else {
      let ret = {}
      rows.forEach(function (row) {
        let lastestPack = {}
        lastestPack.version = row.version
        lastestPack.download_time = row.download_time
        lastestPack.download_force = row.download_force
        lastestPack.download_url = row.download_url
        lastestPack.patch_urls = JSON.parse(row.patch_urls)
        ret[row.name] = lastestPack
      })
      callback(null, ret)
    }
  })
}

module.exports = {
  stopModule: stopModule,
  sumbitPackageInfo: sumbitPackageInfo,
  getPackageInfo: getPackageInfo,
  stopPackage: stopPackage,
  getLastestPackageVersion: getLastestPackageVersion,
  queryOfflinePackages: queryOfflinePackages
}
