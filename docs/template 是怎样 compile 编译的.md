# template 是怎样 compile 编译的

## compile

`compile` 编译可以分成 `parse`、`optimize` 和 `generate` 三个阶段，最终得到 `render function`。这部分不算 Vue.js 响应式核心，只是用来编译的。

<img src="../images/compile.png" width="500">

这里以一个 template 为例，通过这个示例的变化来看解析的过程。但是解析的过程及结果都是将主要的部分抽离出来了。

```
<div :class="c" class="demo" v-if="isShow">
  <span v-for="item in sz">{{ item }}</span>
</div>

var html = '<div :class="c" class="demo" v-if="isShow"><span v-for="item in sz">{{ item }}</span></div>'
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
const singleAttrIdentifier = /([^\s"'<>/=]+)/;
const singleAttrAssign = /(?:=)/;
const singleAttrValues = [
  /"([^"]*)"+/.source,
  /'([^']*)'+/.source,
  /([^\s"'=<>`]+)/.source
];

// /^\s*([^\s"'<>\/=]+)(?:\s*((?:=))\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const attribute = new RegExp(
  '^\\s*' + singleAttrIdentifier.source +
  '(?:\\s*(' + singleAttrAssign.source + ')' +
  '\\s*(?:' + singleAttrValues.join('|') + '))?'
); 

const qnameCapture = '((?:' + ncname + '\\:)?' + ncname + ')';

// /^<((?:[a-zA-Z_][\w\-\.]*\:)?[a-zA-Z_][\w\-\.]*)/
const startTagOpen = new RegExp('^<' + qnameCapture); 

// /^\s*(\/?)>/
const startTagClose = /^\s*(\/?)>/;

// /^<\/((?:[a-zA-Z_][\w\-\.]*\:)?[a-zA-Z_][\w\-\.]*)[^>]*
const endTag = new RegExp('^<\\/' + qnameCapture + '[^>]*>'); 

// /\{\{((?:.|\n)+?)\}\}/g
const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g;

// /(.*?)\s+(?:in|of)\s+(.*)/
const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/;
```

### advance

解析 template 采用循环进行字符串匹配的方式，所以没匹配解析完一段，我们需要将已经匹配过的去掉，头部的指针指向接下来需要匹配的部分。

```
function advance(n) {
  index += n;
  html = html.substring(n);
}
```

ex：

当我们把第一个 div 的头标签全部匹配完毕以后，我们需要将这部分除去，也就是向右移动 43 个字符。

<img src="../images/parse-start.png">

调用 `advance` 函数 `advance(43)`，向右移动

<img src="../images/parse-doing.png">

### parseHTML

首先定义一个 `parseHTML` 函数，用于循环解析 template 字符串。

```
function parseHTML() {
  while (html) {
    let textEnd = html.indexOf('<');
    if (textEnd === 0) {
      if (html.match(endTag)) {
        // ... process end tag
        continue;
      }
      if (html.match(startTagOpen)) {
        // ... process start tag
        continue;
      }
    } else {
      // ... process text
      continue;
    }
  } 
}
```

`parseHTML` 会用 `while` 来循环解析 template，当匹配到**标签头、标签尾以及文本**的时候进行不同的处理。直到整个 template 被解析完毕。

- [ ] 为了生成 AST，解析的时候需要做哪些处理？
  
### parseStartTag

`parseStartTag` 用来解析起始标签（`"<div :class="c" class="demo" v-if="isShow">"` 部分的内容）。

```
function parseStartTag() {
  const start = html.match(startTagOpen);
  // 匹配到起始标签
  if (start) {
    const match = {
      tagName: start[1], // 标签名称
      attrs: [], // 存放标签内的属性
      start: index
    };
    advance(start[0].length);

    let end, attr;
    // 解析内部所有的属性
    while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
      advance(attr[0].length);
      match.attr.push({
        name: attr[1],
        value: attr[3],
      })
    }
    if (end) {
      match.unarySlash = end[1];
      advance(end[0].length);
      match.end = index;
      return match;
    }
  }
} 
```

### stack

此外，我们需要维护一个 **stack** 栈来保存已经解析好的标签头，这样我们可以在解析尾部标签的时候得到所属的层级关系以及父标签。同时这里定义一个 `currentParent` 变量来存放当前标签的父标签节点的引用，`root` 变量用来指向根标签节点。

```
const stack = [];
let currentParent, root;
```

知道这个以后，这里优化一下 `parseHTML`，在 `startTagOpen` 的 `if` 逻辑中加上新的处理。

```
if (html.match(startTagOpen)) {
  const startTagMatch = parseStartTag();
  // 封装成element，这就是最终形成的AST的节点
  const element = {
    type: 1,
    tag: startTagMatch.tagName,
    lowerCasedTag: startTagMatch.tagName.toLowerCase(),
    attrsList: startTagMatch.attrs,
    attrsMap: makeAttrsMap(startTagMatch.attrs),
    parent: currentParent,
    children: []
  }

  // root指向根节点的引用
  if (!root) {
    root = element;
  }

  // 当前节点放入父节点currentParent的children中
  if (currentParent) {
    currentParent.children.push(element);
  }

  // 将当前节点element压入stack中，并将currentParent指向当前节点
  stack.push(element);
  currentParent = element;
  continue;
}

function makeAttrsMap(attrs) {
  const map = {};
  for (let i = 0; i < attrs.length; i++) {
    map[attrs[i].name] = attrs[i].value;
  }
  return map;
}
```

