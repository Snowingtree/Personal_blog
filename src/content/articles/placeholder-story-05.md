---
title: 实现call、apply及bind函数
date: 2026-04-09
category: JavaScript
tags: JavaScript, call, apply, bind
abstract: 通过手写实现拆解 call、apply 和 bind 的 this 绑定逻辑，以及 bind 在普通调用和 new 调用下的差异。
---

# 实现call、apply 及 bind 函数

## call()


```js
function add(name){
    console.log(name);
}

let person = {
    name:"小明"
}
Function.prototype.myCall = function(context){

    // 1.判断调用对象
    if (typeof this !== "function") {
        console.error("type error");
    }else{
        console.log("function");
    }

    // 2.获取后面的参数
    let args = [...arguments].slice(1);

    // 3.context是传入的第一个参数，判断 context 是否传入，如果未传入则设置为 window
    context = context || window;

    // 4.将调用函数设为对象的方法
    // 这里的this是指向前面的函数的
    context.fn = this;
    
    // 5.执行
    let result = context.fn(...args);

    // 6.将属性删除,并返回函数执行返回值
    delete context.fn;
    return result;
}


add.myCall(person, "小米")
```
实现过程实际上就是根据传入的实例，和函数，把函数添加成实例上的一个方法，然后调用这个方法，并且根据slice方法，截取初始传入的参数，再传入的这个方法上去，最后从实例身上删除这个方法，然后返回方法返回的返回值

## apply()
这和上面的call()基本类似，就是调用的时候，call()后面是使用`，`对传入的参数进行分割的，而apply()是传入一个参数数组，所以解构的时候，直接解构`arguments`的第二个参数即可。其他和call()一样。

```js
function add(name){
    console.log("add");
    console.log(name)
}

let person = {
    name:"xiao"
}

Function.prototype.myApply = function(context){

    //1.判断调用者是不是函数
    if(typeof(this) === "function"){
        console.log("yes");
    }else{
        console.log(no);
        return;
    }

    // 判断是否传入新的this指向
    context = context || window;

    context.fn = this;

    
    // 获取参数
    // 这里和call不一样，call后面是可以接受无数参数
    // 但是apply是接受第二个参数，是一个参数数组
    if (arguments[1]) {
        result = context.fn(...arguments[1]);
    } else {
        result = context.fn();
    }

    delete context.fn;

    return result;
}

add.myApply(person,["name",19]);
```
## bind()
我觉得最难的就是bind了，首先原始的bind是返回一个新的函数，并且调用的方法又有两种：直接调用和new方法new出新的实例进行调用。

```js
function add(...args){
    console.log(args)
    console.log("name",this.name)
}

let person = {
    name:"xiao"
}

Function.prototype.myBind = function(context){

    //1.判断调用者是不是函数
    if(typeof(this) === "function"){
        console.log("yes");
    }else{
        console.log(no);
        return;
    }

    let args = [...arguments].slice(1);
    fn = this;

    // bind会返回一个函数，这个函数的this指向已经改变了
    return function Fn(){
        // 第一步：决定原函数的this到底指向谁
        // this instanceof Fn 判断函数的调用者，如果是普通调用，就是this指向后面传入的第一个参数
        // 如果是使用new调用的，就传入调用者
        // 关键是保证new的逻辑没问题
        const finalThis = this instanceof Fn ? this : context;

        /*
            const finalThis = context;
            如果这样写，那么new出来实例，函数的this是指向person的，而不是new的新实例
        */
        
        // 第二步：拼接参数（bind时的参数 + 调用之后调用的参数时的参数）
        const finalArgs = args.concat(...arguments);

        // 执行原函数，返回结果
        return fn.apply(finalThis, finalArgs);
    }
  
}

// 这是简单的绑定，会返回一个全选的函数，函数的this指向person,后面是参数
let newperson = add.myBind(person,"name",19);

// 这里就是在指向后续返回的新函数
newperson();
// console.log(args) 打印之前bind传入的参数
newperson("你好，bind");
// console.log(args) 会将现在传入的和之前的进行拼接，在传入绑定的函数中

let people = new newperson("new person");

// 此时的people就是指向newperson的原型对象的
```

这里的关键是这一个：

```js
const finalThis = this instanceof Fn ? this : context;
```
即，根据不同的调用方法，使用不同的this。

如果是使用`newperson()`调用，就是把返回的函数作为普通的函数进行调用，那函数中的this应该指向之前bind传入的实例，但是如果是使用new，将`newperson();`作为构造函数进行调用的话，那么此时函数内部的this应该指向新的实例，而不是bind时候的person。

所以，需要`this instanceof Fn`进行判断，当前的this的类型是否是Fn，如果是，说明this是通过new出来的，构造函数时Fn，所以直接返回当前的this即可，如果不是，就说明是普通函数调用的，this应该指向bind的person。
