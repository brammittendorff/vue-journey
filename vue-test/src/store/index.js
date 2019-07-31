import Vue from 'vue'
// import Vuex from 'vuex'
import Vuex from '../vuex'

// use会默认调用install方法
// 通过插件的安装Vuex，也就是Vuex里面有install方法
Vue.use(Vuex)

// new关键字，说明vuex还需要有一个Store的构造函数
export default new Vuex.Store({
  state: {
    age: 10,
    todos: [
      { id: 1, text: 'vue', done: true },
      { id: 2, text: 'react', done: false }
    ]
  },
  getters: {
    doneTodos: state => {
      return state.todos.filter(todo => todo.done)
    }
  },
  mutations: {
    syncAdd(state, payload) {
      state.age += payload
    },
    syncMinus(state, payload) {
      state.age -= payload
    }
  },
  actions: {
    asyncMinus({commit}, payload) {
      setTimeout(() => {
        commit('syncMinus', payload)
      }, 1000)
    }
  },
  // 分多个模块
  modules: {
    a: {
      state: {
        x: 1
      },
      getters: {
        getX(state) {
          return state.x + 'a'
        }
      },
      mutations: {
        syncAdd () {
          // eslint-disable-next-line
          console.log('a-module')
        }
      },
      modules: {
        c: {
          state: {
            z: 1
          }
        }
      }
    },
    b: {
      state: {
        y: 1
      }
    }
  }
})
