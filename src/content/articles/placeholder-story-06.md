---
title: 手写new操作符执行过程
date: 2026-04-09
category: JavaScript
tags: JavaScript, new, 原型链
abstract: 按创建对象、连接原型、绑定 this 和处理返回值这四步，拆解 new 操作符的底层执行流程。
---

# 手写new操作符执行过程
>主要分四个步骤
1. 创建空对象
2. 设置空对象的对象原型，指向对应构造函数的原型对象
3. 绑定this，并且执行构造函数
4. 判断 构造函数 返回值类型

## 前置知识
>Object.create(构造函数的原型对象)

新建一个空对象，对象的原型为构造函数的 prototype 对象

>constructor.apply(newObject, arguments);

执行constructor，并且把constructor的this绑定到newObject，传入参数

## 手写过程

```js
// 手撕new的过程
function Person(name,age){
    this.name = name;
    this.age = age;
}

// 构造函数
function MyNew(constructor,...args){
    // 分别接受构造函数和后续的参数
    // f  ['my', 18]
    console.log(constructor,args);

    // 1.创建空对象
    let newObj = null;

    // 2.修改对象的对象原型，指向构造函数的原型对象
    newObj = Object.create(constructor.prototype)

    // 3.绑定this，并且执行构造函数
    let result = constructor.apply(newObj,args); //将constructor的this绑定为newObj,并且传入后续的参数

    // 4.判断 构造函数 返回值类型
    let flag = result && (typeof result === "object" || typeof result === "function");
    
    // 如果是对象或者函数，就返回构造函数返回值，否则返回新对象
    return flag ? result : newObj;
}



// 入口
const ret = MyNew(Person,"my",18);
console.log(ret)
```

## 问题
>最后为什么要判断返回值的类型？

首先，因为上面的构造函数没有显示的返回值，所以会返回undefined，这里就需要返回自己创建的newObj。

如果构造函数有返回值，就直接返回构造函数的返回值即可，就不需要自己创建的实例了。

```
function Person(name, age) {
  this.name = name;
  this.age = age;
  // 手动返回一个新对象
  return { nickname: "小明", gender: "男" };
}
```
>返回值的类型

并且需要根据构造函数的返回值类型进行选择，保证只返回函数或者对象类型，如果是基础类型，就直接返回构造函数返回的结果

``` 
let flag = result && (typeof result === "object" || typeof result === "function");
```

>那在哪一步对自己创建的对象赋值了呢？


```
let result = constructor.apply(newObj,args);
```
这里apply执行之后，newObj就变成了根据传入参数new和构造函数创建的对象了，而result就是对象的返回值。

*本人水平有限，如有错误欢迎在评论区指正*

