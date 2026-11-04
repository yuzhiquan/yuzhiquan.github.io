---
layout: post
title: "Kubernetes flannel beackend develop"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/flannel-hostgw-backend-dev/
categories: ["k8s"]
tags: ["go", "k8s"]
---
通读`Flannel`代码以及如何编写`backend`进行网络开发

### Flannel代码组织

代码[private](https://git.n.xiaomi.com/ocean_old/flannel/-/tree/master/)和[public](https://github.com/coreos/flannel)结构  
```bash
├── backend
│   ├── alivpc
│   ├── alloc
│   ├── awsvpc
│   ├── common.go
│   ├── extension
│   ├── gce
│   ├── hostgw
│   ├── hostgw_ocean
│   ├── kscvpc
│   ├── kscvpc_ocean
│   ├── manager.go
│   ├── udp
│   └── vxlan
├── bill-of-materials.json
├── bill-of-materials.override.json
├── CONTRIBUTING.md
├── DCO
├── dist
│   ├── bill-of-materials.sh
│   ├── extension-hostgw
│   ├── extension-vxlan
│   ├── fake-node.yaml
│   ├── functional-test.sh
│   ├── iptables-amd64
│   ├── iptables-arm
│   ├── iptables-arm64
│   ├── iptables-ppc64le
│   ├── iptables-s390x
│   ├── license-check.sh
│   ├── mk-docker-opts.sh
│   ├── mk-docker-opts_tests.sh
│   └── sample_subnet.env
├── Dockerfile.amd64
├── Dockerfile.arm
├── Dockerfile.arm64
├── Dockerfile.ppc64le
├── Dockerfile.s390x
├── Documentation
│   ├── alicloud-vpc-backend.md
│   ├── aws-vpc-backend.md
│   ├── backends.md
│   ├── building.md
│   ├── configuration.md
│   ├── extension.md
│   ├── gce-backend.md
│   ├── img
│   ├── integrations.md
│   ├── k8s-manifests
│   ├── kube-flannel-aliyun.yml
│   ├── kube-flannel.yml
│   ├── Kubernetes.md
│   ├── minikube.yml
│   ├── production-users.md
│   ├── reporting_bugs.md
│   ├── reservations.md
│   ├── running.md
│   └── troubleshooting.md
├── glide.lock
├── glide.yaml
├── LICENSE
├── license-check.sh
├── logos
│   ├── flannel-glyph-color.png
│   ├── flannel-glyph-color.svg
│   ├── flannel-glyph-white.png
│   ├── flannel-glyph-white.svg
│   ├── flannel-horizontal-bw.png
│   ├── flannel-horizontal-bw.svg
│   ├── flannel-horizontal-color.png
│   ├── flannel-horizontal-color.svg
│   ├── flannel-horizontal-white.png
│   └── flannel-horizontal-white.svg
├── main.go
├── MAINTAINERS
├── Makefile
├── network
│   ├── iptables.go
│   └── iptables_test.go
├── NOTICE
├── packet-01.png
├── pkg
│   └── ip
├── README.md
├── subnet
│   ├── config.go
│   ├── config_test.go
│   ├── etcdv2
│   ├── kube
│   ├── subnet.go
│   └── watch.go
├── tools
│   └── token.go
├── vendor
│   ├── cloud.google.com
│   ├── github.com
│   ├── golang.org
│   ├── google.golang.org
│   ├── gopkg.in
│   └── k8s.io
└── version
    └── version.go
``` 

比较重要的就是`backend`、`network` `pkg` `subnet` `tools`等目录，其中`main.go`为入口

### main.go

  * 在导入各个`backend`时，会调用各个`backend`的`init`函数，主要用来注册`backend`到全局的`constructors`中

```go
func init() {
  backend.Register("host-gw", New)
  }
``` 

注册`backend`的`type`和`new`构造函数

  * `main.go`中`init`中解析`cmd`参数[main.go#L111](https://github.com/coreos/flannel/blob/master/main.go#L111)
  * 对解析出的参数进行校验
  * 根据参数判断主要操作的网卡[main.go#L198](https://github.com/coreos/flannel/blob/aedcbade5a67742e5bb3273f383d4d6db309c2ac/main.go#L198)
  * 生成一个`subnetmanager`，主要是封装了`subnet`存入`etcdv2`以及一些事件event的生成和维护[main.go#L241](https://github.com/coreos/flannel/blob/aedcbade5a67742e5bb3273f383d4d6db309c2ac/main.go#L241)
  * 一些信号的捕获处理
  * 健康检查服务启动
  * 获取网络配置，这些网络配置是通过`subnetmanager`来获取的，保存在`etcd`里
  * 构造`backendmanager`[main.go#L280](https://github.com/coreos/flannel/blob/aedcbade5a67742e5bb3273f383d4d6db309c2ac/main.go#L280)
  * 根据网络配置的`backendtype`从全局的`constructors`获取相应的`backend`构造函数并执行，生成想要的`backend`实现
  * 执行`backend`的`RegisterNetwork`方法，这个方法返回了一个实现了`backend.Network`的网络

```go
 type Network interface {
Lease() *subnet.Lease
MTU() int
   Run(ctx context.Context)
   }
``` 

需要实现`interface`里三个方法，具体实现后面分析

  * 是否需要`NAT`，来设置`iptables`规则[main.go#L298](https://github.com/coreos/flannel/blob/aedcbade5a67742e5bb3273f383d4d6db309c2ac/main.go#L298)
  * 写入`subnet`文件，持久化`flannel`子网信息到本地
  * 执行`backend.Network`的`Run`，启动服务监听`subnet event`，并根据类型进行设置，比如添加子网、删除子网时做些工作

### backend实现

`backend`的`interface`定义  
```text
type Backend interface {
	// Called when the backend should create or begin managing a new network
	RegisterNetwork(ctx context.Context, wg *sync.WaitGroup, config *subnet.Config) (Network, error)
}
``` 

只需要实现`RegisterNetwork`方法，但是它返回的是一个`Network interface`，所以还需要实现`Network`接口  
其中`host-gw`的实现

#### host-gw

```go
// backend需要实现的RegisterNetwork
n := &network{
		extIface: be.extIface,
		sm:       be.sm,
	}

	attrs := subnet.LeaseAttrs{
		PublicIP:    ip.FromIP(be.extIface.ExtAddr),
		BackendType: "host-gw",
	}
l, err := be.sm.AcquireLease(ctx, &attrs)
	switch err {
	case nil:
		n.lease = l

	case context.Canceled, context.DeadlineExceeded:
    return nil, err
    
....
``` 

主要就是申请了一个`lease`(租约)，并赋值给实现的`NetWork`  
申请`lease`主要的调用链  
```text
AcquireLease-->tryAcquireLease
``` 

`tryAcquireLease`更多是为了找到一个适合的`subnet`(这些信息保存在`etcdv2`)里，然后组成`network`实例  
然后就是核心逻辑`network`的`Run`方法  
```go
func (n *network) Run(ctx context.Context) {
	wg := sync.WaitGroup{}

	log.Info("Watching for new subnet leases")
	evts := make(chan []subnet.Event)
	wg.Add(1)
	go func() {
		subnet.WatchLeases(ctx, n.sm, n.lease, evts)
		wg.Done()
	}()

	// Store a list of routes, initialized to capacity of 10.
	n.rl = make([]netlink.Route, 0, 10)
	wg.Add(1)

	// Start a goroutine which periodically checks that the right routes are created
	go func() {
		n.routeCheck(ctx)
		wg.Done()
	}()

	defer wg.Wait()

	for {
		select {
		case evtBatch := <-evts:
			n.handleSubnetEvents(evtBatch)

		case <-ctx.Done():
			return
		}
	}
}
``` 

`WatchLeases`通过监听`etcd`里的`subnet`变化,返回`event`切片，然后写入`evts`管道  
`handleSubnetEvents`消费`evts`管道里的消息，根据`evt.Type`执行不同的操作也就是  
`addToRouteList`和`removeFromRouteList`来增删子网路由  
这些路由都是在**宿主机** 上的

#### host-gw-ocean

自研的`backend`，主要是把路由写到交换机上  
它的流程与`host-gw`相同  
但是他的核心逻辑`addRoute`在`RegisterNetwork`方法里，主要的功能是`http`调用交换机接口，把子网信息和网关写到**交换机** 上，由交换机广播出去  
但是`delRoute`在`Run`里，这里估计调用不了`defer` ，因为`Run`里面有个`for`循环不断监听子网变化`evt`  
为什么没写在`handleSubnetEvents`，我理解应该是因为其他机器子网的添加，不需要维护交换机，由所在`node`上的`flannel`进城维护子网即可
