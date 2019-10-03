# Vuex 状态管理的工作原理

## 为什么要使用 Vuex

当我们使用 Vue 来开发一个单页面应用时，经常会遇到一些组件简共享的数据或状态，或是需要通过 `props` 深层传递的一些数据数据。在应用规模较小的时候，我们会使用 `props`、事件等常用的父子组件间的通信方式，或者是通过 eventBus 来进行任意两个组件的通信。但是当应用组件复杂之后，问题就出现了，这样的通信方式会导致数据流异常混乱，代码也不好维护。

这个时候就需要 [Vuex](https://vuex.vuejs.org/zh/) 了。

> Vuex 是一个专门用来为 Vue.js 应用程序开发的**状态管理器**。它采用集中式存储应用的所有组件的状态，并以相应的规则保证状态以一种可预测的方式发生变化。

## 原理

通过 Vuex 的使用，我们看它是怎么实现的。

Vue.js 提供了一个 `Vue.use` 方法类安装插件，内部会调用插件提供的 `install` 方法。

```js
Vue.use(Vuex);
```

也就是说我们的插件需要提供一个 `install` 方法

```js
let Vue

export default install (_Vue) {
  Vue.mixin({ beforeCreate: vuexInit });
  Vue = _Vue;
}
```

我们知道在使用 Vuex 的时候，需要将 `store` 传入到 Vue 实例中去。

```js
new Vue({
  el: '#app',
  store
});
```

在 `install` 方法里面，通过 `Vue.mixin` 在每个 Vue 的实例中混合进了 `{ beforeCreate: vuexInit }`，使得每个实例在创建之前都执行了 `vuexInit` 方法。虽然我们只在根节点传入了 `store`，但是通过这个方法，我们可以在每个 Vue 的实例中都能拿到 `store`。

```js
function vuexInit() {
  const options = this.$options;
  if (options.store) { // 说明是根节点
    this.$store = options.store;
  } else {
    this.$store = options.parent.$store;
  }
}
```

如果是根节点（`$options` 中存在 `store` 说明是根节点），则直接将 `options.store` 赋值给 `this.$store`。否则说明不是根节点，从父节点的 `$store` 中获取。

通过这步操作，我们已经可以在任意一个 vm 中通过 `this.$store` 来访问 `Store` 的实例了。

### 响应化

我们需要在 `Store` 的构造函数中对 `state` 进行响应化。

```js
constructor() {
  this._vm = new Vue ({
    data: {
      $$state: this.state
    }
  })
}
```

通过这里，`state` 会将需要的依赖收集在 `Dep` 中，在被修改的时候更新对应的视图。

### commit

我们知道 `commit` 是用来触发 `mutation` 的。

```js
commit (type, payload, _options) {
  const entry = this._mutations[type];
  entry.forEach(function commitIterator(handler) {
    handler(payload);
  })
}
```

从 `_mutation` 中取出对应的 `mutation`，循环执行其中的每个 `mutation`。

### dispatch

`dispatch` 同样道理，用于触发 action，可以包含异步状态。

```js
dispatch (type, payload) {
    const entry = this._actions[type];

    return entry.length > 1
    ? Promise.all(entry.map(handler => handler(payload)))
    : entry[0](payload);
}
```

同样的，取出 `_actions` 中的所有对应 `action`，将其执行，如果有多个则用 `Promise.all` 进行包装。

Vuex 的核心在于怎么和 Vue 本身相结合，如何利用 Vue 的响应化来实现核心的 Store 的响应化。

## TODO

- [ ] 这里为什么 `vuexInit` 可以用父节点获取？Vue 父子组件的渲染顺序，也就是生命周期执行的顺序是什么样的？

