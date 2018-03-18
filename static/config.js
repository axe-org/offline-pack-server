module.exports = {
  port: 2677, // 本地端口号设定。
  checkDownload: true, // 默认会尝试下载以确认上传成功。
  local: { // 如果使用简单的本地文件的形式，则设置local。
    // storageDir:存放本地包的路径。可以为空，为空则默认在工作路径的下创建 packages文件夹。 修改则要设置全路径,文件夹需要自己创建
    // storageDir: '/data',
    downloadUrl: 'http://localhost:2677/download/', // 下载地址目录 , 需要以 / 结尾， 否则出错。
    publicPath: '/download' // 如果使用本地文件，可以选择由node来分发这些包。即设置download -> packages的映射。不设置，则可以使用其他方式，如前端nginx来负责这些静态包。
  },
  // 阿里云存储配置 , 目前支持 local 和 oss 二选一。
  // oss: {
  //   accessKeyId: 'xxxxx',
  //   accessKeySecret: 'xxxxxxxx',
  //   region: 'oss-cn-shenzhen',
  //   bucket: 'offlinepacks', // 以上四项含义，参考oss文档 https://help.aliyun.com/document_detail/64097.html?spm=a2c4g.11186623.6.748.SExZ5i
  //   prefix: 'test/', // 对象Key的前缀，允许放到子文件夹里面  ， 必须以 / 结尾， 否则出错。
  //   downloadUrl: 'http://offlinepacks.oss-cn-shenzhen.aliyuncs.com/test/' // 文件下载域名地址，需要包含前缀
  // },
  // rsa私钥， 建议使用 2048 位的，使用命令openssl genrsa -out rsa_private_key.pem 生成
  pem: `-----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA4YXOMN8CxfZqDy2lpV+kbUgE4knWCG4k0M5/+lzOoEWl9eoo
  hXw0Ln3dY0Cjx2EGsVCR5KzZVIfjRCiyQwdd8QYpmXwkXwbSq4hLtRPMN/411WN/
  zTgycaDEXlgqz5YZ3RReQzdzqj/KkLvwjFvaW6Q57CeEM52VaRhtYzMIU0WJuUwh
  sDKODg8jYzAOp3n+gKdUToOGiC/wG9HyU/0qt37gA/eHgRjOUcNJ1KT085+ddTGK
  HyopN+cTtNQ0nq+nzj5ZhF3Zl6iQ92JWSV9ERE62CvX+dPnyVWjOc/1jmcDgcaej
  JldFGLc2DjRMn148LM93kLDeCw35vhZTQeS+AwIDAQABAoIBAH4MoaBjJVOsVL9D
  DjCOcoK6HDC2gDCaD2293X373WlrREVcqWVidG//3XuaJ3BK5Mi6dbDQg3Bhuz7f
  WDNqrLEIdrvYzSNn1twVA+ujsyMgrMomIMp9PISSDO+Ga/c2uCH/PmhnV/iySu/2
  e46X0EYkVlOOCrAmxdnF0238mgyf5mgiNgxVJ9N4D7LiRHDdhQ+6b86MsziiF13x
  ho+Lqo072RAL/krRm6HKiEN9Pe1ZdWmHmFRapkwobeIscWZOKkhmjlWbJrkyTGGZ
  Vhpc6h2vllFeQhTJPud6EOgS7877pgdYTupov3U3nonNqSDUu5jtwva9eRzyfiZ4
  2I32GkECgYEA+3moBdO3LFVryR9Cph8AX0oLgry1uPC7s2SFD4IOkldLVcfMY87P
  TCx9wLHC6smYt0orATy8GFR6fVFZ9++JZNqo8MZNc5VNS2nbw755mJ0EkSWrFq/k
  DPYeS+R0CHRbBb/MOWEmtna276hMpQY7eHzCPSrzGcljKzi7xHR2CzECgYEA5ZSb
  TTn0sTxLRYCBsAVLota5yjXenqjRrXH6pvXd61OeYf6FFUB7a1aciC+FrgFwtE2S
  NsfEjg1hQFaS6RfCzoOW0NUlCoX2bRiiAzfc7mDfWumX+1TLSSAa/1Z+uEsgkvuP
  BhAcrpJok+FIrkarOZAzf+P/fYpzjzzNjvbtZ3MCgYEA+SF3Af7SswsVMzTS9Hw2
  BDD44lZNuaBUc86bu9de1D/DFIJRzHcwCwjwtBvnPG7n6n2ByUIAHiJjDw+vD9+w
  v8eYIqByTpWU86c13uAu2rCDu8ATlPA//088iHcVNOMA4ds3WYkTryRA64BSHhLk
  i+MdEzgfimZm5oTYEDJIV6ECgYEA14MeGmuqUOpJuq+8jlEaRH2PoMva9FODqW8S
  ncK2FR/E0TbNFTsX4JZIkOsTcVn2w7sB45y53aOfxHbAqEFe5N/QJq+/etZwks8J
  3z2Ejt2vLjeULSHXRwj1bvZyNGyJ4pB1HXrogdP8ib10rey29W1xer+76cybWD36
  tRcFmxMCgYBSx18xn2yfnpb0vtSDnvIXsAPh0Cop5bVf9/VQF+bEqPUmXo6WuDeM
  LcZAjQZYjQ8JPYixFRz5Vl7bENOg4z6Ai3cznCrwqzB4+qt8XsoQsx/1+QeY4N+U
  f7xntR9Yw5QcEHXGj+V7tE1oWfU3mmJg9dRWKm8PFfQhv039qsUPMw==
  -----END RSA PRIVATE KEY-----
  `
}
