# 实现 Virtual DOM

## 什么是 VNode

以下面这段 HTML 为例：

```
<div>
  <h1>My title</h1>
  some text content
  <!-- TODO: 添加标签行 -->
</div>
```

当浏览器读到这些代码时，它会建立一个[**节点树**](https://javascript.info/dom-nodes)来追踪，如同你画一张家谱树来追踪家庭成员一样。

HTML 的 DOM 节点树如下图表示：

<img src="../images/dom-tree.png" width="500">

每个元素都是一个节点。每片文字也是一个节点。甚至注释也都是节点。一个节点就是页面的一部分。就像是家谱树每个节点都有孩子节点（也就是每个部分可以包含其它的一些部分）。


我们知道，`render function` 会转化成 VNode节点。Virtual DOM 其实是一棵以 JavaScript 对象（VNode 节点）作为基础的树，用对象属性来描述节点，实际上它只是一层对真实 DOM 的抽象。最终可以通过一系列操作时这棵树映射到真实的环境上。由于 Virtual DOM 是以 JavaScript 对象为基础而不依赖真实的平台环境，所以使它具有了跨平台的能力，比如跨浏览器平台、Weex、Node等。

Vue 通过建立一个**虚拟 DOM** 对真实 DOM 发生变化保持追踪，看一下下面这行代码

```
return createElement('h1', this.blogTitle);
```

`createElement` 到底是怎么回事？其实不是一个*实际的* DOM 元素。它更准确的名字可能是 `createNodeDescription`，因为它所包含的信息会告诉 Vue 页面上渲染什么样的节点，及其子节点。我们把这样的节点描述为“虚拟节点（Virtual DOM）”，也就是 VNode。

**虚拟 DOM** 是我们对 Vue 组件树建立起来的整个 VNode 树的称呼。

## 实现一个 VNode

VNode 归根到底就是一个 JavaScript 对象，只要这个类的一些属性可以正确直观描述清楚当前节点的信息即可。我们来实现一个简单的 `VNode` 类，加入一些基本属性，这里先不考虑复杂的情况。

```
class VNode {
  constructor(tag, data, children, text, elm) {
    // 当前节点的标签名
    this.tag = tag;
    // 当前节点的一些数据信息，比如 props、attrs 等数据
    this.data = data;
    // 当前节点的子节点，是一个数组
    this.children = children;
    // 当前节点的文本
    this.text = text;
    // 当前虚拟节点对应的真实 dom 节点
    this.elm = elm;
  }
}
```

比如我们目前有这么一个 Vue 组件

```
<template>
  <span class="demo" v-show="isShow">
    This is a span
  </span>
</template>
```

用 JavaScript 代码形式就是这样

```
function render() {
  return new VNode(
    'span',
    {
      // 指令集合数组
      directives: [
        {
          rawName: 'v-show',
          expression: 'isShow',
          name: 'show',
          value: true
        }
      ],
      // 静态class
      staticClass: 'demo'
    },
    [
      new VNode(undefined, undefined, undefined, 'this is a span')
    ]
  )
}
```

看看转成的 VNode 以后的情况

```
{
  tag: 'span',
  data: {
    // 指令集合数组
    directives: [
      {
        rawName: 'v-show',
        expression: 'isShow',
        name: 'show',
        value: true
      }
    ],
    // 静态class
    staticClass: 'demo'
  },
  text: undefined,
  children: [
    // 子节点是一个文本节点
    {
      tag: undefined,
      data: undefined,
      text: 'this is a span',
      children: undefined
    }
  ]
}
```

然后将 VNode 进一步封装，就可以实现常用的产生 VNode 的方法。

- 创建一个空节点

```
function createEmptyVNode() {
  const node = new VNode();
  node.text = '';
  return node;
}
```

- 创建一个文本节点
  
```
function createTextNode(val) {
  return new VNode(undefined, undefined, undefined, String(val));
}
```

- 克隆一个 VNode 节点

```
function cloneVNode(node) {
  const cloneVNode = new VNode(
    node.tag,
    node.data,
    node.children,
    node.text,
    node.elm
  );
  return cloneVNode;
}
```

总的来说，VNode 就是一个 JavaScript 对象，用 JavaScript 对象的属性来描述当前节点的一些状态，用 VNode 节点的形式来模拟一棵 Virtual DOM 树。
