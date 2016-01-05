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
  random.weightedChoice = function(weights) {
    var totalWeight = 0;
    for (var item of Object.getOwnPropertyNames(weights))
      totalWeight += weights[item];
    var threshold = this.uniform(0, totalWeight);
    var partialSum = 0;
    for (var item of Object.getOwnPropertyNames(weights)) {
      partialSum += weights[item];
      if (partialSum >= threshold) return item;
    }
    return undefined;
  };
  random.randint = function(min, max) {
    return min + Math.abs(this.int32()) % (max - min + 1);
  };
  random.uniform = function(min, max) {
    return min + (max - min) * this.double();
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
        tagMap: args.tagMap,
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
    var tagMap = TagMaps[args.tagMap];
    if (!tagMap) throw `Unknown tag map ${args.tagMap}`;
    var generator = new DOMGenerator(random, args.branchiness, args.depthicity, tagMap);
    var result = generator.generateNodes();
    this.tags.tag('branchiness', args.branchiness);
    this.tags.tag('depthicity', args.depthicity);
    this.tags.tag('tagMap', args.tagMap);
    this.tags.tag('nodeCount', result.map(n => n.countNodes()).reduce((m, n) => m + n, 0));
    this.tags.tag('seed', random.seed);
    this.put(result.map(n => n.render(' ')).join('\n'));
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

var redBullet = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA
AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO
9TXL0Y4OHwAAAABJRU5ErkJggg==`;

var TagMaps = {
  alexa: require('./alexa-stats.json'),
  simple: {
    'body': {
      'div': 1,
    },
    'div': {
      'div': 1,
    }
  },
};

var tagAttributes = new Map([
  ['a', [['href', 'about:blank']]],
  ['iframe', [['src', 'about:blank']]],
  ['img', [['src', redBullet]]],
]);

// Source: http://www.programmerinterview.com/index.php/html5/void-elements-html5/
var voidElements = new Set(
  'area base br col command embed hr img input keygen link meta param source track wbr'.split());

function* generateNames() {
  for (var i = 0; ; ++i) {
    yield i.toString(36);
  }
}

function Node(tagName, id, children) {
  this.tagName = tagName;
  this.id = id;
  this.children = children || [];
}

Node.prototype.render = function(baseIndent, indent) {
  if (typeof baseIndent == 'undefined') baseIndent = '';
  if (typeof indent == 'undefined') indent = '';

  var attrs = '';
  if (tagAttributes.has(this.tagName)) {
    for (var attr of tagAttributes.get(this.tagName)) {
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
  if (!voidElements.has(this.tagName)) {
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
  if (typeof indent == 'undefined') indent = '';
  return `${indent}${this.text}`;
}

TextNode.prototype.countNodes = function() {
  return 1;
}

function DOMGenerator(random, branchiness, depthicity, tagMap) {
  // Random number generator.
  this.random = random;
  // Branching factor.
  this.branchiness = branchiness;
  // Maximum tree depth.
  this.depthicity = depthicity;
  // The set of tags to use.
  this.tagMap = tagMap;
  this.ids = generateNames();
}

DOMGenerator.prototype.generateNodes = function(parentTag, depth) {
  if (typeof parentTag === 'undefined') parentTag = 'body';
  if (typeof depth === 'undefined') depth = 0;
  var result = [];
  for (var width = 0; width < this.branchiness; ++width) {
    var tagName = this.random.weightedChoice(this.tagMap[parentTag]);
    var node;
    if (depth >= this.depthicity || tagName === '') {
      node = new TextNode(parentTag);
    } else {
      var children;
      if (this.tagMap[tagName] && Object.getOwnPropertyNames(this.tagMap[tagName]).length > 0)
        children = this.generateNodes(tagName, 1 + depth);
      else
        children = [];
      node = new Node(tagName, this.ids.next().value, children);
    }
    result.push(node);
  }
  return result;
}

module.exports.Node = Node;
module.exports.DOMGenerator = DOMGenerator;
module.exports.makeRandom = makeRandom;
