var util = require('util');


var ptype = function (inter, nogenericinfo) {
  "use strict";
  var type;
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
    type = "fn(+Event)";
  }
  if (sequence || generic === 'sequence') {
    type = `[${ptype(type)}]`;
  }
  if (generic && generic !== 'sequence') {
    let itype = type;
    type = `+${generic}`;
    if (!nogenericinfo) {
      if (!itype.generic) {
        type += `[value=${ptype(itype)}]`;
      }
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
  var type = `fn(${args.join(', ')})`;
  var rtn = ptype(inter.interface);
  if (rtn && rtn !== 'void') {
    type += ` -> ${rtn}`
  }
  return {
    "!type": type
  };
};

var prop = function (inter) {
  "use strict";
  var type = inter.interface ? ptype(inter.interface) : null;
  var def = {};
  if (type) {
    def["!type"] = type;
  }
  if (inter.members) {
    for (let m of inter.members) {
      let name = m.name;
      let inter = member(m);
      def[name] = inter;
    }
  }
  return def;
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
      "!name": "webidl",
      "!define": {}
    };
    for (let inter of data) {
      var name = inter.name;
      if (inter.nointerface) {
        def['!define'][name] = member(inter);
      } else {
        def[name] = member(inter);
      }
    }

    // console.log(util.inspect(def, {showHidden: false, depth: null}));
    console.log(JSON.stringify(def, null, 2));
  }
};

module.exports = generator;
