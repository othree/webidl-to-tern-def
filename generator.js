var jsonfile = require('jsonfile');

var doc = jsonfile.readFileSync('./mdn/webidl.json');

var store = {
  set: function (st) {
    this.st = st;
  },
  isCons: function (name) {
    if (!this.st[name]) {
      return false;
    }
    return (this.st[name].type === 'cons');
  }
};

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
    if (typeof type === 'string' && store.isCons(type)) {
      type = `+${type}`;
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
  if (type === 'Element') {
    type = "HTMLElement";
  }
  if (type === 'CSSStyleDeclaration') {
    type = "CSS2Properties";
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

var method = function (inter, parent) {
  "use strict";
  var args = [];
  for (let arg of inter.arguments) {
    let optional = arg.optional ? '?' : '';
    args.push(`${arg.name}${optional}: ${ptype(arg.idlType, true)}`)
  }
  var type = `fn(${args.join(', ')})`;
  var rtn = ptype(inter.interface);
  if (rtn && rtn !== 'void') {
    type += ` -> ${rtn}`
  }
  var def = {
    "!type": type
  };
  var key = inter.key || (parent? `${parent}/` : '') + inter.name;
  if (doc[key]) {
    def['!url'] = doc[key]['!url'];
    def['!doc'] = doc[key]['!doc'];
  }
  return def;
};

var prop = function (inter, parent) {
  "use strict";
  var type = inter.interface ? ptype(inter.interface) : null;
  var def = {};
  if (type) {
    def["!type"] = type;
  }
  var key = inter.key || (parent? `${parent}/` : '') + inter.name;
  if (doc[key]) {
    def['!url'] = doc[key]['!url'];
    def['!doc'] = doc[key]['!doc'];
  }
  if (inter.inheritance) {
    if (store.isCons(inter.inheritance)) {
      def['!proto'] = `${inter.inheritance}.prototype`;
    } else {
      def['!proto'] = inter.inheritance;
    }
  }
  if (inter.members) {
    let pname = inter.name;
    for (let m of inter.members) {
      let name = m.name;
      let inter = member(m, pname);
      def[name] = inter;
    }
  }
  return def;
};

var cons = function (inter, parent) {
  "use strict";
  var args = [];
  for (let arg of inter.arguments) {
    let optional = arg.optional ? '?' : '';
    args.push(`${arg.name}${optional}: ${ptype(arg.idlType)}`)
  }
  var type = `fn(${args.join(', ')})`;
  var proto = {};
  var def = {
    "!type": type,
  }
  var key = inter.key || (parent? `${parent}/` : '') + inter.name;
  if (doc[key]) {
    def['!url'] = doc[key]['!url'];
    def['!doc'] = doc[key]['!doc'];
  }
  if (inter.inheritance) {
    if (store.isCons(inter.inheritance)) {
      proto['!proto'] = `${inter.inheritance}.prototype`;
    } else {
      proto['!proto'] = inter.inheritance;
    }
  }

  var pname = inter.name;
  for (let m of inter.members) {
    let name = m.name;
    let inter = member(m, pname);
    if (m.static) {
      def[name] = inter;
    } else {
      proto[name] = inter;
    }
  }
  def.prototype = proto;
  return def;
};

var member = function (inter, parent) {
  "use strict";
  if (inter.type === 'method') {
    return method(inter, parent);
  }
  if (inter.type === 'prop') {
    return prop(inter, parent);
  }
  if (inter.type === 'cons') {
    return cons(inter, parent);
  }
};

var generator = {
  run: function (data) {
    "use strict";
    store.set(data);

    var def = {
      "!name": "webidl",
      "!define": {}
    };
    for (let name in data) {
      let inter = data[name];
      if (inter.nointerface) {
        def['!define'][name] = member(inter);
      } else {
        def[name] = member(inter);
      }
    }
    def['!define'].EventListener = {
      '!type': 'fn(e: +Event)'
    }
    console.log(JSON.stringify(def, null, 2));
  }
};

module.exports = generator;
