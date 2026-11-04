---
layout: post
title: "AliYun阿里云API签名机制（Python）"
date: 2020-12-14 00:00:00 +0800
permalink: /2020/12/14/aliyun-api-Signature-base-on-python/
categories: ["python"]
tags: ["aliyun", "python"]
---
最近在写阿里云相关`API`,看[官方文档](https://help.aliyun.com/document_detail/27572.html?spm=5176.doc27577.6.112.jzBpJ7)，其中比较重要的就是签名机制，为了在`SLB`和`ECS`中使用,封装了相关类备用

```python
#!/usr/bin/env python
#coding: utf-8
#python v2.7.6

import sys, os
import urllib, urllib2
import base64
import hmac
import hashlib
import time
import uuid
import json
import ConfigParser

cf = ConfigParser.ConfigParser()
cf.read('conf.ini')

access_key_id = cf.get("aliyun", "access_key_id")
access_key_secret = cf.get("aliyun", "access_key_secret")

slb_address = cf.get("aliyun", "slb_address")
ecs_address = cf.get("aliyun", "ecs_address")

slb_api_version = cf.get("aliyun", "slb_api_version")
ecs_api_version = cf.get("aliyun", "ecs_api_version")

class ALIYUN:
    def __init__(self, user_params, Host, Version=slb_api_version):
        self.user_params = user_params
        #self.user_params= {'Action': self.Action, 'LoadBalancerId': self.LoadBalancerId,'BackendServers':self.BackendServers}
        self.server_address = Host
        self.version = Version

    @staticmethod
    def percent_encode(str):
        res = urllib.quote(str.decode(sys.stdin.encoding).encode('utf8'), '')
        res = res.replace('+', '%20')
        res = res.replace('\'', '%27')
        res = res.replace('\"', '%22')
        res = res.replace('*', '%2A')
        res = res.replace('%7E', '~')
        return res

    @staticmethod
    def compute_signature(parameters, access_key_secret):
        sortedParameters = sorted(parameters.items(),
                                  key=lambda parameters: parameters[0])
        canonicalizedQueryString = ''
        for (k, v) in sortedParameters:
            canonicalizedQueryString += '&' + ALIYUN.percent_encode(
                k) + '=' + ALIYUN.percent_encode(str(v))
        stringToSign = 'GET&%2F&' + ALIYUN.percent_encode(
            canonicalizedQueryString[1:])
        h = hmac.new(access_key_secret + "&", stringToSign, sha1)
        signature = base64.encodestring(h.digest()).strip()
        return signature

    @staticmethod
    def compose_url(server_address, user_params, version):
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        parameters = { \
                'Format'        : 'JSON', \
                'Version'       : version, \
                'AccessKeyId'   : access_key_id, \
                'SignatureVersion'  : '1.0', \
                'SignatureMethod'   : 'HMAC-SHA1', \
                'SignatureNonce'    : str(uuid.uuid1()), \
                'TimeStamp'         : timestamp, \
        }
        for key in user_params.keys():
            parameters[key] = user_params[key]
        signature = ALIYUN.compute_signature(parameters, access_key_secret)
        parameters['Signature'] = signature
        url = server_address + "/?" + urllib.urlencode(parameters)
        print url
        return url

    def make_request(self, quiet=False):
        url = ALIYUN.compose_url(self.server_address, self.user_params,
                                 self.version)
        request = urllib2.Request(url)
        try:
            conn = urllib2.urlopen(request)
            response = conn.read()
        except urllib2.HTTPError, e:
            print(e.read().strip())
            raise SystemExit(e)
        try:
            obj = json.loads(response)
            if quiet:
                return obj
        except ValueError, e:
            raise SystemExit(e)
        json.dump(obj, sys.stdout, sort_keys=True, indent=2)
        sys.stdout.write('\n')

if __name__ == "__main__":
    testAdd=ALIYUN( \
            {'Action':'AddBackendServers',\
            'LoadBalancerId':'139a00604ad-cn-east-hangzhou-01',\
            'BackendServers':[{"ServerId":"vm-233","Weight":"0"},{"ServerId":"vm-234","Weight":"0"}]\
            },slb_address
            )
    testRemove=ALIYUN( \
            {
            'Action':'RemoveBackendServers',\
            'LoadBalancerId':'139a00604ad-cn-east-hangzhou-01',\
            'BackendServers':[" vm-233"," vm-234"]\
            },slb_address
            )
    testSet=ALIYUN( \
            {
            'Action':'SetBackendServers',\
            'LoadBalancerId':'139a00604ad-cn-east-hangzhou-01',\
            'BackendServers':[{"ServerId":"vm-233","Weight":"0"},{"ServerId":"vm-234","Weight":"0"}]\
            },slb_address
            )
    testEcs=ALIYUN( \
            {
            'Action':'DescribeInstances',\
            'RegionId':'cn-hangzhou',\
            },ecs_address,
            Version=ecs_api_version
            )
    testSLBd = ALIYUN({'Action': 'DescribeRegions'}, slb_address)
    testSLBd1 = ALIYUN(
        {'Action': 'DescribeLoadBalancers',
         'RegionId': 'cn-hangzhou'}, slb_address)
    testSLBd2 = ALIYUN(
        {'Action': 'DescribeLoadBalancers',
         'RegionId': 'cn-beijing'}, slb_address)
    testSLBd.make_request()
    testSLBd1.make_request()
    print testSLBd2.make_request(quiet=True)
```
