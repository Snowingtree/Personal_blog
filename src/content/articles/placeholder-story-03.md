abstract: Vue 2 改写数组方法，本质上是在弥补 defineProperty 对数组变更侦测的缺口。把这层机制理顺之后，再看那七个方法会清楚很多。

# Vue中封装的数组方法和具体的实现原理
之前讲到过，vue2使用`Object.defineProperty()`来进行数据劫持，但是它有些操作没法拦截，比如无法拦截对象的新增属性以及只能拦截数组的部分操作，所有vue2重写了数组的一些方法，来让其能够触发响应式更新。

主要有七个方法：
- pop()/push()
- shift()/unshift()
- sort()
- reverse()

## 实现过程
这是整体的代码。
```js
// 缓存数组原型
const arrayProto = Array.prototype;

// 创建新对象，让新对象的对象原型指向数组的原型对象
export const arrayMethods = Object.create(arrayProto);
// 需要进行功能拓展的方法
const methodsToPatch = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse"
];

methodsToPatch.forEach(function (method) {

    // 缓存原生数组方法
    const original = arrayProto[method];
    // 这里为什么是使用def而不是直接的arrayMethods.push？
    // 因为直接的添加属性的话，在后续使用for in遍历数组的时候会遍历出push,但是使用def就能保证push遍历不出来
    
    // 给arrayMethods这个对象，添加一个属性（属性名是method，比如push、pop），属性值是后面的函数。
    def(arrayMethods, method, function mutator(...args) {

        // 执行原生函数，由于原生的push等方法也有返回值，所以这里需要接收
        const result = original.apply(this, args);

        // 获取当前数组身上的响应式观察者对象（Observer 实例）
        const ob = this.__ob__;

        // 记录出新增的元素
        let inserted;
        switch (method) {
            // push、unshift会新增索引，所以要手动observer
            case "push":
            case "unshift":
                inserted = args;
                break;
            // splice方法，如果传入了第三个参数，也会有索引加入，也要手动observer。
            case "splice":
                inserted = args.slice(2);
                break;
        }

        // 如果有新增的元素，将 新增的元素转为响应式，后续修改这些对象的属性，会触发响应式
        if (inserted) ob.observeArray(inserted);

        // 这里就是之前提到的dep属性管理器通知关联的watcher页面更新
        ob.dep.notify();

        return result;
    });
});
```

## 逐一分析
首先，由于是重写方法当然不能从0开始，所以要在数组原来的基础上进行修改。
```js
// 缓存数组原型
const arrayProto = Array.prototype;

// 创建新对象，让新对象的对象原型指向数组的原型对象
export const arrayMethods = Object.create(arrayProto);
```
先创建一个新对象，对象原型指向数组的原型对象，这样，新对象就能够访问到原生的数组方法。

然后是需要重写的方法：
```js
const methodsToPatch = [
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse"
];
```

然后开始重写，`methodsToPatch.forEach()`利用forEach进行遍历。`method`为遍历时候的每一个数组项。

```js
// 缓存原生数组方法
const original = arrayProto[method];
```
>然后难点来了。

```js
def(arrayMethods, method, function mutator(...args){})
```
这里的作用是： 给`arrayMethods`这个对象，添加一个属性（属性名是method，比如push、pop），属性值是后面的函数。**就是给新对象重写poush方法**

一开始我也以为可以使用`arrayMethods.push`直接的接受函数就就行，但是后来问ai才发现，使用def可以保证添加的属性不能被`for in`遍历出来，但是直接添加push的话,会被`for in`遍历出来。

关键就是重写的过程。以下是`function mutator(...args){}`函数体中的内容。

```js
    // 执行原生函数，由于原生的push等方法也有返回值，所以这里需要接收
    const result = original.apply(this, args);
```
利用apply修改this指向，这里的this就是指后续新对象实例的调用者，指向一个数组，这里其实就是利用原始的方法，对数组进行修改（push等）


```js
    // 获取当前数组身上的响应式观察者对象（Observer 实例）
    const ob = this.__ob__;
```
这里需要获取观察者对象，在vue2中响应式数据有Observer实例。这里获取实例是为了方便后续将数据转化为响应式数据和通知对应的watcher进行页面更新。

最后将新的数据（如果有的话）转化为响应式数据。
```js
    // 记录出新增的元素
    let inserted;
    switch (method) {
        // push、unshift会新增索引，所以要手动observer
        case "push":
        case "unshift":
            inserted = args;
            break;
        // splice方法，如果传入了第三个参数，也会有索引加入，也要手动observer。
        case "splice":
            inserted = args.slice(2);
            break;
    }

    // 如果有新增的元素，将 新增的元素转为响应式，后续修改这些对象的属性，会触发响应式
    if (inserted) ob.observeArray(inserted);
```

## 最后
这里其实有一个疑惑，对于初始的数组，修改对应的值是无法触发响应式的，但是对于后续新增的数据，又需要当修改的时候去触发响应式。

**这是ai的回答**：数组本身的索引赋值等操作无法触发响应式，是 Vue2 的技术局限性；而新元素的响应式处理，是 Vue2 在局限性下尽可能完善响应式能力的设计。
