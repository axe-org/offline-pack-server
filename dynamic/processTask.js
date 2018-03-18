const request = require('request')
const config = require('./config')
const md5 = require('md5')
const fs = require('fs')
const path = require('path')
const unzip = require('unzip')
const rimraf = require('rimraf')
const archiver = require('archiver')
const bsdiff = require('bsdiff-nodejs')

const sql = require('./sql')
const signDataLength = config.keyLength - 11
// 处理任务， 负责下载旧包， 差分，上传包，更新数据库
class ProcessTask {
  constructor (packageInfo) {
    this.packageInfo = packageInfo
    this.mainFileName = md5(this.packageInfo.taskID)
    this.workPath = path.join(config.tmpPath, this.mainFileName)
    this.filePath = path.join(this.workPath, 'pack.zip')
    this.unzipDirPath = path.join(this.workPath, 'pack')
  }
  start () {
    fs.mkdirSync(this.workPath)
    fs.rename(this.packageInfo.filePath, this.filePath, () => {
      this.unzipPack()// 解压新包
    })
  }
  process (p, info) {
    console.log('上传任务 ' + this.packageInfo.name + '-' + this.packageInfo.version + ' 进度 ' + p + '% : ' + info)
    this.packageInfo['taskProgress'] = p
    this.packageInfo['taskState'] = info
    if (p === 0 || p === 100) {
      setTimeout(() => {
        rimraf(this.workPath, () => {
          // 删除本地tmp目录。
        })
      }, 1000)
    }
  }
  unzipPack () {
    this.process(25, '解压包...')
    let unzipStream = unzip.Extract({ path: this.unzipDirPath })
    unzipStream.on('finish', () => {
      // 解压完成后， 进行签名
      this.process(30, '开始签名...')
      setTimeout(() => {
        fs.unlink(this.filePath, () => {
          this.sign()
        })
      }, 3000)
    })
    unzipStream.on('error', () => {
      this.process(0, '解压文件失败，请确认上传的是zip压缩包！！！')
    })
    fs.createReadStream(this.filePath).pipe(unzipStream)
  }
  sign () {
    this.signInfo = {'name': this.packageInfo.name, 'version': this.packageInfo.version}
    // 签名，使用rsa 私钥加密 签名信息，由于最大加密长度只有 117 ,所以，我们签名的文件不能多。
    fs.readdir(this.unzipDirPath, (err, files) => {
      if (err) {
        return console.log(err)
      }
      this.signFile(files, 0)
    })
  }
  signFile (files, index) {
    if (index < files.length) {
      let fileName = files[index]
      this.signInfo[fileName] = '000000000000' // 取md5后12位 小写
      let leftSignLength = signDataLength - JSON.stringify(this.signInfo).length
      if (leftSignLength < 0) {
        this.signInfo[fileName] = undefined
        this.signEnd()
      } else {
        let filePath = path.join(this.unzipDirPath, fileName)
        if (fs.statSync(filePath).isFile()) {
          fs.readFile(filePath, (er, buf) => {
            this.signInfo[fileName] = md5(buf).substr(20)
            this.process(this.packageInfo['taskProgress'] + 1, '计算文件md5值')
            setTimeout(() => {
              this.signFile(files, index + 1)
            }, 100)
          })
        } else {
          this.signFile(files, index + 1)
        }
      }
    } else {
      // 表示文件签名完成
      this.signEnd()
    }
  }
  signEnd () {
    // 签名结束
    this.process(45, '文件hash完成， rsa加密')
    let signJSON = JSON.stringify(this.signInfo)
    // 进行rsa加密
    let encrypted = config.privateKey.encryptPrivate(Buffer.from(signJSON))
    fs.writeFile(path.join(this.unzipDirPath, '.mx_pack_sign'), encrypted, () => {
      this.process(50, 'RSA 签名完成')
      this.zipFiles()
    })
  }
  zipFiles () {
    // 重新压缩文件
    let output = fs.createWriteStream(this.filePath)
    let archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    })
    archive.on('finish', () => {
      this.process(55, '包压缩完成，开始进行查分...')
      // 压缩完后， 进行diff
      this.diffOldPacks()
    })
    archive.on('error', (er) => {
      this.process(0, '压缩失败，发生异常')
    })
    archive.directory(this.unzipDirPath, false)
    archive.pipe(output)
    archive.finalize()
  }
  diffOldPacks () {
    // 获取旧的包，以进行差分
    if (this.packageInfo.patch_urls.length === 0) {
      // 如果没有旧包，则直接进入下一步，即移到存储目录。
      this.saveFiles()
    } else {
      this.process(60, '差分包 ...')
      setTimeout(() => {
        let versions = []
        for (let version in this.packageInfo.patch_urls) {
          versions.push(version)
        }
        this.diffPack(0, versions)
      }, 100)
    }
  }
  diffPack (index, array) {
    if (index < array.length) {
      let version = array[index]
      let oldPackName = md5(this.packageInfo.name + version)
      let oldPackPath = path.join(config.saveDir, this.packageInfo.name, oldPackName)
      let patchFileName = md5(this.packageInfo.name + version + ' -> ' + this.packageInfo.version)
      this.packageInfo.patch_urls[version] = patchFileName
      bsdiff.diff(oldPackPath, this.filePath, path.join(this.workPath, patchFileName))
      this.process(this.packageInfo.taskProgress + 2, '差分包中 ...')
      setTimeout(() => {
        this.diffPack(index + 1, array)
      }, 2000)
    } else {
      // 遍历结束，进入下一步。
      this.saveFiles()
    }
  }
  saveFiles () {
    // 本地存储文件。
    let savedir = path.join(config.saveDir, this.packageInfo.name)
    if (!fs.existsSync(savedir)) {
      fs.mkdir(savedir)
    }
    for (let version in this.packageInfo.patch_urls) {
      let patchFileName = this.packageInfo.patch_urls[version]
      let read = fs.createReadStream(path.join(this.workPath, patchFileName))
      let write = fs.createWriteStream(path.join(savedir, patchFileName))
      read.pipe(write)
    }
    let saveFilePath = path.join(savedir, this.mainFileName)
    let readStream = fs.createReadStream(this.filePath)
    let writeStream = fs.createWriteStream(saveFilePath)
    readStream.pipe(writeStream).on('finish', () => {
      this.process(70, '本地文件保存完成')
      // 检测是 oss还是local
      setTimeout(() => {
        if (config.local) {
          if (config.local.copyDir) {
          // 如果由复制路径，则复制文件
            this.copyFiles()
          } else {
          // 检测下载
            this.checkDownload()
          }
        } else {
          this.ossUploads()
        }
      })
    })
  }
  ossUploads () {
    // 上传到阿里云 oss
    let prefix = ''
    if (config.oss.prefix) {
      prefix = config.oss.prefix
    }
    prefix = prefix + this.packageInfo.name + '/'
    for (let version in this.packageInfo.patch_urls) {
      let patchFileName = this.packageInfo.patch_urls[version]
      let read = fs.createReadStream(path.join(this.workPath, patchFileName))
      let objKey = prefix + patchFileName
      config.ossClient.putStream(objKey, read).then(function (val) {
      }).catch((error) => {
        if (error) {
          this.process(0, 'oss 上传失败 ：')
          console.log(error)
        }
      })
    }
    let stream = fs.createReadStream(this.filePath)
    config.ossClient.putStream(prefix + this.mainFileName, stream).then(() => {
      this.process(80, '上传阿里云 oss 完成')
      // 检测下载
      setTimeout(() => {
        this.checkDownload()
      }, 100)
    }).catch((error) => {
      if (error) {
        this.process(0, 'oss 上传失败 ：')
        console.log(error)
      }
    })
  }
  copyFiles () {
    // 复制到指定路径
    let savedir = path.join(config.local.copyDir, this.packageInfo.name)
    if (!fs.existsSync(savedir)) {
      fs.mkdir(savedir)
    }
    for (let version in this.packageInfo.patch_urls) {
      let patchFileName = this.packageInfo.patch_urls[version]
      let read = fs.createReadStream(path.join(this.workPath, patchFileName))
      let write = fs.createWriteStream(path.join(savedir, patchFileName))
      read.pipe(write)
    }
    let saveFilePath = path.join(savedir, this.mainFileName)
    let readStream = fs.createReadStream(this.filePath)
    let writeStream = fs.createWriteStream(saveFilePath)
    readStream.pipe(writeStream).on('finish', () => {
      this.process(80, '本地文件完成复制')
      setTimeout(() => {
        this.checkDownload()
      })
    })
  }
  checkDownload () {
    // 检测是否能下载, 需要配置 checkDownload
    // 首先， 把路径给修改正确。
    let mainPath
    if (config.local) {
      // 如果是本地 , 会多一个模块路径
      mainPath = config.local.downloadUrl + this.packageInfo.name + '/' + this.mainFileName
      // 拼接patch
      for (let version in this.packageInfo.patch_urls) {
        let patchPath = config.local.downloadUrl + this.packageInfo.name + '/' + this.packageInfo.patch_urls[version]
        this.packageInfo.patch_urls[version] = patchPath
      }
    } else {
      // oss处理
      mainPath = config.oss.downloadUrl + this.packageInfo.name + '/' + this.mainFileName
      // 拼接patch
      for (let version in this.packageInfo.patch_urls) {
        let patchPath = config.oss.downloadUrl + this.packageInfo.name + '/' + this.packageInfo.patch_urls[version]
        this.packageInfo.patch_urls[version] = patchPath
      }
    }
    this.packageInfo.download_url = mainPath
    this.packageInfo.patch_urls = JSON.stringify(this.packageInfo.patch_urls)// 转换成字符串，准备存入数据库
    if (config.checkDownload) {
      // 每隔 15秒检测一次。只检测主文件 ,默认检测 40 次，即 10分钟
      this.checkMainPackDownload(mainPath, 40)
    } else {
      // 如果不需要检测，则修改数据库
      setTimeout(() => {
        this.process(90, '修改数据库...')
        this.submitPackageInfo()
      }, 2000)
    }
  }
  checkMainPackDownload (mainPath, lastTryTime) {
    // 检测的目的，是以防异步上传，导致文件未生效。
    if (lastTryTime > 0) {
      this.process(85, '检测文件是否可以下载，当前可重试次数 ' + lastTryTime)
      request(mainPath, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          this.process(90, '检测文件已可以下载， 修改数据库...')
          this.submitPackageInfo()
        } else {
          setTimeout(() => {
            this.checkMainPackDownload(mainPath, lastTryTime - 1)
          }, 15000)
        }
      })
    } else {
      this.process(0, '检测文件路径无法完成下载， 路径为 ', mainPath, ' ,请检测原因')
    }
  }
  submitPackageInfo () {
    sql.sumbitPackageInfo(this.packageInfo, (err) => {
      if (err) {
        this.process(0, '修改数据库失败 ！！！')
      } else {
        // 彻底完成， 累死我了
        this.process(100, '完成上传！！！')
      }
    })
  }
}

module.exports = ProcessTask
