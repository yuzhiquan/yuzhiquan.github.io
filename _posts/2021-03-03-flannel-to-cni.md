---
layout: post
title: "Flannel改CNI方式"
date: 2021-03-03 00:00:00 +0800
permalink: /2021/03/03/flannel-to-cni/
categories: ["k8s"]
tags: ["go", "k8s"]
---
背景：

目前的部署方式，ip分配由docker默认的bridge driver来进行ipam分配，目前还不支持配置为serial模式，某些情况下快速复用容器ip会造成一些时序问题

调研线性分配容器ip方案

方案设计：

docker bridge driver 线性ip分配，libnetwork支持这一配置，但是在docker daemon创建default driver时却无法进行ipam-option配置，已经进行修复提交给社区  
flannel改为cni模式，这样ip分配就有ipam binary来进行，而默认的host-local分配方式就是线性分配的  
方案实施：

原有的flannel进程暂时不进行修改

1.获取cni插件，在node上执行  
```bash
mkdir -p /opt/cni/bin/ && mkdir -p /etc/cni/net.d/
wget https://github.com/containernetworking/plugins/releases/download/v0.9.0/cni-plugins-linux-amd64-v0.9.0.tgz
tar -xvf cni-plugins-linux-amd64-v0.9.0.tgz /opt/cni/bin
``` 

2.配置cni conf  
```bash
cd /etc/cni/net.d/ && touch 10-flannel.conf
echo '
{
        "cniVersion": "0.3.1",
        "name": "mynet",
        "type": "flannel"
}
' > 10-flannel.conf // 这个配置缺路由设置
``` 

注意k8s 1.16之后必须填写cniVersion

3.配置kubelet，为kubelet添加启动参数并重启

–network-plugin=cni  
这样配置后就开始使用cni模式网络

可以删除一些pod进行测试，可以发现它是线性分配ip的

2020-12-17更新

今天调试了下tj1 pod ip不通的问题

刚开始怀疑是路由和docker0 ip的问题

查看路由表，果然有两条网桥路由，分别对应cni0和bridge0

1 把bridge0路由删掉，并且down掉bridge0网卡

但还是不通

在master机器无法ping通机器，但是在pod所在node上可以ping通pod ip，在pod内也可以ping通网关(cni0)以及同node其他pod的ip

证明网桥cni0是ok的

在master和node上网卡抓icmp包发现，到达node和pod网卡后，无回应，怀疑pod内路由问题，果然，发现宿主机内只有所在网段路由，无默认路由

改为cni方案后，pod内部路由，除了网段路由，其他路由均由cni内的ipam配置决定，所以

2 改动10-flannel.conf为  
```bash
 cat /etc/cni/net.d/10-flannel.conf 
{
        "cniVersion": "0.3.1",
        "name": "mynet",
        "type": "flannel",
        "ipam": {
                "type": "host-local",
                "routes": [
                        { "dst": "0.0.0.0/0", "gw": "10.46.30.1" }
                ]
        }
        // 缺少bridge插件配置
}
``` 

pod ip通了

2021-01-07 更新

反馈从pod访问集群外服务，remote-addr记录的是容器所在node ip也就是说添加了SNAT

查看node上iptabels规则  
```bash
 iptables-save | grep 10.46.30.42
-A POSTROUTING -s 10.46.30.42/32 -m comment --comment "name: \"mynet\" id: \"f68de15a59a613a05b124d56f9c334ce3e843a77bb79e097a330894021c01b5f\"" -j CNI-85c82e151d5cdf92a0ac776d
 iptables-save | grep CNI-85c82e151d5cdf92a0ac776d
:CNI-85c82e151d5cdf92a0ac776d - [0:0]
-A POSTROUTING -s 10.46.30.42/32 -m comment --comment "name: \"mynet\" id: \"f68de15a59a613a05b124d56f9c334ce3e843a77bb79e097a330894021c01b5f\"" -j CNI-85c82e151d5cdf92a0ac776d
-A CNI-85c82e151d5cdf92a0ac776d -d 10.46.30.0/26 -m comment --comment "name: \"mynet\" id: \"f68de15a59a613a05b124d56f9c334ce3e843a77bb79e097a330894021c01b5f\"" -j ACCEPT
-A CNI-85c82e151d5cdf92a0ac776d ! -d 224.0.0.0/4 -m comment --comment "name: \"mynet\" id: \"f68de15a59a613a05b124d56f9c334ce3e843a77bb79e097a330894021c01b5f\"" -j MASQUERADE
``` 

可以看到添加了一条CNI-85c82e151d5cdf92a0ac776d，里面包含MASQUERADE

通过查看flannel的cni代码，发现是flannel cni调用的bridge plugin添加的[bridge.go#L549](https://github.com/containernetworking/plugins/blob/219eb9e0464761c47383d239aba206da695e1a43/plugins/main/bridge/bridge.go#L549)，相应可以通过bridge插件配置添加 “ipMasq”: false来控制

3 再次改动10-flannel.conf为

```bash
 cat /etc/cni/net.d/10-flannel.conf 
{
        "cniVersion": "0.3.1",
        "name": "mynet",
        "type": "flannel",
        "ipam": {
                "type": "host-local",
                "routes": [
                        { "dst": "0.0.0.0/0", "gw": "10.46.30.1" }
                ]
        },
        "delegate": {
                "ipMasq": false
        }
}
``` 

QA：

1.如何平滑升级？

核心问题在于

创建时如何把通过docker0已经分配的ip信息同步到cni里  
这里使用的host-local ipam，可以看到它以本地磁盘目录默认/var/lib/cni/networks为backend，所以它检查ip占用以及分配ip、lock等都是以本地磁盘文件为准，如下  
```bash
 cd /var/lib/cni/networks
 cd mynet/
 ls -altrh
总用量 40K
-rwxr-x--- 1 root root    0 12月 16 17:47 lock
drwxr-xr-x 3 root root 4.0K 12月 16 17:47 ..
-rw-r--r-- 1 root root   70 12月 16 17:53 10.46.30.5
-rw-r--r-- 1 root root   70 12月 17 12:12 10.46.30.9
-rw-r--r-- 1 root root   70 12月 21 18:32 10.46.30.13
-rw-r--r-- 1 root root   70 12月 22 23:07 10.46.30.16
-rw-r--r-- 1 root root   70 12月 23 10:23 10.46.30.18
-rw-r--r-- 1 root root   70 12月 23 10:54 10.46.30.19
-rw-r--r-- 1 root root   11 12月 23 10:57 last_reserved_ip.0
-rw-r--r-- 1 root root   70 12月 23 10:57 10.46.30.20
drwxr-xr-x 2 root root 4.0K 12月 23 10:57 .
 cat 10.46.30.20 
c6208cd874dedf5b32371e7aaecc12feb070be25d9bc5e3931cfa441d8958d7e
eth0
 cat last_reserved_ip.0 
10.46.30.20
``` 

其中lock为ipam锁，防止重复分配；last_reserved_ip.0为当前cidr内最新已分配ip地址，下次分配就从这里开始分配；各个ip文件里记录的是sandboxid

所以我们需要查看各个node上已存在的pod，并将其ip生成文件放到相应目录下，同时可以考虑把last_reserved_ip.0内的ip写的适当高一些(不会影响ip分配，一旦分完，会从头再分)

  1. 升级过程中是否需要重启docker

目前看不需要，docker内部路由无需修改，默认路由

找台node做个实验  
经过实验，由于容器内的eth0是veth pair，它对应的另一端在node上，但是连接docker0上，如果我们down掉docker0或者去掉相应路由，都会造成流量无法找到相应的网卡，所以需要将相应的veth网卡与docker0解除连接

然后创建连接连到cni0上，但是这样在连接过程中可能会有流量丢失

所以这里没办法平滑升级

3.pod删除后，通过docker0分配的ip是否可以正确释放

可以，hostlocal的release阶段就是直接删除目录下的ip文件（不会校验文件内容）

风险：

1.ip泄露的问题

使用cni的插件目前都会存在这个问题，由于cri意外退出造成无法走cmddel正常删除ip，这样的ip就成了黑洞，需要有流程定时清理（比如terway的定时gc）

2.原有网桥docker0

最好删除或者修改地址，免得node重启造成docker0重新up后出现其他问题
