let Vue; // 保留Vue的构造函数

const forEach = (obj, callback) => {
  Object.keys(obj).forEach(key => {
    callback(key, obj[key])
  })
}

// eslint-disable-next-line
class Store1 {
  // 会将所有的参数传递进来
  constructor(options) {
    // 创建一个vue实例，实现数据响应化
    this._vm = new Vue({
      data: {
        state: options.state // 把对象变成可以监控的对象
      }
    })
    let getters = options.getters
    this.getters = {}
    // 把getters属性定义到this.getters中
    // 根据状态的变化，重新执行函数
    // Object.keys(getters).forEach(getterName => {
    //   // 不能通过下面这种方式，只存了初始状态的值不会更新
    //   // this.getters[getterName] = getters[getterName](this.state);
    //   // 通过get，每次获取的时候重新计算求值
    //   Object.defineProperty(this.getters, getterName, {
    //     get: () => {
    //       return getters[getterName](this.state)
    //     }
    //   })
    // })
    // 用forEach来替换
    forEach(getters, (getterName, fn) => {
      Object.defineProperty(this.getters, getterName, {
        get: () => {
          return fn(this.state);
        }
      })
    })
    let mutations = options.mutations || {}
    this.mutations = {};
    // Object.keys(mutations).forEach(mutationName => {
    //   // 先把用户传递过来的mutation放到我们的store实例上
    //   this.mutations[mutationName] = (payload) => {
    //     mutations[mutationName](this.state, payload)
    //   }
    // })
    // 用forEach替换
    forEach(mutations, (mutationName, fn) => {
      this.mutations[mutationName] = (payload) => {
        fn.call(this, this.state, payload)
      }
    })
    let actions = options.actions || {}
    this.actions = {}
    forEach(actions, (actionName, fn) => {
      this.actions[actionName] = (payload) => {
        fn.call(this, this, payload)
      }
    })
  }
  commit(type, payload) {
    // 找到对应的mutation执行
    this.mutations[type](payload);
  }
  dispatch(type, payload) {
    this.actions[type](payload)
  }

  get state() {
    return this._vm.state
  }
}

class ModuleCollection {
  constructor(options) {
    this.register([], options)
  }
  register(path, rootModule) {
    let newModule = {
      _raw: rootModule,
      _children: {},
      state: rootModule.state
    }
    if (path.length === 0) {
      this.root = newModule
    } else {
      let parent = path.slice(0, -1).reduce((root, current) => {
        return root._children[current]
      }, this.root)
      parent._children[path[path.length - 1]] = newModule
    }
    if (rootModule.modules) {
      forEach(rootModule.modules, (moduleName, module) => {
        this.register(path.concat(moduleName), module)
      })
    }
  }
}

// 递归树,讲解过挂载到 getters mutations actions
const installModule = (store, state, path, rootModule) => {
  // 把子模块的状态放到父模块上
  if (path.length > 0) {
    // {age: 10, a: {x:1, c: {z: 1}}, b: {y: 1}}
    let parent = path.slice(0, -1).reduce((state, current) => {
      return state[current]
    }, state)
    Vue.set(parent, path[path.length - 1], rootModule.state)
  }

  // 先处理根模块的 getters 属性
  let getters = rootModule._raw.getters
  if (getters) {
    forEach(getters, (getterName, fn) => {
      Object.defineProperty(store.getters, getterName, {
        get: () => {
          return fn(rootModule.state)
        }
      })
    })
  }

  let mutations = rootModule._raw.mutations
  if (mutations) {
    forEach(mutations, (mutationName, fn) => {
      let arr = store.mutations[mutationName] ||
        (store.mutations[mutationName] = [])
      arr.push((payload) => {
        fn(rootModule.state, payload)
      })
    })
  }

  let actions = rootModule._raw.actions
  if (actions) {
    forEach(actions, (mutationName, fn) => {
      let arr = store.actions[mutationName] ||
        (store.actions[mutationName] = [])
      arr.push((payload) => {
        fn(store, payload)
      })
    })
  }

  forEach(rootModule._children, (moduleName, module) => {
    installModule(store, state, path.concat(moduleName), module)
  })
}

// editor2
class Store {
  // 会将所有的参数传递进来
  constructor(options) {
    // 创建一个vue实例，实现数据响应化
    this._vm = new Vue({
      data: {
        state: options.state // 把对象变成可以监控的对象
      }
    })
    this.getters = {}
    this.mutations = {};
    this.actions = {}
    // 先格式化用户传的数据
    // 收集模块
    this.modules = new ModuleCollection(options)
    // eslint-disable-next-line
    console.log(this.modules)
    // this.$store 应该包含getters, mutations
    installModule(this, this.state, [], this.modules.root)
    // eslint-disable-next-line
    console.log(this)
    // let root = {
    //   _raw: rootModule,
    //   state: {age: 10},
    //   _children: {
    //     a: {
    //       _raw: aModule,
    //       state: {x: 1},
    //       _children: {},
    //     },
    //     b: {
    //       _raw: bModule,
    //       state: {y: 1},
    //       _children: {}
    //     }
    //   }
    // }
  }
  commit = (type, payload) => {
    // 找到对应的mutation执行
    this.mutations[type].forEach(fn => fn(payload));
  }
  dispatch = (type, payload) => {
    this.actions[type].forEach(fn => fn(payload));
  }

  get state() {
    return this._vm.state
  }
}

function install(_Vue) {
  // console.log('install')
  Vue = _Vue;
  // 在app的注入一个store，但是每个组件都可以获取store
  // 所以这里需要给每个组件都注册一个this.$store属性，这要怎么做的？
  Vue.mixin({
    // Vue渲染组件的时候，先渲染父组件再渲染子组件，深度优先
    beforeCreate () {
      // console.log(this.$options.name)
      // 先判断是父组件还是子组件
      // 如果是子组件，应该吧父组件的store赋给子组件
      if (this.$options && this.$options.store) {
        this.$store = this.$options.store
      } else {
        this.$store = this.$parent && this.$parent.$store
      }
    }
  })
}

export default {
  install,
  Store
}

// TODO
// 1. namespace