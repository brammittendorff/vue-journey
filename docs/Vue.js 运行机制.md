# Vue 内部流程

<img src="../images/new Vue().png">

## new Vue()

`new Vue()` 之后，调用 `_init` 函数进行初始化。它将初始化

- 生命周期
- 事件
- props
- methods
- data
- computed
- watch
- ...

最重要的是，这个时候通过 `Object.defineProperty` 设置 `getter` 和 `setter` 函数，用来实现**依赖收集**和**响应式**。

## $mount

初始化之后调用 `$mount` 挂载组件。

## compile()

如果是运行时编译，也就是使用 `template` 的而不是 `render function` 时，就需要进行编译。compile 编译可以分成 `parse`、`optimize` 和 `generate` 三个阶段，最终得到 `render function`。

1. parse

`parse` 会用正则等方式解析 `template` 模板中的指令、class、style 等数据，形成 **AST**。

2. optimize

`optimize` 的主要作用是标记 **static 静态节点**，主要是为了优化。后面当 `update` 更新界面时，会有一个 `patch` 的过程，`diff` 算法会直接跳过静态节点，从而减少比较的过程，优化 `patch` 的性能。

3. generate

`generate` 是将 AST 转化成 `render function` 字符串的过程，得到结果是 render 的字符串以及 staticRenderFns 字符串。

在经历过 `parse`、`optimize` 和 `generate` 三个阶段之后，组件中就会存在渲染 VNode 所需的 `render function` 了。

## 响应式

当 `render function` 被渲染的时候，因为会读取所需对象的值，这个时候就会触发 `getter` 函数进行 **依赖收集**。**依赖收集**的目的是将观察者 Watcher 对象放到当前闭包中的订阅者 Dep 的subs 中。

<img src="../images/watcher.png" width="400">

在修改对象的值的时候，会触发对应的 `setter`，`setter` 通知之前**依赖收集**得到的 Dep 中的每一个 Watcher，告诉它们自己的值改变了，需要重新渲染视图。这时候这些 Watcher 就会开始调用 `update` 来更新视图，当然这中间还有一个 `patch` 的过程以及使用队列来异步更新的策略。

## Virtual DOM

`render function` 会被转化为 VNode 节点。Virtual DOM 其实就是一棵以 JavaScript 对象（VNode 节点）作为基础的树。用对象属性描述节点，**实际上**它只是一层对真实 DOM 的抽象。最终可以通过一系列操作将这棵树映射到真实环境上。

由于 Virtual DOM 是以 JavaScript 对象为基础而不依赖真实平台环境。所以使他具有跨平台的能力，比如说浏览器平台、Node等。

ex：

```js
{
  tag: 'div',
  children: [
    {
      tag: 'a',
      text: 'click me'
    }
  ]
  ...
}

```

渲染后可以得到

```html
<div>
  <a>click me</a>
</div>
```

这只是一个简单的例子，实际上还有很多属性来标志节点，比如 `isStatic` （是否为静态节点）、`isComment` （代表是否为注释节点）等。

## 更新视图

前面我们说到，在修改一个对象的值的时候，会通过 `setter -> Watcher -> update` 的流程来修改对应视图，那么最终是如何更新视图的呢？

当数据变化之后，执行 `render function` 就可以得到一个新的 VNode 节点，我们如果需要得到新的视图，最简单粗暴的方法就是直接解析这个新的 VNode 节点，然后用 `innerHTML` 直接全部渲染到真实 DOM 中。但是其实我们只对其中的一小块内容进行了修改，这样做似乎有些**浪费**。

那么我们为什么不能只修改那些**改变了的地方**呢？这个时候就要介绍我们的 `patch` 了。我们会将新的 VNode 与旧的 VNode 一起传入 `patch` 进行比较，经过 diff 算法得出它们的的**差异**。最后我们只需要将这些**差异**的对应的 DOM 进行修改即可。