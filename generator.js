var jsonfile = require('jsonfile');

var doc = jsonfile.readFileSync('./mdn/webidl.json');

var store = {
  init: function (st) {
    this.st = st;
  },
  get: function (name) {
    return this.st[name];
  },
  isCallback: function (name) {
    if (!this.st[name]) {
      return false;
    }
    return (this.st[name].type === 'callback');
  },
  isCons: function (name) {
    if (!this.st[name]) {
      return false;
    }
    return (this.st[name].type === 'cons');
  }
};

var ptype = function (inter, options) {
  "use strict";
  options = options || {};
  var type;
  var sequence = false;
  var generic = false;
  var nogenericinfo = options.nogenericinfo;
  var nounion = options.nounion;
  if (typeof inter !== 'string') {
    if (inter.union && !nounion) {
      let types = inter.idlType;
      let ts = [];
      for (let t of types) {
        ts.push(ptype(t));
      }
      type = ts.join('|');
    } else {
      if (inter.union && nounion) {
        inter = inter.idlType[0];
      }
      sequence = inter.sequence;
      generic = inter.generic;
      type = inter.idlType;
      if (Array.isArray(type)) {
        type = 'any';
      }
      if (typeof type === 'string' && (store.isCons(type) || 'ArrayBuffer' === type )) {
        type = `+${type}`;
      }
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
  if (type === 'DOMString' || type === 'ByteString' || type === 'USVString') {
    type = 'string'
  }
  if (type === 'boolean') {
    type = 'bool'
  }
  if (type === 'JSON') {
    type = 'object'
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
  if (store.isCallback(type)) {
    var inter = store.get(type);
    var args = [];
    for (let arg of inter.arguments) {
      let optional = arg.optional ? '?' : '';
      args.push(`${arg.name}${optional}: ${ptype(arg.idlType, {nogenericinfo: true, nounion: true})}`)
    }
    type = `fn(${args.join(', ')})`;
    var rtn = ptype(inter.interface);
    if (rtn && rtn !== 'void') {
      type += ` -> ${rtn}`
    }
  }
  return type;
};

var typedef = function (inter, parent) {
  "use strict";
  var def = {};
  def["!type"] = ptype(inter.idlType);
  if (Object.keys(def).length === 1 && def['!type']) {
    def = def['!type'];
  }
  return def;
};

var method = function (inter, parent) {
  "use strict";
  var args = [];
  for (let arg of inter.arguments) {
    let optional = arg.optional ? '?' : '';
    args.push(`${arg.name}${optional}: ${ptype(arg.idlType, {nogenericinfo: true, nounion: true})}`)
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
  if (Object.keys(def).length === 1 && def['!type']) {
    def = def['!type'];
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
  if (Object.keys(def).length === 1 && def['!type']) {
    def = def['!type'];
  }
  return def;
};

var cons = function (inter, parent) {
  "use strict";
  var args = [];
  for (let arg of inter.arguments) {
    let optional = arg.optional ? '?' : '';
    args.push(`${arg.name}${optional}: ${ptype(arg.idlType, {nounion: true})}`)
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
  if (Object.keys(def).length === 1 && def['!type']) {
    def = def['!type'];
  }
  return def;
};

var member = function (inter, parent) {
  "use strict";
  if (inter.type === 'typedef') {
    return typedef(inter, parent);
  }
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
    store.init(data);

    var def = {
      "!name": "webidl",
      "!define": {}
    };
    var navigator = {};
    for (let name in data) {
      let inter = data[name];
      let pinter = member(inter);
      if (inter.nointerface) {
        def['!define'][name] = pinter;
      } else {
        if (name === 'Promise') {
          continue;
        }
        def[name] = pinter;
      }
      // if (inter.navigator && !/^(?:moz|Moz|nsI)/.test(inter.navigator)) {
      if (inter.navigator) {
        navigator[inter.navigator] = name;
      }
    }
    Object.assign(def.Navigator, navigator);
    console.log(JSON.stringify(def, null, 2));
  }
};

module.exports = generator;
