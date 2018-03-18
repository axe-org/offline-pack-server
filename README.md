# offline-pack-server

离线包系统，使用nodejs开发

### 介绍

支持bsdiff 进行差分， 有一个还算可以看的管理界面。 后台使用 node搭建，比较简单。

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

### app 组件

TODO

## TODO

* 多APP支持