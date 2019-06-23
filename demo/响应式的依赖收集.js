/**
 * 订阅者Dep, 用来存放Watcher对象
 *
 * @class Dep
 */
class Dep {
  constructor() {
    // 用来存放Watcher对象的数组
    this.subs = [];
  }

  // 在subs中添加一个Watcher对象
  addSub(sub) {
    this.subs.push(sub);
  }

  // 通知所有Watcher对象更新视图
  notify() {
    this.subs.forEach((sub) => {
      sub.update();
    })
  }
}


/**
 * 观察者Watcher
 *
 * @class Watcher
 */
class Watcher {
  constructor() {
    // 在new一个Watcher对象时将该对象赋值给Dep.target, 在get中会用到
    Dep.target = this;
  }

  // 更新视图的方法
  update() {
    console.log('视图更新啦...');
  }
}

/**
 * 对对象的每个属性响应化
 *
 * @param {Object} value 响应化的对象
 * @returns
 */
function observer(value) {
  if (!value || (typeof value !== 'object')) return;

  Object.keys(value).forEach((key) => {
    defineReactive(value, key, value[key]);
  });
}

/**
 * 对象响应化
 *
 * @param {Object} obj 需要绑定的对象
 * @param {String} key 对象的属性
 * @param {*} val 属性的值
 */
function defineReactive(obj, key, val) {
  const dep = new Dep();

  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      // 将Dep.target(即当前的Watcher对象)存放到Dep的subs中
      dep.addSub(Dep.target);
      return val;
    },
    set: function reactiveSetter(newVal) {
      if (newVal === val) return;
      // 在set的时候触发dep的notify来通知所有的Watcher对象更新视图
      dep.notify();
    }
  })
}

/**
 * 创建Vue实例的类
 *
 * @class Vue
 */
class Vue {
  constructor(options) {
    this._data = options.data;
    observer(this._data);
    new Watcher();
    console.log('render~', this._data.test);
  }
}

let o = new Vue({
  data: {
    test: 'this is a test'
  }
});
o._data.test = 'hello world';

Dep.target = null;