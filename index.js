"use strict";

var loader = require('./loader.js');
var transformer = require('./transformer.js');
var generator = require('./generator.js');

var walk = require('walk');
var files = [];

var st = {};

// Walker options
var walker  = walk.walk('./webidl/webidl', { followLinks: false });

walker.on('file', function(root, stat, next) {
  st = loader.file(root + '/' + stat.name, st);
  next();
});

walker.on('end', function() {
  "use strict";

  var data = transformer.run(st);
  var code = generator.run(data);
});

