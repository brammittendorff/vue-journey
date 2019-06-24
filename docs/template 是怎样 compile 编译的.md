# template 是怎样 compile 编译的

## compile

`compile` 编译可以分成 `parse`、`optimize` 和 `generate` 三个阶段，最终得到 `render function`。这部分不算 Vue.js 响应式核心，只是用来编译的。

<img src="../images/compile.png" width="500">

这里以一个 template 为例，通过这个示例的变化来看解析的过程。但是解析的过程及结果都是将主要的部分抽离出来了。


