
var factory = {
  callback: function (def) {
    return {
      name: def.name,
      type: 'callback',
      interface: 'void',
      arguments: def.arguments,
      nointerface: true
    }
  },
  constructor: function (def) {
    return {
      name: def.name,
      type: 'cons',
      inheritance: def.inheritance,
      arguments: def.arguments,
      members: factory.members(def.members)
    }
  },
  object: function (def) {
    return {
      name: def.name,
      primary: def.primary,
      type: 'prop',
      inheritance: def.inheritance,
      members: factory.members(def.members),
      nointerface: def.nointerface,
      navigator: def.navigator
    }
  },
  members: function (members) {
    "use strict";
    var getter = null;
    var rtn = members.map(function (member) {
      if (member.getter) {
        getter = {
          name: '<i>',
          type: 'prop',
          static: member.static,
          interface: member.idlType
        };
      }
      var idltype = null;
      var m = {
        name: member.name,
        type: (member.type === 'operation') ? 'method' : 'prop',
        static: member.static,
        interface: member.idlType
      };
      if (m.type === 'method') {
        m.arguments = member.arguments;
      }
      return m;
    });
    if (getter) {
      rtn.push(getter);
    }
    return rtn;
  }
};

module.exports = factory;
