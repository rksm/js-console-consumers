const defaultConsoleMethods = ["log", "group", "groupEnd", "warn", "assert", "error"];

export function prepareConsole(platformConsole, consoleMethods = defaultConsoleMethods) {
  for (var i = 0; i < consoleMethods.length; i++)
    if (!platformConsole[consoleMethods[i]])
      platformConsole[consoleMethods[i]] = emptyFunc;

  var consumers = platformConsole.consumers = [];
  var simpleConsumers = platformConsole.simpleConsumers = [];
  platformConsole.wasWrapped = false;

  platformConsole.removeWrappers = removeWrappers;
  platformConsole.addWrappers = addWrappers;

  platformConsole.addConsumer = function(c, simple = false) {
    let subscribers = simple ? simpleConsumers : consumers;
    if (!subscribers.includes(c)) {
      subscribers.push(c);
      addWrappers();
    }
  }

  platformConsole.removeConsumer = function(c) {
    var idx = consumers.indexOf(c);
    if (idx >= 0) consumers.splice(idx, 1);
    var idx2 = simpleConsumers.indexOf(c);
    if (idx2 >= 0) simpleConsumers.splice(idx2, 1);
    if (!consumers.length && !simpleConsumers.length)
      removeWrappers();
  }

  function emptyFunc() {}

  function addWrappers() {
    if (platformConsole.wasWrapped) return;

    var props = [];
    for (var name in platformConsole) props.push(name);

    var exceptions = ["removeWrappers", "addWrappers", "addConsumer", "removeConsumer"],
        activationState = {};

    for (var i = 0; i < props.length; i++) {
      var name = props[i];
      if (
        name[0] === "$" ||
        typeof platformConsole[name] !== "function" ||
        exceptions.indexOf(name) > -1
      ) continue;

      (function(name) {
        var func = platformConsole[name];
        platformConsole["$" + name] = func;
        platformConsole[name] = function() {
          if (activationState[name]) return;
          activationState[name] = true;
          try {
            func.apply(platformConsole, arguments);
            for (var i = 0; i < consumers.length; i++) {
              var consumerFunc = consumers[i][name];
              if (typeof consumerFunc === "function")
                consumerFunc.apply(consumers[i], arguments);
            }
            for (var i = 0; i < simpleConsumers.length; i++) {
              var consumerFunc = simpleConsumers[i][name];
              if (typeof consumerFunc === "function")
                consumerFunc.call(simpleConsumers[i], formatTemplateString.apply(null, arguments));
            }
          } finally { activationState[name] = false; }
        }
      })(name);
    }
  }

  function removeWrappers() {
    for (var name in platformConsole) {
      if (name[0] !== "$") continue;
      var realName = name.substring(1, name.length);
      platformConsole[realName] = platformConsole[name];
      delete platformConsole[name];
    }
  }
}

function formatTemplateString(template, ...args) {
  var string = template;
  for (var i = 0; i < args.length; i++) {
    var idx = string.indexOf("%s");
    if (idx > -1) string = string.slice(0, idx) + String(args[i]) + string.slice(idx + 2);
    else string = string + " " + String(args[i]);
  }
  return string;
}
