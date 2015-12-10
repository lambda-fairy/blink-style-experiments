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
  var body;
  if (this.children.length > 0) {
    body = `\n${this.children.map(x => x.render(baseIndent, baseIndent + indent)).join('\n')}\n${indent}`;
  } else {
    body = '';
  }
  return `${indent}<${this.tagName} id="${this.id}">${body}</${this.tagName}>`;
}

Node.prototype.gatherStatistics = function() {
  var state = {
    nodeCount: 0,
    allBranchFactors: [],
    allDepths: [],
    currentDepth: 0,
  };
  this._gatherStatisticsHelper(state);
  return {
    nodeCount: state.nodeCount,
    meanBranchFactor: mean(state.allBranchFactors),
    maxBranchFactor: max(state.allBranchFactors),
    meanDepth: mean(state.allDepths),
    maxDepth: max(state.allDepths),
  };
};

function mean(items) {
  return items.reduce((x, y) => x + y) / items.length;
}

function max(items) {
  return items.reduce((x, y) => Math.max(x, y));
}

Node.prototype._gatherStatisticsHelper = function(state) {
  ++state.nodeCount;
  state.allChildCounts.push(this.children.length);
  state.allDepths.push(state.currentDepth);
  for (child of this.children) {
    ++state.currentDepth;
    child._gatherStatisticsHelper(state);
    --state.currentDepth;
  }
};

function DOMGenerator(random, branchiness, depthicity) {
  // Random number generator. Returns a random value from the range `[0, 1)`.
  this.random = random;
  // Given the number of existing children on the current node, returns the
  // probability of adding another child.
  this.branchiness = branchiness;
  // Given the number of ancestors to the current node, returns the probability
  // of adding another layer to the tree.
  this.depthicity = depthicity;
  this.ids = generateNames();
}

DOMGenerator.prototype.generateNode = function(depth) {
  if (typeof depth == 'undefined') depth = 0;
  var node = new Node('div', this.ids.next().value);
  if (this.random() < this.depthicity(depth)) {
    for (var width = 0; this.random() < this.branchiness(width); ++width) {
      var child = this.generateNode(1 + depth);
      node.children.push(child);
    }
  }
  return node;
}

module.exports.Node = Node;
module.exports.DOMGenerator = DOMGenerator;
