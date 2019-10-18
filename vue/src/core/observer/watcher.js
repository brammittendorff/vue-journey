/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  computed: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  dep: Dep;
  deps: Array<Dep>; // 持有的 Dep 实例
  newDeps: Array<Dep>; // 新添加的持有的 Dep 实例
  depIds: SimpleSet; // 持有的 Dep 实例的 id
  newDepIds: SimpleSet; // 新添加的持有的 Dep 实例的 id
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.computed = !!options.computed
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.computed = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.computed // for computed watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    if (this.computed) {
      // 如果是 computed
      this.value = undefined
      this.dep = new Dep()
    } else {
      // 执行 get()
      this.value = this.get()
    }
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // Dep.target 赋值为当前渲染的 watcher，并压栈
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      // 1. 渲染 getter 对应的就是 updateComponent，会执行 _render 方法，
      //    这个方法会生成 VNode，并且会访问 vm 上的数据，所以会触发
      //    数据对象的 getter。
      // 2. user watcher 对应的是 parsePath(expOrFn) 返回的函数，执行 getter
      //    相当于获取值，这时就会触发 get，进行依赖收集
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        // 如果是 deep watcher，递归去访问 value，触发它所有子项的 getter，
        // 进行依赖收集。
        traverse(value)
      }
      // 把 Dep.target 恢复成上一个状态，因为当前的数据依赖手机已经
      // 完成，那么对应的渲染 Dep.target 也需要改变。
      popTarget()
      // 依赖清空
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    // 会做一些判断逻辑，保证同一个数据不被添加多次
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        // 最后执行 dep.addSub(this)，也就是把当前 watcher 订阅到这个
        // 数据持有的 dep 的 subs 中，为后续数据变化是能通知到哪些 subs
        // 做准备。
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    // 遍历 deps，如果不在 newDepIds 里面，则移除对 dep.subs 数组中
    // watcher 的订阅。
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    // 把 newDepIds 和 depIds 交换，newDeps 和 deps 交换，
    // 并把 newDepIds 和 newDeps 清空。
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.computed) {
      // A computed property watcher has two modes: lazy and activated.
      // It initializes as lazy by default, and only becomes activated when
      // it is depended on by at least one subscriber, which is typically
      // another computed property or a component's render function.
      if (this.dep.subs.length === 0) {
        // In lazy mode, we don't want to perform computations until necessary,
        // so we simply mark the watcher as dirty. The actual computation is
        // performed just-in-time in this.evaluate() when the computed property
        // is accessed.
        // length === 0，说明没有人去订阅这个 computed watcher，仅仅把 this.dirty = true，
        // 这样当下次再访问的这个计算属性的时候才会重新计算求值。
        this.dirty = true
      } else {
        // In activated mode, we want to proactively perform the computation
        // but only notify our subscribers when the value has indeed changed.
        this.getAndInvoke(() => {
          // 触发渲染 watcher 重新渲染
          this.dep.notify()
        })
      }
    } else if (this.sync) {
      // 设置了 sync，就可以在当前 Tick 中同步执行 watcher 的回调函数
      this.run()
    } else {
      // 将 watcher 推送到一个队列中，在 nextTick 后才会真正执行 watcher
      // 的回调函数。
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      this.getAndInvoke(this.cb)
    }
  }

  getAndInvoke (cb: Function) {
    // 先通过 this.get() 得到它当前的值。
    // 对于渲染 watcher 而言，这里会执行 getter 方法就会重新渲染。
    const value = this.get()
    if (
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated.
      isObject(value) ||
      this.deep
    ) {
      // 如果满足新旧值不等、新值是对象类型、deep 模式，
      // 就获取新值。
      // set new value
      const oldValue = this.value
      this.value = value
      this.dirty = false
      // 执行回调
      if (this.user) {
        // 如果是用户的 watcher
        try {
          cb.call(this.vm, value, oldValue)
        } catch (e) {
          handleError(e, this.vm, `callback for watcher "${this.expression}"`)
        }
      } else {
        cb.call(this.vm, value, oldValue)
      }
    }
  }

  /**
   * Evaluate and return the value of the watcher.
   * This only gets called for computed property watchers.
   */
  evaluate () {
    if (this.dirty) {
      // 就会执行 value = this.getter.call(vm, vm)，也就是执行了计算
      // 属性定义的 getter 函数。
      this.value = this.get()
      this.dirty = false
    }
    return this.value
  }

  /**
   * Depend on this watcher. Only for computed property watchers.
   */
  depend () {
    if (this.dep && Dep.target) {
      this.dep.depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
