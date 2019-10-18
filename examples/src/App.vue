<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png">
    <vuex></vuex>
  </div>
</template>

<script>
import Vuex from './components/Vuex.vue'

export default {
  name: 'app',
  components: {
    Vuex
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
