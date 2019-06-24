/**
 * 创建一个VNode节点的类
 *
 * @class VNode
 */
class VNode {
  constructor(tag, data, children, text, elm) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
  }
}


/**
 * 创建一个空节点
 *
 * @returns {Object} 返回创建的空节点
 */
function createEmptyNode() {
  const node = new VNode();
  node.text = '';
  return node;
}


/**
 * 创建一个文本节点
 *
 * @param {*} val 节点的值
 * @returns {Object} 返回一个文本节点
 */
function createTextNode(val) {
  return new VNode(undefined, undefined, undefined, String(val));
}


/**
 * 克隆一个节点
 *
 * @param {*} node 被克隆的节点
 * @returns {Object} 返回克隆的节点
 */
function cloneVNode(node) {
  const cloneVnode = new VNode(
    node.tag,
    node.data,
    node.children,
    node.text,
    node.elm
  );
  return cloneVnode;
}