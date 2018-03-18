// sql 实现， 这里使用 sqlite3
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const config = require('./config')
const fs = require('fs')

let db
let file = path.join(config.workPath, 'package.sqlite3')
// 建表
function createTable () {
  let mode = !fs.existsSync(file)
    ? sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
    : sqlite3.OPEN_READWRITE
  console.log('连接数据库')
  db = new sqlite3.Database(file, mode, err => {
    if (err) {
      console.log('Creating DB Failed' + err)
    } else {
      db.run(`CREATE TABLE IF NOT EXISTS package (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(20),
            version INT(5),
            state INT(1),
            update_setting INT(1),
            update_log TEXT,
            created_time DATETIME,
            stoped_time DATETIME,
            download_url VARCHAR(100),
            patch_urls TEXT
        )`)
    }
  })
}
// 提交包
function sumbitPackageInfo (info, callback) {
  // 提交时检测版本号之类的信息。
  console.log('sumbitPackageInfo Info : ' + JSON.stringify(info))
  let sql = `INSERT INTO package VALUES 
  (NULL, ? , ? , 1 , ? , ? ,DATETIME('now','localtime'),DATETIME('now','localtime'), ? , ?);`
  db.run(sql, [info.name, info.version, info.update_setting, info.update_log, info.download_url, info.patch_urls], callback)
}

// 查出最新的3个包的版本号和下载地址
// 回调第一个值为 err ，如果包检测或者数据库出问题，则会返回err
// 回调的第二个值为 {version : downloadURL} , 即之前3个包的下载地址，可能为空。 用于制作增量包。
function getLastestPackageVersion (name, callback) {
  let sql = "SELECT version,download_url FROM package WHERE name = '" + name + "' ORDER BY version DESC LIMIT 3"
  db.all(sql, function (err, rows) {
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

// 查询包信息 states 是状态列表为 [0,1,2]
// 0 是处理中， 1是启动中 ，2是停用
// pageNum 分页数量， 默认每页12个数据, 从1 开始
// callback(err,[packageInfo],pageCount) pageCount 为分页总数。
function getPackageInfo (states, liekName, pageNum, callback) {
  let sql = ' WHERE 1 ' // SELECT * FROM package
  if (states.length === 0) {
    console.log('列表不能为空')
    callback(null, [])
  }
  if (states.length !== 3) {
    let stateSql = 'AND ( 0 '
    for (let i = 0; i < states.length; i++) {
      stateSql += ' OR state = ' + states[i]
    }
    sql += stateSql + ' ) '
  }
  if (liekName && liekName !== '') {
    sql += "AND name like '%" + liekName + "%'"
  }
  // sql += ' ORDER BY created_time DESC LIMIT 12 OFFSET ' + (pageNum - 1) * 12
  // console.log('查询sql :' + sql)
  db.all('SELECT * FROM package ' + sql + ' ORDER BY created_time DESC LIMIT 12 OFFSET ' + (pageNum - 1) * 12,
    function (err, rows) {
      if (err) {
        callback(err)
      } else {
        let array = []
        rows.forEach(function (row) {
          array.push(row)
        })
        db.get('SELECT count(*) FROM package ' + sql, function (err, row) {
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
  console.log('停止包的发布')
  let sql = `UPDATE package
  SET state = 2 , stoped_time = DATETIME('now','localtime')
  WHERE state = 1 AND id = ?;`
  db.run(sql, [packageId], (err) => {
    callback(err)
  })
}

// 获取最新的包信息
function getLastestPackagesInfo (callback) {
  let sql = 'SELECT * , MAX(version) FROM package WHERE state = 1 GROUP BY name'
  db.all(sql, function (err, rows) {
    if (err) {
      callback(err)
    } else {
      let ret = {}
      rows.forEach(function (row) {
        let lastestPack = {}
        lastestPack.version = row.verbose
        lastestPack.update_setting = row.update_setting
        lastestPack.download_url = row.download_url
        lastestPack.patch_urls = row.patch_urls
        ret[row.name] = lastestPack
      })
      callback(null, ret)
    }
  })
}

createTable()

module.exports = {
  // createTable: createTable,
  sumbitPackageInfo: sumbitPackageInfo,
  getPackageInfo: getPackageInfo,
  stopPackage: stopPackage,
  getLastestPackageVersion: getLastestPackageVersion,
  getLastestPackagesInfo: getLastestPackagesInfo
}
