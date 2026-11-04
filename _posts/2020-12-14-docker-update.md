---
layout: post
title: "ubuntu14.04 docker安装与升级"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/docker-update/
categories: ["docker-go"]
tags: ["docker"]
---
近期用`go`开发发布平台整合`k8s`，在`mac`上编译好的`linux binary`放在`测试机`上却报  
```bash
k8s Error response from daemon: client is newer than server (client API version: 1.32, server API version: 1.21
``` 

看起来是版本太低，需要进行升级，之前是通过`docker-engine`安装的  
大概步骤是：

  1. 安装依赖：

```text
apt-get install apt-transport-https ca-certificates
``` 
  2. 加装`docker repo`

```bash
echo "deb https://apt.dockerproject.org/repo ubuntu-trusty main" | sudo tee /etc/apt/sources.list.d/docker.list
``` 
  3. 加`key`

```bash
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 36A1D7869245C8950F966E92D8576A8BA88D21E9
``` 
  4. 更新

```bash
apt-get update
``` 
  5. 安装  
发现`ubuntu`下有几种安装方法

```bash
apt-get install -y docker-engine
apt-get install -y lxc-docker
apt-get install -y docker.io
``` 

但是坑爹的是一个比一个版本老  
要想更新至最新版本需要

```bash
wget -qO- https://get.docker.com/ | sh
``` 

这个安装的是最新的  
```bash
Client:
 Version:      17.09.0-ce
 API version:  1.32
 Go version:   go1.8.3
 Git commit:   afdb6d4
 Built:        Tue Sep 26 22:42:38 2017
 OS/Arch:      linux/amd64

Server:
 Version:      17.09.0-ce
 API version:  1.32 (minimum version 1.12)
 Go version:   go1.8.3
 Git commit:   afdb6d4
 Built:        Tue Sep 26 22:41:20 2017
 OS/Arch:      linux/amd64
 Experimental: false
``` 

在这种情况下可以  
```bash
export DOCKER_API_VERSION=1.23
``` 

指定使用的版本  
`ubuntu`的`repo`真的有人维护吗？
