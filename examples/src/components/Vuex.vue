<template>
  <div id="app">
    <span>
      state: {{this.$store.state.age}}
    </span>
    <br>
    <p>todo: {{ this.$store.getters.doneTodos }}</p>
    <button @click="handleAdd">点击按钮增加10</button>
    <button @click="handleMinus">点击按钮异步减少10</button>
    <P>{{this.$store.getters.getX}}</P>
  </div>
</template>

<script>

export default {
  name: 'Vuex',
  mounted() {
    console.log(this.$store.state)
    setTimeout(() => {
      // 但是这样视图是不会更新的
      // 需要给state new Vue()，创建一个vue实例实现数据监听
      this.$store.state.age = 100;
      this.$store.state.todos = [{done: true, id: 3, text: 'change'}]
    }, 3000)
  },
  methods: {
    handleAdd() {
      this.$store.commit('syncAdd', 10);
    },
    handleMinus() {
      this.$store.dispatch('asyncMinus', 10);
    }
  }
}
</script>

<style>
</style>
