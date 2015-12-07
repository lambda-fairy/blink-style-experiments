// Copyright 2015 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

module.exports = (function() {
  var tagNames = [
    'div',
    'pre',
    'table',
    'tr',
    'td',
    'thead',
    'span',
    'li',
    'ol',
    'ul',
    'a',
    'textarea',
    'input',
    'media',
    'video',
    'option',
    'canvas',
    'hr',
    'track',
    'image',
    'iframe',
    'embed',
    'object',
    'style',
    'template',
  ];
  function Node(id, tagName) {
    this.id = id;
    this.tagName = tagName;
    this.children = [];
    this.size =
        tagName.length * 2 +
        '< id="">\n</>\n'.length +
        id.length;
  }
  Node.prototype.serialize = function() {
    return '<' + this.tagName + ' id="' +
        this.id + '">\n' +
        this.children.map(function(child) {
          return child.serialize();
        }).join('') +
        '</' + this.tagName + '>\n';
  };
  function TextNode(text) {
    this.text = text;
    this.size = text.length +
        '\n'.length;
  }
  TextNode.prototype.serialize = function() {
    return this.text + '\n';
  };
  function nextId(last) {
    var next = last + 1;
    while (/^\d/.test(next.toString(36))) {
      next++;
    }
    return next;
  }
  return function(maxSize) {
    if (!maxSize) {
      maxSize = 50000;
    }
    var id = nextId(0);
    var ids = [];
    var nodes = [new Node('root', 'body')];
    var size = nodes[0].size;
    while (size < maxSize) {
      var node;
      var parent = nodes[Math.floor(Math.random() * nodes.length)];
      if (Math.random() < 0.4) {
        node = new TextNode(
            tagNames[Math.floor(Math.random() * tagNames.length)]);
        parent.children.push(node);
      } else {
        var idString = id.toString(36);
        ids.push(idString);
        id = nextId(id);
        node = new Node(
            idString,
            tagNames[Math.floor(Math.random() * tagNames.length)])
        nodes.push(node);
        parent.children.push(node);
      }
      size += node.size;
    }
    return {
      dom: nodes[0].serialize(),
      ids: ids,
    }
  };
})();
