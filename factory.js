
var factory = {
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
      nointerface: def.nointerface
    }
  },
  members: function (members) {
    "use strict";
    return members.map(function (member) {
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
  }
};

module.exports = factory;
