---
layout: post
title: "阿里云部署高可用K8S集群"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/k8s_install_in_aliyun_vpc/
categories: ["docker-go-k8s"]
tags: ["docker", "k8s"]
---
# 阿里云部署高可用K8S集群

## 环境：

  * 阿里云`ECS`，`Ubuntu 16.04.3 LTS`,共6台，其中三台`master`,三台`node`
  * 阿里云`VPC`网络环境
  * `k8s`版本

```bash
kubectl  version
Client Version: version.Info{Major:"1", Minor:"8", GitVersion:"v1.8.4", GitCommit:"9befc2b8928a9426501d3bf62f72849d5cbcd5a3", GitTreeState:"clean", BuildDate:"2017-11-20T05:28:34Z", GoVersion:"go1.8.3", Compiler:"gc", Platform:"linux/amd64"}
Server Version: version.Info{Major:"1", Minor:"8", GitVersion:"v1.8.4", GitCommit:"9befc2b8928a9426501d3bf62f72849d5cbcd5a3", GitTreeState:"clean", BuildDate:"2017-11-20T05:17:43Z", GoVersion:"go1.8.3", Compiler:"gc", Platform:"linux/amd64"}
``` 

## 部署主集群

  * 部署参考<https://github.com/gjmzj/kubeasz>
  * 部署所使用配置

```bash
# 部署节点：运行这份 ansible 脚本的节点
[deploy]
10.102.54.42

# etcd集群请提供如下NODE_NAME、NODE_IP变量
# 请注意etcd集群必须是1,3,5,7...奇数个节点
[etcd]
10.102.54.42 NODE_NAME=etcd1 NODE_IP="10.102.54.42"
10.102.54.43 NODE_NAME=etcd2 NODE_IP="10.102.54.43"
10.102.54.44 NODE_NAME=etcd3 NODE_IP="10.102.54.44"

[kube-master]
10.102.54.42 NODE_IP="10.102.54.42"
10.102.54.43 NODE_IP="10.102.54.43"
10.102.54.44 NODE_IP="10.102.54.44"

# 负载均衡至少两个节点，安装 haproxy+keepalived
# 根据master节点数量同步修改roles/lb/templates/haproxy.cfg.j2
[lb]
10.102.54.43 LB_IF="eth0" LB_ROLE=backup
10.102.54.42 LB_IF="eth0" LB_ROLE=master
[lb:vars]
LB_EP1="10.102.54.42:6443"	# api-server 实际成员地址端口
LB_EP2="10.102.54.43:6443"	# api-server 实际成员地址端口
LB_EP3="10.102.54.44:6443"	# api-server 实际成员地址端口
MASTER_IP="10.102.54.222"  	# api-server 虚地址
MASTER_PORT="8443"		# api-server 服务端口

#确保node节点有变量NODE_ID=node1
[kube-node]
10.102.54.45 NODE_ID=node1 NODE_IP="10.102.54.45"
10.102.54.46 NODE_ID=node2 NODE_IP="10.102.54.46"
10.102.54.47 NODE_ID=node3 NODE_IP="10.102.54.47"

[kube-cluster:children]
kube-node
kube-master

# 预留组，后续添加node节点使用
[new-node]
#10.102.54.xx NODE_ID=node6 NODE_IP="10.102.54.xx"
#10.102.54.xx NODE_ID=node7 NODE_IP="10.102.54.xx"

[all:vars]
# ---------集群主要参数---------------
#集群 MASTER IP, 需要负载均衡，一般为VIP地址
MASTER_IP="10.102.54.222"
KUBE_APISERVER="https://10.102.54.222:8443"

#TLS Bootstrapping 使用的 Token，使用 head -c 16 /dev/urandom | od -An -t x | tr -d ' ' 生成
BOOTSTRAP_TOKEN="9de762eff153167c5c0169a58ea65208"

# 服务网段 (Service CIDR），部署前路由不可达，部署后集群内使用 IP:Port 可达
SERVICE_CIDR="10.68.0.0/16"

# POD 网段 (Cluster CIDR），部署前路由不可达，**部署后**路由可达
CLUSTER_CIDR="172.20.0.0/16"

# 服务端口范围 (NodePort Range)
NODE_PORT_RANGE="2000-8000"

# kubernetes 服务 IP (预分配，一般是 SERVICE_CIDR 中第一个IP)
CLUSTER_KUBERNETES_SVC_IP="10.68.0.1"

# 集群 DNS 服务 IP (从 SERVICE_CIDR 中预分配)
CLUSTER_DNS_SVC_IP="10.68.0.2"

# 集群 DNS 域名
CLUSTER_DNS_DOMAIN="cluster.local."

# etcd 集群间通信的IP和端口, **根据实际 etcd 集群成员设置**
ETCD_NODES="etcd1=https://10.102.54.42:2380,etcd2=https://10.102.54.43:2380,etcd3=https://10.102.54.44:2380"

# etcd 集群服务地址列表, **根据实际 etcd 集群成员设置**
ETCD_ENDPOINTS="https://10.102.54.42:2379,https://10.102.54.43:2379,https://10.102.54.44:2379"

# 集群basic auth 使用的用户名和密码
BASIC_AUTH_USER="admin"
BASIC_AUTH_PASS="infrak8s"

# ---------附加参数--------------------
#默认二进制文件目录
bin_dir="/root/local/bin"

#证书目录
ca_dir="/etc/kubernetes/ssl"

#部署目录，即 ansible 工作目录，建议不要修改
base_dir="/etc/ansible"

#私有仓库 harbor服务器 (域名或者IP)
#需要把 harbor服务器证书复制到roles/harbor/files/harbor-ca.crt
HARBOR_SERVER="harbor.com"
``` 
  * 注意事项

    * 高可用`master`的虚拟`VIP`  
正常情况下安装`HAPROXY`后即可自动通过`ARP`协议生成虚拟`IP`并告知同网络其他机器，但是阿里云的网络不允许`ARP`，这样的话有2种解决方案：

      * 用阿里云`SLB`，后端挂载三台`master`即可，很简单，但这样只实现了负载均衡，并不能实现高可用，因为无法通过`SLB`的健康检查来踢掉挂掉的节点
      * 使用阿里云高可用虚拟`IP`功能，但这个属于阿里云测试功能，需要找客服开通，且**仅支持`VPC`网络**
    * 网络模型  
这个方案采用的`calico`网络模型作为`POD`网络，它默认使用`bgp`协议，但是阿里云同样不支持这个，所以出现的现象就是暴露出来的`nodeport`只能通过`pod`所在的`node`访问，这样的话`k8s`niubility的地方就不存在了。所幸它还支持另一种`IPIP`模式，通过`IP`包方式进行通信，所以需要修改 `roles/calico/templates/calico-node.service.j2` 找到 `-e CALICO_IPV4POOL_IPIP=off \`这行，把`off` 改成 `always`.  
保存后继续安装即可

## 部署addons

  * 安装kube-dns

```bash
kubectl create -f /etc/ansible/manifests/kubedns/kubedns.yaml
``` 
  * 安装kube-dashbord

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/master/src/deploy/recommended/kubernetes-dashboard.yaml
``` 

注意需要修改`svc kubernetest-dashbord`里的`type`为`nodeport`，这样可以从集群外进行访问  
`dashbord`的权限问题  
采用了`token`认证的方式，首先建一个`admin role`，创建 `admin` 用户并赋予管理员权限  
```bash
kubectl apply -f https://raw.githubusercontent.com/rootsongjc/kubernetes-handbook/master/manifests/dashboard-1.7.1/admin-role.yaml
``` 

创建完成后获取 `secret` 和 `token` 的值  
```bash
token=`kubectl -n kube-system get secret|grep admin-token | awk '{print $1}'`    
kubectl -n kube-system describe secret $token
``` 

获取到的`token`既可以用来登录  
或者也可以用`kubeconfig`文件进行登录,位置是每台`node`机器上的`/root/.kube/config`

  * 安装promethus和grafana

```bash
kubectl apply \
--filename https://raw.githubusercontent.com/giantswarm/kubernetes-prometheus/master/manifests-all.yaml
``` 

各种`dashbord`后续再说

  * 日志入graylog  
`ubuntu16.04`下修改`/etc/docker/daemon.json`,添加

```bash
"log-driver": "gelf",
  "log-opts":  {
    "gelf-address": "udp://10.102.54.11:12202"
  },
``` 
  * 支持私有docker-registery  
`ubuntu16.04`下修改`/etc/docker/daemon.json`,添加

```bash
  "insecure-registries" : ["harbor.com"],
``` 

`centos7.x`下

```bash
cp /lib/systemd/system/docker.service /etc/systemd/system/ && sed -i '12s/$/ --insecure-registry=harbor.com/' /etc/systemd/system/docker.service && systemctl daemon-reload && service docker restart
```
