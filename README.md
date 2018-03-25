# offline-pack-server

离线包系统，使用nodejs开发

### 介绍

支持bsdiff 进行差分， 有一个还算可以看的管理界面。 后台使用 node搭建，比较简单。

开发的主要原因是为了支持我的 [axe](https://github.com/CodingForMoney/axe) , 所以这个离线包系统属于 `axe`系统中的一部分，附赠内容。

### 安装使用

安装

    npm install offline-pack-server -g      

使用， 在一个文件夹下，或者指定一个文件夹 ，启动服务 ：

    offline-pack-server helloworld

然后在 `helloworld`文件夹下，有一个`config.js`， 可以进行一些定制。 

### 包的保存

包的保存目前支持两种。

一种是保存在本地文件中， 使用`nginx`或者`offline-pack-server` 来分发资源。默认配置就是这样，可以查看配置文件了解详情。

一种是上传到阿里云的oss中，详情查看配置文件。

### 安全性的讨论

当前管理页面和`app`的请求是放在一起的， 那如何隐藏管理页面呢 ？

我的建议是，在`node`前面还是要有一层`nginx`来控制与转发。 对于管理页面的路径与请求，限定ip，以做到内网才能访问。

## 注意事项 

包内不要有中文路径和中文文件， 否则会解压出错！！！

## TODO

* ~~ios 支持~~ [ios](https://github.com/CodingForMoney/offline-pack-ios.git)
* ~~多APP支持~~
* ~~设置APP版本号限制~~
* ~~添加按序强制更新模式~~