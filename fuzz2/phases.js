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

var erlnmyr = require('erlenmeyer');
var seedrandom = require('seedrandom');

function typeVar(s) {
  return function(v) {
    if (!v[s]) {
      v[s] = erlnmyr.types.newTypeVar();
    }
    return v[s];
  };
}

function makeRandom(seed) {
  var seed = seed || process.hrtime()[1];
  // The Alea algorithm is fastest
  var random = seedrandom.alea(seed);
  random.choice = function(items) {
    if (items.length === 0) return undefined;
    return items[this.randint(0, items.length - 1)];
  };
  random.randint = function(min, max) {
    return min + Math.abs(this.int32()) % (max - min + 1);
  };
  random.seed = seed;
  return random;
}

module.exports.makeGenerateDOM2Args = erlnmyr.phase(
  {
    input: erlnmyr.types.JSON,
    output: erlnmyr.types.JSON,
    arity: '1:N',
  },
  function(args) {
    var random = makeRandom(args.seed);
    var i = 0;
    while (i < args.samples) {
      var branchiness = random.randint(args.minBranchiness, args.maxBranchiness);
      var depthicity = random.randint(args.minDepthicity, args.maxDepthicity);
      var predictedNodeCount = Math.floor(
        (Math.pow(branchiness, depthicity + 1) - 1) / (branchiness - 1));
      if (predictedNodeCount > args.maxNodeCount) continue;
      this.put({
        branchiness: branchiness,
        depthicity: depthicity,
        seed: random.randint(0, Math.pow(2, 32) - 1),
      });
      ++i;
    }
  },
  {});

module.exports.generateDOM2 = erlnmyr.phase(
  {
    input: erlnmyr.types.JSON,
    output: erlnmyr.types.string,
    arity: '1:N',
  },
  function(args) {
    var random = makeRandom(args.seed);
    var generator = new DOMGenerator(random, args.branchiness, args.depthicity);
    var result = generator.generateNode();
    this.tags.tag('branchiness', args.branchiness);
    this.tags.tag('depthicity', args.depthicity);
    this.tags.tag('nodeCount', result.countNodes());
    this.tags.tag('seed', random.seed);
    this.put(result.render(' '));
  },
  {seed: null});

module.exports.extractTags = erlnmyr.phase(
  {
    input: typeVar('a'),
    output: typeVar('a'),
    arity: '1:1',
  },
  function(data, tags) {
    var input = tags.read(this.options.input);
    var fragments = input.split('-');
    for (var i = 0; i < this.options.tags.length; ++i) {
      tags.tag(this.options.tags[i], fragments[i]);
    }
    return data;
  },
  {
    input: 'filename',
    tags: [],
  });

////////////////////////////////////////////////////////////////////////////////////////////////////

var phrasingContent = [
  'a',
  'b',
  'br',
  'button',
  'canvas',
  'hr',
  'i',
  'iframe',
  'img',
  'span',
  'sub',
  'sup',
  'textarea',
];

var flowContent = [
  'div',
  'p',
  'pre',
  'table',
  'ol',
  'ul',
].concat(phrasingContent);

function ElementType(contentModel, attributes) {
  this.contentModel = Array.isArray(contentModel) ? new ContentModel.Elements(contentModel) : contentModel;
  this.attributes = new Map(attributes);
}

var ContentModel = {}

// Self-closing element, e.g. <br>
ContentModel.VOID = 'void';

// Should only contain text, e.g. <button>
ContentModel.TEXT = 'text';

// Can contain the listed elements
ContentModel.Elements = function(allowedTags) {
  this.allowedTags = allowedTags;
};

var redBullet = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO
9TXL0Y4OHwAAAABJRU5ErkJggg==`;

var tagMap = new Map([
  ['a', new ElementType(phrasingContent, [['href', 'about:blank']])],
  ['b', new ElementType(phrasingContent)],
  ['br', new ElementType(ElementType.VOID)],
  ['button', new ElementType(ElementType.TEXT)],
  ['canvas', new ElementType(ElementType.TEXT)],
  ['div', new ElementType(flowContent)],
  ['hr', new ElementType(ElementType.VOID)],
  ['i', new ElementType(phrasingContent)],
  ['iframe', new ElementType(ElementType.TEXT, [['src', 'about:blank']])],
  ['img', new ElementType(ElementType.VOID, [['src', redBullet]])],
  ['li', new ElementType(phrasingContent)],
  ['ol', new ElementType(['li'])],
  ['p', new ElementType(phrasingContent)],
  ['pre', new ElementType(phrasingContent)],
  ['span', new ElementType(phrasingContent)],
  ['sub', new ElementType(phrasingContent)],
  ['sup', new ElementType(phrasingContent)],
  ['table', new ElementType(['tr'])],
  ['textarea', new ElementType(ElementType.TEXT)],
  ['td', new ElementType(phrasingContent)],
  ['th', new ElementType(phrasingContent)],
  ['tr', new ElementType(['td', 'th'])],
  ['ul', new ElementType(['li'])],
]);

function* generateNames() {
  for (var i = 0; ; ++i) {
    yield i.toString(36);
  }
}

function Node(tagName, id) {
  this.tagName = tagName;
  this.id = id;
  this.children = [];
}

Node.prototype.render = function(baseIndent, indent) {
  if (typeof baseIndent == 'undefined') baseIndent = '';
  if (typeof indent == 'undefined') indent = '';

  var tagInfo = tagMap.get(this.tagName);

  var attrs = '';
  if (tagInfo.attributes) {
    for (var attr of tagInfo.attributes.entries()) {
      attrs += ` ${attr[0]}="${attr[1]}"`;
    }
  }

  var body;
  if (this.children.length > 0) {
    body = `\n${this.children.map(x => x.render(baseIndent, baseIndent + indent)).join('\n')}\n${indent}`;
  } else {
    body = '';
  }

  var endTag;
  if (tagInfo.children !== 'void') {
    endTag = `</${this.tagName}>`;
  } else {
    endTag = '';
  }

  return `${indent}<${this.tagName} id="${this.id}"${attrs}>${body}${endTag}`;
}

Node.prototype.countNodes = function() {
  var total = 1;
  for (var child of this.children) total += child.countNodes();
  return total;
}

function TextNode(text) {
  this.text = text;
}

TextNode.prototype.render = function(baseIndent, indent) {
  return `${indent}${this.text}`;
}

TextNode.prototype.countNodes = function() {
  return 1;
}

function DOMGenerator(random, branchiness, depthicity) {
  // Random number generator.
  this.random = random;
  // Branching factor.
  this.branchiness = branchiness;
  // Maximum tree depth.
  this.depthicity = depthicity;
  this.ids = generateNames();
}

DOMGenerator.prototype.generateNode = function(permissibleTags, depth) {
  if (typeof permissibleTags === 'undefined') permissibleTags = flowContent;
  if (typeof depth === 'undefined') depth = 0;
  var tagName = this.random.choice(permissibleTags);
  var node = new Node(tagName, this.ids.next().value);
  var contentModel = tagMap.get(tagName).contentModel;
  if (contentModel === ContentModel.VOID) {
    // Do nothing
  } else if (contentModel === ContentModel.TEXT || depth >= this.depthicity) {
    node.children.push(new TextNode(tagName));
  } else {
    for (var width = 0; width < this.branchiness; ++width) {
      var child = this.generateNode(contentModel.allowedTags, 1 + depth);
      node.children.push(child);
    }
  }
  return node;
}

module.exports.Node = Node;
module.exports.DOMGenerator = DOMGenerator;
