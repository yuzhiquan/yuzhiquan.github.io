---
layout: post
title: "CAS5.x编译、部署(1)-LDAP支持"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/CAS-compile-plugin/
categories: ["IT-CAS"]
tags: ["CAS", "IT"]
---
## 依赖

测试环境: `ubuntu14.04`  
`JDK`: `jdk1.8.0_121`  
`tomacat`: `apache-tomcat-8.5.13`(**cas5.x需要tomcat8.0以上**)  
安装依赖：  
`jdk`安装

```bash
mv jdk1.8.0_121 /usr/local
cat<< EOF >>/etc/profile
export JAVA_HOME=/usr/local/jdk1.8.0_121
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar
export PATH=$JAVA_HOME/bin:$PATH
EOF
source /etc/profile
``` 

`tomcat`安装  
```bash
tar zxf apache-tomcat-8.5.13.tar.gz
mv apache-tomcat-8.5.13 /usr/local
ln -s /usr/local/apache-tomcat-8.5.13  /usr/local/tomcat
``` 

## 编译

注意，编译某个分支不要直接拉代码编，出问题的可能性很大  
**`CAS5.x`之后，只支持`gradle`编译方式**  
可以使用官方提供的模板来进行编译  
```bash
wget https://github.com/apereo/cas-gradle-overlay-template/archive/master.zip
unzip master.zip
cp -r cas-gradle-overlay-template-master /etc/cas
cd /etc/cas && ./gradlew clean build
``` 

如果要指定编译版本，修改`gradle.properties`  
```bash
cas.version=5.0.5
``` 

如需添加插件进行编译，如`ldap`、`SAML`、`MFA`等等插件，修改`cas/build.gradle`  
```bash
dependencies {
    compile "org.apereo.cas:cas-server-webapp:${project.'cas.version'}@war"
    compile "org.apereo.cas:cas-server-support-ldap:${project.'cas.version'}"
    compile "org.apereo.cas:cas-server-support-saml-idp:${project.'cas.version'}"
    compile "org.apereo.cas:cas-server-support-gauth:${project.'cas.version'}"
}
``` 

编译好的`war`包，在`cas/build/libs`下

## 服务启动

将编译好的`war`包放到`/usr/local/tomcat/webapps/`下  
然后启动`tomcat`：  
```bash
/usr/local/tomcat/bin/catalina.sh  start
``` 

服务管理通过`/usr/local/tomcat/bin/catalina.sh`脚本  
`CAS`服务相关配置修改都在`/usr/local/tomcat/webapps/cas/WEB-INF/classes/application.properties`  
`log`控制调整配置文件是`/usr/local/tomcat/webapps/cas/WEB-INF/classes/log4j2.xml`

## 插件配置

需要保证编译时已添加各种插件  
配置文件（`/usr/local/tomcat/webapps/cas/WEB-INF/classes/application.properties`）

### `ldap`配置

```bash
cas.authn.accept.users= #去掉默认的账号密码
#配置LDAP认证方式
cas.authn.attributeRepository.ldap.ldapUrl= #修改ldap地址
cas.authn.attributeRepository.ldap.useSsl=false
cas.authn.attributeRepository.ldap.useStartTls=false
cas.authn.attributeRepository.ldap.connectTimeout=5000
cas.authn.attributeRepository.ldap.baseDn= #修改用户bashDn
cas.authn.attributeRepository.ldap.userFilter=user={user} #修改用户查询方式
cas.authn.attributeRepository.ldap.subtreeSearch=true
cas.authn.attributeRepository.ldap.bindDn= #填写bindDn
cas.authn.attributeRepository.ldap.bindCredential=******* #填写密码
cas.authn.attributeRepository.ldap.trustCertificates=
cas.authn.attributeRepository.ldap.keystore=
cas.authn.attributeRepository.ldap.keystorePassword=
cas.authn.attributeRepository.ldap.keystoreType=JKS
cas.authn.attributeRepository.ldap.minPoolSize=3
cas.authn.attributeRepository.ldap.maxPoolSize=10
cas.authn.attributeRepository.ldap.validateOnCheckout=true
cas.authn.attributeRepository.ldap.validatePeriodically=true
cas.authn.attributeRepository.ldap.validatePeriod=600
cas.authn.attributeRepository.ldap.failFast=true
cas.authn.attributeRepository.ldap.idleTime=500
cas.authn.attributeRepository.ldap.prunePeriod=600
cas.authn.attributeRepository.ldap.blockWaitTime=5000
cas.authn.attributeRepository.attributes.samaccountname=samaccountname #查询主键
cas.authn.attributeRepository.attributes.displayName=displayName
cas.authn.attributeRepository.attributes.cn=cn
  
#配置ldap认证服务器
##
# LDAP
#
# Interesting part for Active Directory:
cas.authn.ldap[0].type=AD #ldap服务类型
cas.authn.ldap[0].ldapUrl= #修改ldap地址
cas.authn.ldap[0].useSsl=false
cas.authn.ldap[0].useStartTls=false
cas.authn.ldap[0].connectTimeout=5000
cas.authn.ldap[0].baseDn= #修改用户bashDn
cas.authn.ldap[0].userFilter=user={user} #修改用户查询方式
cas.authn.ldap[0].subtreeSearch=true
cas.authn.ldap[0].bindDn= #配置账户
cas.authn.ldap[0].bindCredential=*********#配置密码
 
cas.authn.ldap[0].dnFormat=cn=%s,OU=Users,OU=,DC=,dc=com #配置查询语句
cas.authn.ldap[0].principalAttributeId=samaccountname #配置属性查询
cas.authn.ldap[0].principalAttributePassword=
cas.authn.ldap[0].principalAttributeList=samaccountname,sn,cn,givenName,displayName  #配置返回属性
cas.authn.ldap[0].failFast=false
# Default values:
cas.authn.ldap[0].minPoolSize=3
cas.authn.ldap[0].maxPoolSize=10
cas.authn.ldap[0].validateOnCheckout=true
cas.authn.ldap[0].validatePeriodically=true
cas.authn.ldap[0].validatePeriod=600
cas.authn.ldap[0].idleTime=5000
cas.authn.ldap[0].prunePeriod=5000
cas.authn.ldap[0].blockWaitTime=5000
``` 

### `SAML`配置

```bash
#saml
cas.samlCore.ticketidSaml2=false
cas.samlCore.skewAllowance=0
cas.samlCore.attributeNamespace=http://www.ja-sig.org/products/cas/
cas.samlCore.issuer=
cas.authn.samlIdp.entityId= #配置地址
cas.authn.samlIdp.hostName= #配置域名
cas.authn.samlIdp.scope= #配置域
cas.authn.samlIdp.metadata.cacheExpirationMinutes=30
cas.authn.samlIdp.metadata.failFast=true
cas.authn.samlIdp.metadata.location=/etc/cas/saml #配置 file:/etc/cas/saml
cas.authn.samlIdp.metadata.privateKeyAlgName=RSA
cas.authn.samlIdp.metadata.requireValidMetadata=true
 
cas.authn.samlIdp.metadata.basicAuthnUsername=
cas.authn.samlIdp.metadata.basicAuthnPassword=
cas.authn.samlIdp.metadata.supportedContentTypes=
cas.authn.samlIdp.logout.forceSignedLogoutRequests=true
cas.authn.samlIdp.logout.singleLogoutCallbacksDisabled=false
cas.authn.samlIdp.response.skewAllowance=0
cas.authn.samlIdp.response.signError=false
cas.authn.samlIdp.response.overrideSignatureCanonicalizationAlgorithm=
cas.authn.samlIdp.response.useAttributeFriendlyName=true
```
