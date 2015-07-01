var parse = require("webidl2").parse;
var fs = require('fs');

if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target, firstSource) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }

      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
          continue;
        }
        nextSource = Object(nextSource);

        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}

var loader = {
  definition: function (def) {
    "use strict";
    var ext = loader.extattr(def);
    
    var d = null;

    if (def.type === 'interface') {
      d = loader.interface(def);
    } else if (def.type === 'implements') {
      d = loader.implements(def);
    }
    if (!d) { return d; }
    return Object.assign(d, ext);
  },
  extattr: function (def) {
    "use strict";
    var primary = false;
    var constructor = false;
    var nointerface = false;
    var named = null;
    var chrome = false;
    var exposed = [];

    if (def.extAttrs) {
      for (let attr of def.extAttrs) {
        if (attr.name === 'PrimaryGlobal')     { primary = true; }
        if (attr.name === 'Constructor')       { constructor = true; def.arguments = attr.arguments; }
        if (attr.name === 'NamedConstructor')  { named = attr.rhs.value; def.arguments = attr.arguments;  }
        if (attr.name === 'NoInterfaceObject') { nointerface = true; }
        if (attr.name === 'ChromeOnly')        { chrome = true; }
        if (attr.name === 'Exposed') {
          exposed = attr.rhs;
          if (!Array.isArray(exposed)
           && exposed.type === 'identifier') {
            exposed = [exposed.value];
          }
        }
      }
    }

    var rtn = {
      primary: primary,
      constructor: constructor,
      nointerface: nointerface,
      chrome: chrome,
      named: named,
      exposed: exposed
    };
    if (rtn.constructor || rtn.named) {
      rtn.arguments = def.arguments || [];
    }
    return rtn;
  },
  interface: function (def) {
    "use strict";
    var name = def.name;
    var partial = def.partial;
    var inheritance = def.inheritance;
    var members = [];
    for (let prop of def.members) {
      if (/^(?:moz|Moz|nsI)/.test(prop.name)) { continue; }
      if (/-/.test(prop.name)) { continue; }
      // let idl = (prop.idlType && prop.idlType.idlType) || null;
      // if (prop.idlType && prop.idlType.generic) { idl = prop.idlType.generic; }
      // if (prop.idlType && prop.idlType.sequence) { idl = false; }
      // if (prop.idlType && prop.idlType.union) { idl = false; }
      let args = [];
      if (prop.arguments) {
        for (let arg of prop.arguments) {
          // let idl = (arg.idlType && arg.idlType.idlType) || null;
          let idl = arg.idlType || null;
          let sequence = false;
          if (idl) {
            if (idl.sequence) {
              sequence = true;
              idl = idl.idlType;
            }
          }

          args.push({
            name: arg.name,
            optional: !!arg.optional,
            variadic: !!arg.variadic,
            idlType: arg.idlType
          });
        }
      }
      members.push({
        name: prop.name,
        type: prop.type,
        static: !!prop.static,
        arguments: args,
        idlType: prop.idlType
      });
    }
    return {
      type: 'interface',
      name: name,
      inheritance: inheritance,
      partial: partial,
      members: members
    };
  },
  implements: function (def) {
    "use strict";
    // console.log(` ${def.target} implements ${def.implements}`);
    return {
      type: 'implements',
      target: def.target,
      implements: def.implements
    };
  },
  file: function (file, storage) {
    "use strict";
    // console.log(file);
    if (!storage.interfaces)      { storage.interfaces = {}; }
    if (!storage.implementations) { storage.implementations = {}; }

    var tree = parse(fs.readFileSync(file, 'utf8'));

    for (let def of tree) {
      if (/^(?:moz|Moz|XUL|nsI)/.test(def.name)) { continue; }

      let d = loader.definition(def);

      if (!d) { continue; }
      if (d.chrome) { continue; }

      if (d.type === 'interface') {
        if (d.partial) {
          storage.interfaces[d.name].members = storage.interfaces[d.name].members.concat(d.members);
        } else {
          storage.interfaces[d.name] = d;
        }
      } 
      if (d.type === 'implements') {
        if (/^(?:moz|Moz|XUL|nsI)/.test(d.implements)) { continue; }
        if (!storage.implementations[d.target]) {
          storage.implementations[d.target] = [];
        }
        storage.implementations[d.target].push(d.implements);
      } 
    }

    return storage;
  }
};

module.exports = loader;
