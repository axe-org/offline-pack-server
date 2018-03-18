// 用于解析配置。 使用offline-pack-server start ,以在当前路径创建实例。建议新建一个文件夹，然后进行这个操作。
const path = require('path')
const fs = require('fs')
const process = require('process')
const RSA = require('node-rsa')
const rimraf = require('rimraf')
let config = {}

function initConfig (binPath, workPath) {
  config.workPath = workPath
  config.serverPath = path.join(binPath, '../')
  // 检测是否已有配置文件和其他目录。
  if (!fs.existsSync(workPath)) {
    fs.mkdirSync(workPath)
    // 创建工作目录。
  }
  let tmpPath = path.join(workPath, 'tmp')
  if (!fs.existsSync(tmpPath)) {
    fs.mkdirSync(tmpPath)
  } else {
    rimraf(tmpPath, () => {
      fs.mkdirSync(tmpPath)
    })
  }
  config.tmpPath = tmpPath
  let configPath = path.join(workPath, 'config.js')
  if (!fs.existsSync(configPath)) {
    console.log('以默认配置初始化。。。 ')
    fs.writeFileSync(configPath, fs.readFileSync(path.join(config.serverPath, 'static/config.js')))
  }
  config.saveDir = path.join(workPath, 'packages')
  if (!fs.existsSync(config.saveDir)) {
    fs.mkdirSync(config.saveDir)
  }
  // 读取配置内容
  let setting = require(configPath)
  config = Object.assign(config, setting)
  console.log('当前配置为 : ' + JSON.stringify(config))
  if (config.local) {
    config.oss = undefined // 只能设置一项。
    if (config.local.storageDir) {
      if (!fs.existsSync(config.local.storageDir)) {
        console.log('自定义的存放路径，需要自己创建目录， 当前路径 ' + config.local.storageDir + ' 目录不存在')
        process.exit(1)
      }
      if (config.local.storageDir !== config.saveDir) {
        // 默认是保存在 packages 目录下，如果其他目录，则进行复制。
        config.local.copyDir = config.local.storageDir
      }
    } else {
      config.local.storageDir = config.saveDir
    }
    if (!config.local.downloadUrl || !config.local.publicPath) {
      console.log('config.js 中配置的 local属性有误！！！')
      process.exit(1)
    }
  } else {
    // oss 检测
    let OSS = require('ali-oss').Wrapper
    config.ossClient = new OSS({
      region: config.oss.region,
      accessKeyId: config.oss.accessKeyId,
      accessKeySecret: config.oss.accessKeySecret,
      bucket: config.oss.bucket
    })
  }
  let privateKey = new RSA(config.pem)
  if (!privateKey) {
    console.log('config.js 中配置的 pem 私钥配置有误！！！')
    process.exit(1)
  }
  config.privateKey = privateKey
  config.keyLength = privateKey.getKeySize() / 8
}
config.initConfig = initConfig
module.exports = config
