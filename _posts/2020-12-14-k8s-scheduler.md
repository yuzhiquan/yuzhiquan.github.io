---
layout: post
title: "Kubernetes kube-scheduler 源码分析[WIP]"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/k8s-scheduler/
categories: ["k8s"]
tags: ["go", "k8s"]
---
### need to know

  * scheduler启动过程
  * scheduler的调度过程
  * scheduler的evict过程
  * scheduler-framework的构成

### graph

![kube-scheduler](/assets/img/kube-schduler.png)
