var util = require('util');


var ptype = function (inter, nogeneric) {
  var sequence = false;
  var generic = false;
  if (typeof inter !== 'string') {
    sequence = inter.sequence;
    generic = inter.generic;
    type = inter.idlType;
    if (Array.isArray(type)) {
      type = 'any';
    }
  } else {
    type = inter;
  }
  if (type === 'byte' || type === 'octet' || type === 'short'
   || type === 'unsigned short' || type === 'long' || type === 'unsigned long'
   || type === 'long long' || type === 'unsigned long long' || type === 'float'
   || type === 'unresticted float' || type === 'double' || type === 'unrestricted double') {
    type = 'number'
  }
  if (type === 'DOMString' || type === 'ByteString ' || type === 'USVString') {
    type = 'string'
  }
  if (type === 'boolean') {
    type = 'bool'
  }
  if (type === 'any') {
    type = "?";
  }
  if (type === 'EventHandler') {
    type = "fn(event)";
  }
  if (/[A-Z]/.test(type[0])) {
    type = `+${type}`;
  }
  if (sequence || generic === 'sequence') {
    type = `[${ptype(type)}]`;
  }
  if (generic && generic !== 'sequence') {
    type = `+${generic}`;
    if (!nogeneric) {
      type += `[value=${ptype(type)}]`;
    }
  }
  return type;
};

var method = function (inter) {
  "use strict";
  var args = [];
  for (let arg of inter.arguments) {
    args.push(`${arg.name}: ${ptype(arg.idlType, true)}`)
  }
  var type = `fn(${args.join(', ')}) -> ${ptype(inter.interface)}`;
  return {
    "!type": type
  };
};

var prop = function (inter) {
  "use strict";
  var type = inter.interface ? ptype(inter.interface) : '?';
  return {
    "!type": type
  };
};

var cons = function (inter) {
  "use strict";
  var args = [];
  for (let arg of inter.arguments) {
    args.push(`${arg.name}: ${ptype(arg.idlType)}`)
  }
  var type = `fn(${args.join(', ')})`;
  let proto = {};
  for (let m of inter.members) {
    let name = m.name;
    let inter = member(m);
    proto[name] = inter;
  }
  return {
    "!type": type,
    "prototype": proto
  }
};

var member = function (inter) {
  "use strict";
  if (inter.type === 'method') {
    return method(inter);
  }
  if (inter.type === 'prop') {
    return prop(inter);
  }
  if (inter.type === 'cons') {
    return cons(inter);
  }
};

var generator = {
  run: function (data) {
    "use strict";
    var def = {
      "!name": "webidl"
    };
    for (let inter of data) {
      // console.log(inter);
      var name = inter.name;
      def[name] = member(inter);
    }

    // console.log(util.inspect(def, {showHidden: false, depth: null}));
    console.log(JSON.stringify(def));
  }
};

module.exports = generator;
