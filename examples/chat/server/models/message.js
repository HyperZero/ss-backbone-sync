var _ids = 1,
    crypto = require('crypto'),
    memoryStore = {};

module.exports = function(req, res, ss) {
  req.use('session');
  
  var modelName = "message";

  return {
    create: function(model) {
      console.log('create', model);
      var cid = req.cid;
      var code = crypto.createHash('md5')
                             .update((new Date()).getTime() + Math.round(Math.random() * 1000) + '')
                             .digest("hex");
      model._id = code;
      var error = false; // simulate error case
      resp = {
        cid: cid,
        model: model,
        method: "confirm",
        modelname: modelName,
        error: error // optional: if true, backbone sync triggers error method  
      };
      res(resp);
      if(!error) {
        memoryStore[model._id] = model;
        delete resp.cid;
        resp.method = "create";
        ss.publish.all("sync:" + req.modelConnectionId, JSON.stringify(resp));
      }
      return;
    },

    update: function(model) {
      console.log('update', model);
      
      memoryStore[model._id] && (memoryStore[model._id] = model);
      resp = {
        model: model,
        method: "update",
        modelname: modelName
      };
      
      res(resp);
      return ss.publish.all("sync:" + req.modelConnectionId + ":" + model._id, JSON.stringify(resp));
    },

    read: function(model) {
      console.log('read', model);
      
      var fetchedModel= memoryStore[model._id];
      resp = {
        model: fetchedModel,
        method: "read",
        modelname: modelName
      };
      return res(resp);
    },

    readAll: function(model) {
      console.log('readAll', model);
      var _id;
      var models = [];
      for (_id in memoryStore) {
        models.push(memoryStore[_id]);
      }
      resp = {
        models: models,
        method: "read",
        modelname: modelName,
        error: false // add to prevent updating model and trigger backbone.error method
      };
      return res(resp);
    },
    
    "delete": function(model) {
      console.log('delete', model);
      if (delete memoryStore[model._id]) {
        resp = {
          method: "delete",
          model: model,
          modelname: modelName
        };
        
        res(resp);
        return ss.publish.all("sync:" + req.modelConnectionId + ":" + model._id, JSON.stringify(resp));
      }
    }
  };
};