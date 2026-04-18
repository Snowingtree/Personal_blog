abstract: keep-alive 最容易混乱的地方不是 API 本身，而是它在组件切换时到底缓存了什么、什么时候复用实例。这里先把判断、缓存和 LRU 淘汰顺一遍。

# keep-alive
如果需要在组件切换的时候，保存一些组件的状态防止多次渲染，就可以使用 keep-alive 组件包裹需要保存的组件。使组件的状态维持不变，在下一次展示时，也不会进行重新初始化组件。

```js
<keep-alive>
    <component />
</keep-alive>
```

对于keep-alive有三个属性：
1. include 字符串或正则表达式，名称匹配的组件**会**被缓存。
2. exclude 字符串或正则表达式，匹配的组件都**不会**被缓存。
3. max 数字，最多可以缓存多少组件实例，超出使用LRU算法进行剔除。

>主要流程：
1. 根据name以及include和exclude判断时候需要缓存，需要就缓存，不需要就返回虚拟节点
2. 获取组件实例 key，有就获取，没有就重新生成
3. 如果缓存对象内存在，则直接从缓存对象中获取组件实例给 vnode ，不存在则添加到缓存对象中。
4. 最大缓存数量，当缓存组件数量超过 max 值时，使用LRU算法剔除


# 实现过程（vue内置源码分析）
对于内置的**keep-alive 的实现**过程，首先，他也是和vue2中我们自己写的组件一样的格式：

```js
// 接收：字符串，正则，数组
const patternTypes: Array<Function> = [String, RegExp, Array] 

export default {
  name: 'keep-alive',
  abstract: true, // 抽象组件，是一个抽象组件：它自身不会渲染一个 DOM 元素，也不会出现在父组件链中。

  props: {
    include: patternTypes, // 匹配的组件，缓存
    exclude: patternTypes, // 匹配的组件，不缓存
    max: [String, Number], // 缓存组件的最大实例数量
  },

  created() {
    /*
    	等阅读完就知道：
    	this.cache是一个对象，用来存放当前已经缓存过的所有组件
    	this.keys是一个数组，相当于一个队列，用来控制那些组件在最近被访问过
    */
    this.cache = Object.create(null) //创建纯净空对象，没有原型链
    this.keys = []
  },

  destroyed() {
    // 销毁缓存cache的组件实例
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted() {

    // 去监控include和exclude的改变，根据最新的include和exclude的内容，来实时削减缓存的组件的内容
      
    this.$watch('include', (val) => {
      pruneCache(this, (name) => matches(val, name))
    })
    this.$watch('exclude', (val) => {
      pruneCache(this, (name) => !matches(val, name))
    })
  },
  
  render(){
      //下面解释
  }
}
```
>对于上面只是keep-live组件的一个框架，主要是定义了存储对象和LRU队列，以及添加监视逻辑，具体的实现逻辑还需要看render()函数。
***
这里详细看**render**函数的实现过程

```js
render () {
    function getFirstComponentChild (children: ?Array<VNode>): ?VNode 
    {
        if (Array.isArray(children)) {
            for (let i = 0; i < children.length; i++) {
                const c = children[i]
                if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
                      return c
                    }
              }
      	}
  	}
    
    //keep-alive组件内部定义了默认插槽，用来接收被包裹的组件
    
    // 获取默认插槽被包裹的元素
    const slot = this.$slots.default 
    
    // 获取第一个子组件
    const vnode: VNode = getFirstComponentChild(slot)
    // 组件参数
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) { // 是否有组件参数
        const name: ?string = getComponentName(componentOptions) // 获取组件名
        const { include, exclude } = this
        
        //这是判断是否缓存，可以看出来，即使在include中，但是也在exclude中的话，也会不走缓存
        if (
          // not included
          (include && (!name || !matches(include, name))) ||
          // excluded
          (exclude && name && matches(exclude, name))
        ) {
              //走这里是不缓存的逻辑
              return vnode
        }

        const { cache, keys } = this

        // 获取这个组件的key
        const key: ?string = vnode.key == null ? 
            //没有key就重新生成
            componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
            //有key就返回key
        : vnode.key

        //如果缓存中有，就直接使用缓存中的
        if (cache[key]) {
            vnode.componentInstance = cache[key].componentInstance // 组件初次渲染的时候componentInstance为undefined
            
            //这里相当于先从队列中移除，然后添加的队首
            remove(keys, key)
            keys.push(key)
        } else {
            //如果没有就加入
            cache[key] = vnode
            keys.push(key)
            
            //如果数量超出了，就移除队尾的
            if (this.max && keys.length > parseInt(this.max)) {
                pruneCacheEntry(cache, keys[0], keys, this._vnode)
            }
        }
            
        // 存在且实例已缓存时，跳过created、mounted等初始化钩子，只执行activated；否则执行完整生命周期。
        vnode.data.keepAlive = true 
    }
    return vnode || (slot && slot[0])
}
```
render()函数是实现了具体的逻辑，首先，从代码中可以看出，keep-alive逻辑只处理keep-alive标签下面第一个组件，并且是通过默认插槽的形式。

ps:插槽的原理，就是当VM实例初始化的时候，会把父组件传递的内容存放在 `vm.$slot`中，这里是默认插槽，即在`vm.$slot.default`中。

我们继续分析，从源码看，keep-alive只处理下面的第一个组件，获取组件名称，去判断是否在include和exclude中，从这里也可以看出，如果组件同时出现在include和exclude中，会以exclude优先。
```js
        if (
          // not included
          (include && (!name || !matches(include, name))) ||
          // excluded
          (exclude && name && matches(exclude, name))
        ) {
              //走这里是不缓存的逻辑
              return vnode
        }
```

如果不需要缓存，就直接返回虚拟节点，如果需要缓存，就先判断之前是否存在，如果存在key，就更新内容和在队列中的位置，如果不存在，就加入cache和队列中，并且，这里需要判断新加入组件，是否超出的最大的数量，如果超出，就找到最近没有使用过的组件进行剔除。

>实现步骤
1. 获取 keep-alive 下第一个子组件的实例对象，通过它去获取这个组件的组件名
2. 根据组件名称匹配原来 include 和 exclude，判断是否需要缓存，不需要就返回虚拟节点
3. 需要缓存就判断是否存在，存在就更新，不存在就加入，超出就剔除
4. 最后将这个组件的 keepAlive 设置为 true

这个4就是关键，这个标识的核心作用是**让 Vue 跳过组件的初始化生命周期、复用已有实例**。保证在整个项目中，catch和key数组是通用的，不然就白白记录了。
