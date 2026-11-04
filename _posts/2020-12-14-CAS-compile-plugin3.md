---
layout: post
title: "CAS5.x编译、部署(3)-登录页定制"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/CAS-compile-plugin3/
categories: ["IT-CAS"]
tags: ["CAS", "IT"]
---
## 定制登录页

  * 静态资源的位置：  
`webapps/cas/WEB-INF/classes/static`,包括`CSS`、`JS`等静态文件
  * 登录页模板位置：`webapps/cas/WEB-INF/classes/templates`,以组件的方式加载了很多其他子模板，简单的说就是控制页面的布局，写过`vue`、`react`之类的应该了解，比如我们也要修改的登录页文件就是`casLoginView.html`,把原来右边的各项组件都去掉，只保留登录框  
保留: ```html
<div class="col-sm-12 col-md-6 col-md-push-3 ">
``` 

去掉:  
```html
<div id="notices" class="col-sm-12 col-md-6 col-md-push-6">
    <div th:replace="fragments/insecure"/>
     <div th:replace="fragments/defaultauthn"/>
     <div th:replace="fragments/cookies"/>
     <div th:replace="fragments/serviceui"/>
     <div th:replace="fragments/cas-resources-list" 
     <div th:replace="fragments/loginProviders" />
 </div>
 <div class="col-sm-12 col-md-6 col-md-pull-6">
``` 

  * 修改具体各个组件的显示，则是在`webapps/WEB-INF/classes/templates/fragments`下, 可以配合静态资源的修改来自定义登录页
  * 各项提示语文件则是根据语言不同，在`webapps/cas/WEB-INF/classes`下的`messages_*.properties`文件，大陆的话就是`messages_zh_CN.properties`文件

**有些基本的页面功底就可以进行登录页自定义了**
