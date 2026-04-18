abstract: Promise.all 真正难的不是 API 长相，而是把结果顺序、错误短路和计数逻辑想清楚。这里先用一篇短文把手写实现拆开。

# 手写 Promise.all 的核心思路

>思路很简单
1. 传入数组，返回一个全新的Promise
2. 回调函数实现：先检查是否是数组，然后直接遍历传入的Promise数组，对成功的返回进行计数，当所有都成功，就更改当前返回的Promise的状态为resolve，如果有一个错误，就返回第一个错误的信息。
```js
function promiseAll(promises) {
    // 返回一个全新的 Promise 对象
    return new Promise(function(resolve, reject) {

        // promise.akll需要传入一个promise的数组
        // 如果不是数组就直接返回
        if(!Array.isArray(promises)){
            throw new TypeError(`argument must be a array`)
        }

        var resolvedCounter = 0;
        var promiseNum = promises.length;
        var resolvedResult = [];
        
        // 然后依次的遍历这个promise数组
        for (let i = 0; i < promiseNum; i++) {

            // Promise.resolve(promises[i])
            // 把任意值（普通值 / Promise 对象）包装成一个标准的 Promise 对象，防止数组中有常量
            // 所以需要包装成Promise
            Promise.resolve(promises[i]).then((value)=>{
                // 如果当前的成功了，就计数，并修改resolvedResult
                resolvedCounter++;
                resolvedResult[i] = value;

                // 如果所有的都成功了，参会调用当前这个promise的resolve
                //注意这里是返回成功的值
                if (resolvedCounter == promiseNum) {
                    return resolve(resolvedResult)
                }
            },error=>{
                // 有一个是失败就直接返回失败
                return reject(error)
            })
        }
    })
}

// test
let p1 = new Promise(function (resolve, reject) {
    setTimeout(function () {
        resolve(1)
    }, 1000)
})
let p2 = new Promise(function (resolve, reject) {
    setTimeout(function () {
        resolve(2)
    }, 2000)
})
let p3 = new Promise(function (resolve, reject) {
    setTimeout(function () {
        resolve(3)
    }, 3000)
})

//手撕
promiseAll([p3, p1, p2]).then(res => {
    console.log(res) // [3, 1, 2]
})

//原始
Promise.all([p3, p1, p2]).then(res => {
    console.log(res) // [3, 1, 2]
})
```
