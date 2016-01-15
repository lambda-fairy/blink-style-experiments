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

var erlnmyr = require('erlenmeyer');
var types = erlnmyr.types;
var phase = erlnmyr.phase;

module.exports.amalgamate = phase({input: types.number, output: types.string, arity: 'N:1'},
  {
    onStart: function() {
      if (this.columnIndices === undefined) {
        // Make sure that every row's fields are in a consistent order
        this.columnIndices = {};
        this.columnNames = [];
        this.isFirstRow = true;
      }
      this.row = [];
      this.getColumnIndex = function(name) {
        if (this.columnIndices[name] === undefined) {
          this.columnIndices[name] = this.columnNames.length;
          this.columnNames.push(name);
        }
        return this.columnIndices[name];
      };
    },
    impl: function(value, tags) {
      for (var tag of this.options.tags) {
        this.row[this.getColumnIndex(tag)] = tags.read(tag);
      }
      var name = tags.read('eventName');
      this.row[this.getColumnIndex(name)] = value;
    },
    onCompletion: function() {
      var r = '';
      if (this.isFirstRow) {
        r = this.columnNames.join(', ') + '\n';
        this.isFirstRow = false;
      }
      r += this.row.join(', ');
      return r;
    }
  },
  {tags: []});

function typeVar(s) { return (function(v) {
  if (!v[s]) {
    v[s] = types.newTypeVar();
  }
  return v[s];
}); }

module.exports.mergeTags = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    var inputString = this.options.inputs.map(function(input) { return tags.read(input); }).reduce(
      function(a, b) { return a + '|' + b; });
    var reString = this.options.inputs.map(function(input) { return "([^\|]*)"}).reduce(
      function(a, b) { return a + '\\|' + b; });
    tags.tag(this.options.output, inputString.replace(new RegExp(reString), this.options.spec));
    return data;
  },
  { inputs: [], spec: '', output: 'result' });

module.exports.dateTag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    tags.tag('date', Date.now());
    return data;
  });

module.exports.hostnameTag = phase({input: typeVar('a'), output: typeVar('a'), arity: '1:1'},
  function(data, tags) {
    var os=require('os');
    var name = os.hostname();
    if (os.networkInterfaces().eth0 !== undefined)
      name += ' (' + os.networkInterfaces().eth0[0].address + ')';
    tags.tag('hostname', name);
    return data;
  });

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
