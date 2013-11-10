var getBranchFromTree, isArray, pathlib;

pathlib = require('path');

module.exports = function(ss, middleware, config) {
  var dir, file_type, model_conf, model_folder, request;
  model_conf = config.models || {};
  file_type = model_conf.file_type || "js";
  model_folder = model_conf.folder || "models";
  dir = pathlib.join(ss.root, "server/" + model_folder);
  return request = function(model, req, res) {
    var actions, cb, exec, main, methodName, stack;
    if (!(req.method && typeof req.method)) {
      throw new Error("No action provided. Action names must be a string separated by dots/periods (e.g. 'message.send')");
    }
    stack = [];
    req.use = function(nameOrModule) {
      var args, e, fn, middlewareAry, mw;
      try {
        args = Array.prototype.slice.call(arguments);
        mw = typeof nameOrModule === 'function' ? nameOrModule : (middlewareAry = nameOrModule.split('.'), getBranchFromTree(middleware, middlewareAry));
        if (mw) {
          fn = mw.apply(mw, args.splice(1));
          return stack.push(fn);
        } else {
          throw new Error("Middleware function '" + nameOrModule + "' not found. Please reference internal or custom middleware as a string (e.g. 'session' or 'user.checkAuthenticated') or pass a function/module");
        }
      } catch (_error) {
        e = _error;
        return res(e, null);
      }
    };
    if (isArray(model)) {
      methodName = "readAll";
    } else {
      methodName = req.method;
    }
    cb = function() {
      var args;
      args = Array.prototype.slice.call(arguments);
      return res(null, args[0]); // index = 0, backend models should only respond with 1 object
    };
    actions = require("" + dir + "/" + (req.modelName.toLowerCase()) + "." + file_type)(req, cb, ss);
    main = function() {
      var method;
      method = actions[methodName];
      if (method == null) {
        return res(new Error("Unable to find '" + req.method + "' method in exports.actions"));
      }
      if (typeof method !== 'function') {
        return res(new Error("The '" + req.method + "' method in exports.actions must be a function"));
      }
      return method(model);
    };
    stack.push(main);
    exec = function(request, res, i) {
      if (i == null) {
        i = 0;
      }
      return stack[i].call(stack, req, res, function() {
        return exec(req, res, i + 1);
      });
    };
    return exec(req, cb);
  };
};

getBranchFromTree = function(tree, ary, index, i) {
  if (index == null) {
    index = null;
  }
  if (i == null) {
    i = 0;
  }
  if (index == null) {
    index = ary.length;
  }
  if (i === index) {
    return tree;
  }
  return arguments.callee(tree[ary[i]], ary, index, ++i);
};

isArray = function(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
};