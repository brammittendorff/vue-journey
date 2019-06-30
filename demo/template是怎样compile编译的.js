const singleAttrIdentifier = /([^\s"'<>/=])/;
const singleAttrAssign = /(?:=)/;
const singleAttrValues = [
  /"([^"]*)"+/.source,
  /'([^']*)'+/.source,
  /([^\s"'=<>`]+)/.source
];
const attribute = new RegExp(
  '^\\s*' + singleAttrIdentifier.source +
  '(?:\\s*(' + singleAttrAssign.source + ')' +
  '\\s*(?:' + singleAttrValues.join('|') + '))?'
);

const ncname = '[a-zA-Z_][\\w\\-\\.]*';
const qnameCapture = '((?:' + ncname + '\\:)?' + ncname + ')';

const startTagOpen = new RegExp('^<' + qnameCapture);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp('^<\\/' + qnameCapture + '[^>]*>');

const defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g;
const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/;

const stack = [];
let currentParent, root;

let index = 0;

function advance(n) {
  index += n;
  html = html.substring(n);
}

function makeAttrsMap(attrs) {
  const map = {};
  for (let i = 0, l = attrs.length; i < l; i++) {
    map[attrs[i]].name = attrs[i].value;
  }
  return map;
}

function parseStartTag() {
  const start = html.match(startTagOpen);
  if (start) {
    const match = {
      tagName = start[1],
      attrs: [],
      start: index
    };
    advance(start[0].length);

    let end, attr;
    while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
      advance(attr[0].length);
      match.attrs.push({
        name: attr[1],
        value: attr[3]
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

function parseEndTag(tagName) {
  let pos;
  for (pos = stack.length - 1; pos >= 0; pos --) {
    if (stack[pos].lowerCasedTag === tagName.toLowerCase()) {
      break;
    }
  }

  if (pos >= 0) {
    if (pos > 0) {
      currentParent = stack[pos - 1];
    } else {
      currentParent = null;
    }
    stack.length = pos;
  }
}