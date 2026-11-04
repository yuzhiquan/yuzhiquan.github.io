---
layout: post
title: "CAS5.x编译、部署(2)-SAML2.0认证协议支持"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/CAS-compile-plugin2/
categories: ["IT-CAS"]
tags: ["CAS", "IT"]
---
## 升级5.1.0

`CAS`与`SAP`进行`SAML2.0`协议认证时有[#2496](https://github.com/apereo/cas/issues/2496)问题，在`V5.1.0-RC3`修复，所以在`5.1.0`正式`release`后进行升级.  
修改`gradle.properties`  
```bash
cas.version=5.1.0
``` 

同时修改`cas/build.gradle`  
```bash
apply from: 'https://raw.githubusercontent.com/apereo/cas/5.1.x/gradle/overrides.gradle'#由5.0.x改为5.1.x
``` 

重新编译替换即可

## SAML2.0认证支持

保证编译war包时添加了  
```bash
compile "org.apereo.cas:cas-server-support-saml-idp:${project.'cas.version'}"
``` 

要把证书引入到java环境中：  
```bash
keytool -import -alias cas-main  -keystore $JAVA_HOME/jre/lib/security/cacerts -file /tmp/host.cer
``` 

引入了证书到linux的认证目录下（不确定是否有用处）  
```bash
cp 证书 /usr/local/share/ca-certificates/ && update-ca-certificates
``` 

注意：  
1.通配符域名如*.com，会报DNS 找不到host  
2.不引入证书到cas-server的java环境的话，会报  
```bash
Caused by: javax.net.ssl.SSLHandshakeException: sun.security.validator.ValidatorException: PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target
``` 

### 配置SAML2 SPmetadata

配置中添加了  
```bash
cas.authn.samlIdp.metadata.location=/etc/cas/saml #5.1.0后需要加file:,否则报错识别不了
cas.authn.samlIdp.metadata.location=file:/etc/cas/saml
``` 

所以把`SPMetadata`放到`/etc/cas/saml`下  
然后以`services`的形式配置SP信息，`path`为`tomcat/webapps/cas/WEB-INF/classes/services`,格式为`json`文件  
配置文件内容为：  
```bash
{
  "@class" : "org.apereo.cas.support.saml.services.SamlRegisteredService",
  "serviceId" : "***********", #为metadata里的entityId
  "name" : "SAMLService", #唯一的名字
  "id" : 10000003, #唯一且递增的id
  "evaluationOrder" : 10,
  "metadataLocation" : "/etc/cas/saml2/ServiceProviderSAML2Metadata_New.xml" #指定metadata的path
}
``` 

多个SP的话就配置多个services  
update:  
cas 5.1.0正式版release后，从json文件load service需要在配置中添加：  
```bash
cas.serviceRegistry.initFromJson=true
```
