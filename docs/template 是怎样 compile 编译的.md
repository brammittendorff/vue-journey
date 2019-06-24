# template 是怎样 compile 编译的

## compile

`compile` 编译可以分成 `parse`、`optimize` 和 `generate` 三个阶段，最终得到 `render function`。这部分不算 Vue.js 响应式核心，只是用来编译的。

<img src="../images/compile.png" width="500">

这里以一个 template 为例，通过这个示例的变化来看解析的过程。但是解析的过程及结果都是将主要的部分抽离出来了。

```
<div :class="c" class="demo" v-if="isShow">
  <span v-for="item in sz">{{ item }}</span>
</div>

var html = '<div :class="c" class="demo" v-if="isShow"><span v-for="item in sz">{{ item }}</span></div>
```

## parse

首先是 `parse`，`parse` 会用正则等方式将 template 模板中进行字符串解析，得到指令、class、style等数据，形成 [AST](https://zh.wikipedia.org/wiki/%E6%8A%BD%E8%B1%A1%E8%AA%9E%E6%B3%95%E6%A8%B9)。

> 在计算机科学中，抽象语法树（Abstract Syntax Tree，AST），或简称语法树（Syntax tree），是源代码语法结构的一种抽象表示。它以树状的形式表现编程语言的语法结构，树上的每个节点都表示源代码中的一种结构。之所以说语法是“抽象”的，是因为这里的语法并不会表示出真实语法中出现的每个细节。比如，嵌套括号被隐含在树的结构中，并没有以节点的形式呈现；而类似于 if-condition-then 这样的条件跳转语句，可以使用带有两个分支的节点来表示。
>
> 和抽象语法树相对的是具体语法树（通常称作分析树）。一般的，在源代码的翻译和编译过程中，语法分析器创建出分析树，然后从分析树生成AST。一旦AST被创建出来，在后续的处理过程中，比如语义分析阶段，会添加一些信息。

这个过程比较复杂，会涉及很多的正则进行字符串解析，看一下得到的 AST 的样子。

```
{
  // 标签属性的map，记录了标签上的属性
  'attrsMap': {
    ':class': 'c',
    'class': 'demo',
    'v-if': 'isShow'
  },
  // 解析得到的:class
  'classBinding': 'c',
  // 标签属性v-if
  'if': 'isShow',
  // v-if的条件
  'ifConditions': [
    {
      'exp': 'isShow'
    }
  ]
  // 标签属性class
  'staticClass': 'demo',
  // 标签的tag
  'tag': 'div',
  // 子标签数组
  'children': [
    {
      'attrsMap': {
        'v-for': 'item in sz'
      },
      // for循环的参数
      'alias': 'item',
      // for循环的对象
      'for': 'sz',
      // for循环已经被处理的标记位
      'forProcessed': true,
      // 标签的tag
      'tag': 'span',
      'children': [
        {
          // 表达式，_s是一个转字符串的函数
          'expression': '_s(item)',
          'text': '{{item}}'
        }
      ]
    }
  ]
}
```

最终得到的 AST 通过一些特定的属性，能够比较清晰地描述出标签的属性以及依赖关系。接下来，我们看看怎么使用正则将 template 编译成我们需要的 AST 的。

### 正则

这里首先定义一些我们需要的正则

```
const ncname = '[a-zA-Z_][\\w\\-\\.]*';
const singleAttrIdentifier = /([^\s"'<>/=]+)/
const singleAttrAssign = /(?:=)/
const singleAttrValues = [
  /"([^"]*)"+/.source,
  /'([^']*)'+/.source,
  /([^\s"'=<>`]+)/.source
]
const attribute = new RegExp(
  '^\\s*' + singleAttrIdentifier.source +
  '(?:\\s*(' + singleAttrAssign.source + ')' +
  '\\s*(?:' + singleAttrValues.join('|') + '))?'
)

const qnameCapture = '((?:' + ncname + '\\:)?' + ncname + ')'
const startTagOpen = new RegExp('^<' + qnameCapture)
const startTagClose = /^\s*(\/?)>/

const endTag = new RegExp('^<\\/' + qnameCapture + '[^>]*>')

const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g

const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/
```