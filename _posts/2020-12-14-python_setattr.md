---
layout: post
title: "python的属性设置"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/python_setattr/
categories: ["python"]
tags: ["python"]
---
> python中的属性管理由`__dict__`存储

### `__getattr__`与`__getattribute__`

#### 区别

  * `__getattr__`在访问不存在的成员时才会触发，可以用来做部分异常处理
  * `__getattribute__`则拦截所有对属性的访问（包括对`__dict__`的访问），如果`class`同时定义了`__getattr__`和`__getattribute__`，`__getattr__`不会生效 ```python
In [29]: class Test(object):
    ...:     def __init__(self,name):
    ...:         self.name=name
    ...:     def __getattr__(self,*args,**kwargs):
    ...:         if 'age' in args:
    ...:             return 20
    ...:     def __setattr__(self,*args,**kwargs):
    ...:         return object.__setattr__(self,*args,**kwargs)
    ...:
    ...:

In [30]: t=Test('haha')

In [31]: t.__dict__
Out[31]: {'name': 'haha'}

In [32]: t.age
Out[32]: 20

In [33]: t.age=100

In [34]: t.age
O ut[34]: 100

In [35]: t.__dict__
Out[35]: {'age': 100, 'name': 'haha'}
``` 

`__getattribute__`只有新式类才生效，继承自`object`的类

## `__setattr__`

每当属性被赋值的时候， `__setattr__()` 会被调用，所以有可能造成递归调用，比如：  
```python
#wrong
def __setattr__(self, name, value):
    self.name = value
#right
def __setattr__(self, name, value):
    self.__dict__[name] = value
``` 

一般来说都是在获取某个属性的时候做特殊处理或限制，设置属性时很少会涉及。
