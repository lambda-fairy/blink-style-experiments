// Copyright 2016 Google Inc. All rights reserved.
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

var seedrandom = require('seedrandom');

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

  var body = '';
  if (this.children.length > 0) {
    body = `\n${this.children.map(x => x.render(baseIndent, baseIndent + indent)).join('\n')}\n${indent}`;
  }

  var endTag = '';
  if (!voidElements.has(this.tagName)) {
    endTag = `</${this.tagName}>`;
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

function generateDom(random, branchiness, depthicity, tagMap) {
  var gen = new DomGenerator(random, branchiness, depthicity, tagMap);
  var nodes = gen.generateNodes();
  return {
    nodes: nodes,
    ids: gen.ids,
    countNodes: function() {
      return this.nodes.map(n => n.countNodes()).reduce((m, n) => m + n, 0);
    },
    render: function(indent) {
      return this.nodes.map(n => n.render(indent)).join('\n');
    },
  };
}

function DomGenerator(random, branchiness, depthicity, tagMap) {
  // Random number generator.
  this.random = random;
  // Branching factor.
  this.branchiness = branchiness;
  // Maximum tree depth.
  this.depthicity = depthicity;
  // The set of tags to use.
  this.tagMap = tagMap ? TagMaps[tagMap] : TagMaps['alexa'];
  if (typeof this.tagMap === 'undefined') throw `Unknown tag map ${tagMap}`;
  this.namesIterator = generateNames();
  this.ids = [];
}

DomGenerator.prototype.generateNodes = function(parentTag, depth) {
  if (typeof parentTag === 'undefined') parentTag = 'body';
  if (typeof depth === 'undefined') depth = 0;
  var result = [];
  for (var width = 0; width < this.branchiness; ++width) {
    var tagName = this.random.weightedChoice(this.tagMap[parentTag]);
    if (depth >= this.depthicity || tagName === '') {
      // Optimization: merge consecutive text nodes into a single node
      var newText = parentTag;
      if (result.length > 0 && result[result.length-1] instanceof TextNode)
        result[result.length-1].text += newText;
      else
        result.push(new TextNode(newText));
    } else {
      var children = [];
      if (this.tagMap[tagName] && Object.getOwnPropertyNames(this.tagMap[tagName]).length > 0)
        children = this.generateNodes(tagName, 1 + depth);
      result.push(new Node(tagName, this.nextId(), children));
    }
  }
  return result;
}

DomGenerator.prototype.nextId = function() {
  var result = 'i' + this.namesIterator.next().value;
  this.ids.push(result);
  return result;
}

module.exports.makeRandom = makeRandom;
module.exports.generateDom = generateDom;
