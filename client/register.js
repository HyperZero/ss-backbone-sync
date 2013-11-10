var cbStack = {},
    defaultCallback,
    numRequests = 0,
    ss = void 0;

ss = require("socketstream");

defaultCallback = function(x) {
  return console.log(x);
};

module.exports = function(responderId, config, send) {
  ss.registerApi("backbone", function(req, cb) {
    req.id = ++numRequests;
    
    var msg = void 0;
    msg = JSON.stringify(req);
    
    if (typeof cb !== "function") {
      cb = defaultCallback;
    }
    cbStack[numRequests] = cb;
    
    send(msg);
    
    return void 0;
  });
  
  return ss.message.on(responderId, function(msg, meta) {
    var obj;
    obj = JSON.parse(msg) || {};
    
    if (obj.id && cbStack[obj.id]) {
      if (obj.e) {
        console.error("SS-Backbone-Sync server error:", obj.e.message);
      } else {
        cbStack[obj.id].apply(cbStack[obj.id], [obj]);
      }
      
      return delete cbStack[obj.id];
    }
  });
};
