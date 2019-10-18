module.exports = {
  title: 'vue-journey',
  description: 'Vue.js 源码学习',
  base: '/vue-journey/',
  dest: 'dist',
  head: [
    ['link', {rel: 'icon', href: '/favicon.ico'}]
  ],
  themeConfig: {
    repo: 'niexias/vue-journey',
    editLinks: true,
    docsDir: 'docs',
    editLinkText: '在 GitHub 上编辑此页',
    lastUpdated: '上次更新',
    nav: [
      { text: '个人博客', link: 'https://niexias.github.io/' }
    ],
    sidebarDepth: 2,
    sidebar: [
      {
        title: 'new Vue',
        collapsable: false,
        sidebarDepth: 2,
        children: [
          '/vue/newVue/'
        ]
      },
      {
        title: '组件化',
        collapsable: false,
        sidebarDepth: 2,
        children: [
          '/vue/components/'
        ]
      },
      {
        title: '响应式原理',
        collapsable: false,
        sidebarDepth: 2,
        children: [
          '/vue/reactive/'
        ]
      },
      {
        title: '编译',
        collapsable: false,
        sidebarDepth: 2,
        children: [
          '/vue/compiler/'
        ]
      },
      {
        title: 'API',
        collapsable: false,
        sidebarDepth: 2,
        children: [
          '/vue/API/'
        ]
      },
      {
        title: 'vue-router',
        collapsable: false,
        sidebarDepth: 2,
        children: [
          ['/vue-router/']
        ]
      },
      {
        title: 'vuex',
        collapsable: false,
        sidebarDepth: 2,
        children: [
          ['/vuex/']
        ]
      }
    ]
  },
  plugins: [
    ['@vuepress/back-to-top', true]
  ]
}