# Vue.js 源码学习

借助 [Vue.js 技术揭秘](https://ustbhuangyi.github.io/vue-analysis/)、[learnVue](https://github.com/answershuto/learnVue) 等阅读源码之后，自己也整理了一下，加上自己的理解以及注释等，方便对相关代码理解。如果想系统的学习 Vue.js 源码，请看前面这两个文档，很清晰。看源码之前，先准备一下。

[[toc]]

## 代码结构

这里对应的 Vue.js 版本信息是 `2.5.17-beta.0`。项目结构如下

```
src
|—— compiler   # 编译相关
|—— core       # 核心代码
|—— platforms  # 不同平台的支持
|—— server     # 服务端渲染
|—— sfc        # .vue 文件解析
|—— shared     # 共享方法
```

## 代码构建

我们首先需要知道 Vue.js 的是构建的，看一下项目下的 package.json 文件，Vue.js 源码的构建脚本如下：

```json
{
  "scripts": {
    "build": "node scripts/build.js",
    "build:ssr": "npm run build -- web-runtime-cjs,web-server-renderer",
    "build:weex": "npm run build -- weex",
  }
}
```

当执行 `npm run build` 的时候，就会执行 `node scripts/build.js`，找到 `script/build.js`：

```js
let builds = require('./config').getAllBuilds()

// filter builds via command line arg
if (process.argv[2]) {
  const filters = process.argv[2].split(',')
  builds = builds.filter(b => {
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)
  })
} else {
  // filter out weex builds by default
  builds = builds.filter(b => {
    return b.output.file.indexOf('weex') === -1
  })
}

build(builds)
```

这里会先从 `script/config.js` 中拿到配置文件，然后如果 `process.argv[2]` 存在，就做一个过滤，过滤出目标配置。否则只过滤掉 `weex`，然后全部打包构建。那我们再看一下 `script/config.js` 里面的内容。

```js
const builds = {
  // Runtime only (CommonJS). Used by bundlers e.g. Webpack & Browserify
  'web-runtime-cjs': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.common.js'),
    format: 'cjs',
    banner
  },
  // Runtime+compiler CommonJS build (CommonJS)
  'web-full-cjs': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.common.js'),
    format: 'cjs',
    alias: { he: './entity-decoder' },
    banner
  },
  // Runtime only (ES Modules). Used by bundlers that support ES Modules,
  // e.g. Rollup & Webpack 2
  'web-runtime-esm': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.esm.js'),
    format: 'es',
    banner
  },
  // Runtime+compiler CommonJS build (ES Modules)
  'web-full-esm': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.esm.js'),
    format: 'es',
    alias: { he: './entity-decoder' },
    banner
  },
  // runtime-only build (Browser)
  'web-runtime-dev': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.js'),
    format: 'umd',
    env: 'development',
    banner
  },
  // runtime-only production build (Browser)
  'web-runtime-prod': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.min.js'),
    format: 'umd',
    env: 'production',
    banner
  },
  // ...
}
```

Vue.js 有多种构建配置，包括不同的平台、服务端渲染等。在每个配置里面定义了几个字段：

1. `entry`：表示构建入口 JS 文件地址
2. `dest`：表示构架之后的 JS 文件地址
3. `format`：表示构建的格式。`cjs` 表示构建出来的文件遵循 CommmonJS 规范，`es` 表示构建出来的文件遵循 ES Module 规范，`umd` 表示构建出来的文件遵循 UMD 规范。

以 `web-runtime-cjs` 为例，那么它的 `entry` 就是 `resolve('web/entry-runtime.js)`，这里的 `resolve` 定义是

```js
const aliases = require('./alias')
const resolve = p => {
  const base = p.split('/')[0]
  if (aliases[base]) {
    return path.resolve(aliases[base], p.slice(base.length + 1))
  } else {
    return path.resolve(__dirname, '../', p)
  }
}
```

也就是说，先通过 `/` 分割成数组，然后取第一个元素 `web` 赋给 `base`，然后判断是否已经对应到别名。如果定义了，则需要通过 `path.resolve(aliases[base], p.slice(base.length + 1))` 去获取实际路径，否则直接获取 `path.resolve(__dirname, '../', p)`。

`alias.js` 文件的内容为

```js
const resolve = p => path.resolve(__dirname, '../', p)

module.exports = {
  vue: resolve('src/platforms/web/entry-runtime-with-compiler'),
  compiler: resolve('src/compiler'),
  core: resolve('src/core'),
  shared: resolve('src/shared'),
  web: resolve('src/platforms/web'),
  weex: resolve('src/platforms/weex'),
  server: resolve('src/server'),
  entries: resolve('src/entries'),
  sfc: resolve('src/sfc')
}
```

显然 `web` 对应的真实路径是 `path.resolve(__dirname, '../', 'src/platforms/web')`,这个路径就是 Vue.js 源码的 web 目录。所以 `entry` 最后会找到 web 目录下的 `web-runtime-cjs`。到这里入口文件就找到了。

经过 Rollup 构建之后，最终会在 dist 目录下生成 `vue.runtime.common.js`。


## Runtime Only VS Runtime + Compiler

- Runtime Only

这个是通过 vue-cli 构建项目的时候使用的版本。使用 Runtime Only 版本，那么就需要借助其他工具将 .vue 文件编译成 JavaScript，webpack 里面对应的就是 vue-loader。所以 Runtime Only 版本只包含运行时的 Vue.js 代码，因此代码体积更加轻量。

- Runtime + Compiler

如果没有做预编译，但使用 Vue 的 template 属性有传入一个字符串，这样就意味着需要在客户端进行编译。例如

```js
new Vue({
  template: '<div>{{ id }}</div>'
})
```

这时，template 需要编译成 `render` 函数，只是在客户端进行的，需要带有编译器的版本。

这个编译时需要一定时间的，对性能会有损耗，更推荐的是使用 Runtime-Only 的 Vue.js。

## 入口

为了知道 Vue.js 完整过程，所以分析的是 **Runtime + Compiler** 版本的 Vue.js 源码，配置如下

```js
{
  'web-full-cjs': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.common.js'),
    format: 'cjs',
    alias: { he: './entity-decoder' },
    banner
  },
}
```

入口文件对应到 `src/platforms/web/entry-runtime-with-compiler.js`：

```js {7,98}
/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  if (!options.render) {
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      const { render, staticRenderFns } = compileToFunctions(template, {
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
```

所以，当我们代码执行 `import Vue from 'vue'` 的时候，就是从这个入口执行代码来初始化 Vue.

### Vue.js 入口

Vue 是通过 `import Vue from './runtime/index'` 引入的，先找到这个文件 `src/platforms/web/runtime/index.js` ：

```js {3}
/* @flow */

import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser, isChrome } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// install platform specific utils
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
extend(Vue.options.directives, platformDirectives)
extend(Vue.options.components, platformComponents)

// install platform patch function
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  // $mount 实际上是调用 mountComponent 方法
  return mountComponent(this, el, hydrating)
}

// ...
}

export default Vue
```

同样的，可以看到 `import Vue from 'core/index'`，这里是时关键，后面的是对 Vue 这个对象做一些扩展。根据这个路径，我们找到正在初始化 Vue 的地方，在 `src/core/index.js` 中：

```js {1}
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

// 扩展全局的静态方法，nextTick、set、minxin、use等
// 即 Vue API 文档中的全局 API
initGlobalAPI(Vue)

Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

export default Vue
```

这里关键的是 `import Vue from './instance/index'` 和 `initGlobalAPI(Vue)`，第一部分，在 `src/core/instance/index.js` 中。

### Vue 的定义

```js
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * Vue 是一个用 Function 实现的类，而且只能通过 new Vue 去实例化
 *
 * @param {Object} options 对象 初始化的参数
 */
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
```

终于在这里找到了，Vue 实际上就是一个 Function 实现的类，并且我们只能通过 `new Vue` 去实例化它。

而后面的 `xxxMixin` 的调用，都是 `Vue` 作为参数，在 Vue 的原型链 `**Vue.prototype**` 上扩展方法。另外还会给 `Vue` 这个对象本身扩展全局的静态方法，也就是上面的 `initGlobalAPI(Vue)`。

### initGlobalAPI(Vue)

找到 `src/core/global-api/index.js`：

```js
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    // 只能单个修改配置，不能直接替换 config 对象
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue
  // 把一些内置的组件扩展到 vue.options.components 上
  extend(Vue.options.components, builtInComponents)

  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
```

这里就是在 Vue 上扩展一些全局方法的定义，Vue 官网中关于[全局 API]()https://cn.vuejs.org/v2/api/#%E5%85%A8%E5%B1%80-API 都可以在这里找到。

## 主要过程

Vue 内部实现主要是经过以下流程来完成的

- _init

初始化事件、props、data、computed、watcher 等。

- $mount

进行挂载，这个过程主要会先执行 `render()` 生成 VNode，之后 `update()` 调用 `patch()` 生成对应的 DOM。

而在 `render()` 执行的过程中会获取相应的数据，触发 `getter` 进行依赖的收集；而当后面数据改变之后，会触发 `setter`，这个时候通知相关的 `watcher` 进行更新。


<img :src="$withBase('/assets/vue-process.png')" alt="vue-process">

## 知识补充

- [process.argv](http://nodejs.cn/api/process.html#process_process_argv)