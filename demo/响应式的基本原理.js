
/**
 * 更新视图的回调函数
 *
 * @param {*} val 新的值
 */
function cb(val) {
  console.log('视图更新啦...', val);
}


/**
 * 对象响应化
 *
 * @param {Object} obj 需要绑定的对象
 * @param {String} key 对象的属性
 * @param {*} val 属性的值
 */
function defineReactive(obj, key, val) {
  Object.defineProperty(obj, key, {
    enumerable: true, // 可枚举
    configurable: true, // 可删除可修改
    get: function reactiveGetter() {
      return val; // 实际上这里会触发依赖收集
    },
    set: function reactiveSetter(newVal) {
      if (newVal === val) return;
      cb(newVal);
    }
  })
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
 * 创建Vue实例的类
 *
 * @class Vue
 */
class Vue {
  constructor(options) {
    this._data = options.data;
    observer(this._data);
  }
}

let o = new Vue({
  data: {
    test: 'this is a test'
  }
});
o._data.test = 'hello world';