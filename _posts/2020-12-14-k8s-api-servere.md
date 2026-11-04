---
layout: post
title: "Kubernetes kube-apiserver 源码分析"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/k8s-api-servere/
categories: ["k8s"]
tags: ["go", "k8s"]
---
#### 需要知道

`go-restful`  
`cobra`

`kubernetes`的库使用`cobra`，所以一般都是经过`Complete`、`Valiate`、`Run`

### need to know

  * apiserver的启动以及启动组件
  * apiserver的restful uri注册以及资源对应
  * apiserver的存储(etcd3)

### graph

![kube-apiserver](/assets/img/kube-apiserver.png)
