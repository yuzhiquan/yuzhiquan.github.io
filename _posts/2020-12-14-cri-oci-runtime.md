---
layout: post
title: "CRI-OCI Runtime"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/cri-oci-runtime/
categories: ["k8s"]
tags: ["container", "go", "k8s"]
---
`CRI`: `container runtime interface`, 一组`grpc-interface`，包括`RuntimeService`(管理Pod和容器的生命周期)和`ImageService`(管理镜像的生命周期) 

`OCI`: `Open container initative`,描述`image`管理、`container`管理、`run container`的标准

我们平时讨论到的`runtime`很多时候都是在指`OCI`runtime  
```text
根据是否实现了对`image`的管理、传输、解压等等API来区分`runtime`
``` 

### Low-Runtime

通过设置`cgroup`和`namespace`来`run container`

#### Runc

#### lxc

#### lmctfy

### High-Runtime

#### docker

#### containerd

### shim

包括crishim和runtime-shim，主要目的是为了解耦
