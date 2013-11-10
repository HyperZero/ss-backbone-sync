var registerCollection, registerModel, wrapError;

registerModel = function(model, modelConnectionId, id) {
  if (id == null) {
    id = void 0;
  }
  
  var modelID = id || model.cid;
  var modelRef = model;
  
  if (!(ss.event.listeners("sync:" + modelConnectionId + ":" + modelID).length > 0)) {
    console.log("registering modelConnectionId", modelConnectionId);
    
    return ss.event.on("sync:" + modelConnectionId + ":" + modelID, function(msg) {
      modelRef.trigger("backbone-sync-model", JSON.parse(msg));
      return;
    });
  }
};

registerCollection = function(collection, modelConnectionId) {
  var collectionRef = collection;
  console.log("registering collection", modelConnectionId);
  
  return ss.event.on("sync:" + modelConnectionId, function(msg) { // FIXME duplication on eventlistener
    collectionRef.trigger("backbone-sync-collection", JSON.parse(msg));
    return;
  });
};

window.syncedModel = Backbone.Model.extend({
  
  sync: function(method, model, options) {
    var modelname = this.constructor.modelname;
    var modelConnectionId = this.constructor.modelConnectionId || modelname;
    
    var cb = function(resp) {
      var respModel = resp.model || {};
      
      if(options.error && resp.error) {
        options.error(respModel, resp, options);
      }
      if(options.success && !resp.error) {
        options.success(respModel, resp, options);
      }
    };
    
    var req = {
      modelname: modelname,
      modelConnectionId: modelConnectionId,
      method: method,
      model: model.toJSON(),
      params: options.params
    };
    if (model.isNew()) {
      req.cid = model.cid;
    }
    
    console.log("Model upsync", modelConnectionId, req);
    return ss.backbone(req, cb);
  },
  
  initialize: function(attrs) {
    var modelname = this.constructor.modelname;
    var modelConnectionId = this.constructor.modelConnectionId || modelname;
    
    if (attrs == null) {
      attrs = {};
    }
    
    if (!modelname) {
      throw "Cannot sync. You must set the name of the modelname on the Model class";
      delete this;
    }
    
    var model = this;
    this.idAttribute = this.idAttribute || 'id';
    registerModel(model, modelConnectionId, attrs[this.idAttribute] || model.cid);
    var deleted = false;
    
    return this.on("backbone-sync-model", function(res) {
      console.log("Model downsync", modelConnectionId, res);
      if (res.e) {
        return console.log(res.e);
      } else {
        if (res.method === "confirm") {
          registerModel(model, modelConnectionId, res.model[this.idAttribute]);
          this.set(res.model);
        }
        if (res.method === "update") {
          this.set(res.model);
        }
        if (res.method === "delete") {
          if (!deleted) {
            this.trigger("destroy");
          }
          if (this.collection) {
            this.collection.remove(this.idAttribute);
          }
          return deleted = true;
        }
      }
    });
  }
});

window.syncedCollection = Backbone.Collection.extend({
  
  sync: function(method, model, options) {
    var modelname = this.constructor.modelname;
    var modelConnectionId = this.constructor.modelConnectionId || modelname;
    
    var cb = function(resp) {
      var respModel = resp.model || {};
      respModel = resp.models || respModel;
      
      if(options.error && resp.error) {
        options.error(respModel, resp, options);
      }
      if(options.success && !resp.error) {
        options.success(respModel, resp, options);
      }
    };
    
    var req = {
      modelname: modelname,
      modelConnectionId: modelConnectionId,
      method: method,
      model: model.toJSON(),
      params: options.params
    };
    
    console.log("Collection upsync", modelConnectionId, req);
    return ss.backbone(req, cb);
  },
  
  fetchWhere: function(attributes, options) {
    var collection, model, success;
    attributes = attributes || {};
    options = (options ? _.clone(options) : {});
    if (options.parse === void 0) {
      options.parse = true;
    }
    success = options.success;
    collection = this;
    options.success = function(resp) {
      var method;
      method = (options.reset ? "reset" : "set");
      collection[method](resp, options);
      if (success) {
        success(collection, resp, options);
      }
      return collection.trigger("sync", collection, resp, options);
    };
    wrapError(this, options);
    model = new this.model(attributes);
    return this.sync("read", model, options);
  },
  
  initialize: function() {
    var collection;
    var modelname = this.constructor.modelname;
    var modelConnectionId = this.constructor.modelConnectionId || modelname;
    if (!modelname) {
      throw "Cannot sync. You must set the name of the modelname on the Collection class";
      return delete this;
      
    } else {
      collection = this;
      registerCollection(collection, modelConnectionId);
      
      return this.on("backbone-sync-collection", function(res) {
        console.log("collection downsync", modelConnectionId, res);
        
        if (res.method === "create") {
          this.add(res.model);
        }
        if (res.method === "read") {
          this.add(res.models, {
            parse: true,
            merge: true
          });
        }
        
        return this.trigger("change");
      });
    }
  }
});

wrapError = function(model, options) {
  var error;
  error = options.error;
  return options.error = function(resp) {
    if (error) {
      error(model, resp, options);
    }
    return model.trigger("error", model, resp, options);
  };
};
