---
title: 双向数据绑定的原理
date: 2026-04-09
category: Vue
tags: Vue, 双向绑定, 响应式
abstract: 从数据劫持、Dep 和 Watcher 的协作关系出发，梳理 Vue 双向数据绑定的完整更新链路。
---

# 双向数据绑定的原理
Vue利用**数据劫持**结合**发布者-订阅者模式**，通过Object.defineProperty()来劫持各个属性的setter，getter，在数据变动时发布消息给订阅者，触发相应的监听回调。

即在VUe实例创建的时候，利用`Object.defineProperty()`将data中的属性，转化为拥有getter和setter中的响应式属性，当数据变动的时候，触发setter，setter通知Dep属性管理器，Dep通知对应的watcher，最后更新数据。

主要步骤：
1. observe（观察者）对数据进行遍历，包括子对象，将数据转为响应式数据（拥有getter和setter）,当数据修改，触发setter。
2. compile（解析器）解析模板，将模板中变量替换为真实数据，然后初始化渲染页面视图，并将DOM节点绑定更新函数，将对应Watcher注册到Dep中，当数据修改，触发setter，通知Dep，Dep通知watcher，**更新视图**
3. Watcher（订阅者）是上面两个的桥梁，主要做的事情： 1. 在自身实例化时往属性订阅器(dep)里面添加自己。2.自身必须有一个update()方法，当Dep通知时，调用更新方法，并触发Compile中绑定的DOM更新函数（回调）

>MVVM作为数据绑定的入口，整合Observer、Compile和Watcher三者，通过Observer来监听自己的model数据变化，通过Compile来解析编译模板指令，最终利用Watcher搭起Observer和Compile之间的通信桥梁，达到数据变化 -> 视图更新；视图交互变化(input) -> 数据model变更的双向绑定效果。
