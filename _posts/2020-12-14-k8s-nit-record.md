---
layout: post
title: "Kubernetes 随笔"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/k8s-nit-record/
categories: ["k8s"]
tags: ["go", "k8s"]
---

{% raw %}
### 何时重建podsandbox

在主逻辑[SyncPod](https://github.com/kubernetes/kubernetes/blob/99c50dfd3c0a07f2576d9572f5ee313447a325a8/pkg/kubelet/kuberuntime/kuberuntime_manager.go#L644) 里会进行判断  
调用[computePodActions](https://github.com/kubernetes/kubernetes/blob/99c50dfd3c0a07f2576d9572f5ee313447a325a8/pkg/kubelet/kuberuntime/kuberuntime_manager.go#L474) 里面进而调用[podSandboxChanged](https://github.com/kubernetes/kubernetes/blob/99c50dfd3c0a07f2576d9572f5ee313447a325a8/pkg/kubelet/kuberuntime/kuberuntime_manager.go#L417)  
看函数注释就能看出来何时认为podsandboxchanged，进而重建  
```bash
0.No sandbox for pod 
1.Needs to create a new sandbox when readySandboxCount > 1 or the ready sandbox is not the latest one.
2.Needs to create a new sandbox when network namespace changed.
3.Needs to create a new sandbox when the sandbox does not have an IP address.
``` 

但是如果pod没有配置shouldRestartOnFailure，那么返回的`changes.CreateSandbox = false`

### CNI分配失败后会怎样

cni插件是放在dockershim里， _是cri的一部分？_

上面判断需要createsandbox后  
就各种调用，可以看kubelet调用图里，最后发一个cri grpc请求，RunSandBox  
如果失败，直接返回err，并生成event，记录trace  
然后syncpod在syncloop里，会继续重试，但不会**干预调度结果** , 会一直在这个node上重试

### pod status

```bash
// PodPending means the pod has been accepted by the system, but one or more of the containers
// has not been started. This includes time before being bound to a node, as well as time spent
// pulling images onto the host.
PodPending PodPhase = "Pending"
// PodRunning means the pod has been bound to a node and all of the containers have been started.
// At least one container is still running or is in the process of being restarted.
PodRunning PodPhase = "Running"
// PodSucceeded means that all containers in the pod have voluntarily terminated
// with a container exit code of 0, and the system is not going to restart any of these containers.
PodSucceeded PodPhase = "Succeeded"
// PodFailed means that all containers in the pod have terminated, and at least one container has
// terminated in a failure (exited with a non-zero exit code or was stopped by the system).
PodFailed PodPhase = "Failed"
// PodUnknown means that for some reason the state of the pod could not be obtained, typically due
// to an error in communicating with the host of the pod.
PodUnknown PodPhase = "Unknown"
``` 

### 获取pod内某一项

之前的想法是遍历  
```bash
kubectl -n xxxx get pods  -o go-template --template='{{range .items}}{{ range $key, $value := .metadata.labels }}{{if eq $key "paas.sogou.com/app"}}{{$value}}{{"\n"}}{{end}}{{end}}{{end}}'
``` 

后来发现go template有个关键字叫index  
```text
kubectl -n xxxx get pod pod-name  --template='{{index .metadata.labels "paas.sogou.com/app"}}'
``` 

获取全部  
```text
kubectl -n xxxx get pod --template=='{{range .items}}{{index .metadata.labels "paas.sogou.com/app"}}{{"\n"}}{{end}}'
``` 

而且还有`--sort-by`、`custom-columns=`、`--field-selector`
{% endraw %}
