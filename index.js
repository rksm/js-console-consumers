const defaultConsoleMethods = ["log", "group", "groupEnd", "warn", "assert", "error"];

export function prepareConsole(platformConsole, consoleMethods = defaultConsoleMethods, _window = window) {
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
    installErrorCapture(c, _window);
  }

  platformConsole.removeConsumer = function(c) {
    var idx = consumers.indexOf(c);
    if (idx >= 0) consumers.splice(idx, 1);
    var idx2 = simpleConsumers.indexOf(c);
    if (idx2 >= 0) simpleConsumers.splice(idx2, 1);
    if (!consumers.length && !simpleConsumers.length)
      removeWrappers();
    removeErrorCapture(c, _window);
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


function installErrorCapture(target, _window = window) {
  if (!target._errorHandler) {
    target._errorHandler = (function errorHandler(errEvent, url, lineNumber, column, errorObj) {
      var err = errEvent.error || errEvent, msg;
      if (err.stack) msg = String(err.stack);
      else if (url) msg = `${err} ${url}:${lineNumber}`
      else msg = String(err);
      if (typeof target.error === "function") target.error(msg);
    });
    _window.addEventListener('error', target._errorHandler);
  }
  if (!target._errorHandlerForPromises) {
    target._errorHandlerForPromises = function unhandledPromiseRejection(evt) {
      if (typeof target.error === "function")
        target.error('unhandled promise rejection:\n' + evt.reason);
    };
    _window.addEventListener('unhandledrejection', target._errorHandlerForPromises);
  }
}

function removeErrorCapture(target, _window = window) {
  if (target._errorHandler) {
    _window.removeEventListener('error', target._errorHandler);
    delete target._errorHandler;
  }
  if (!target._errorHandlerForPromises) {
    _window.removeEventListener('unhandledrejection', target._errorHandlerForPromises);
    delete target._errorHandlerForPromises;
  }
}
