import Vue from 'vue'
import App from './App.vue'
import store from './store'

Vue.config.productionTip = false

new Vue({
  store, // 会在当前的每个vue实例中都增加一个this.$store
  render: h => h(App),
}).$mount('#app')
