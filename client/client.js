;(function() {
  
  var log, registerCollection, registerModel, removeModelListener, wrapError;
  
  log = function() {
    var args = Array.prototype.slice.call(arguments);
    if(window.loglevel && window.loglevel > 0) {
      console.log.apply(console, args);
    }
  };
  
  registerModel = function(model, modelConnectionId, id) {
    if (id == null) {
      id = void 0;
    }
    
    var modelId = id || model.cid;
    var modelRef = model;
    
    if (!(ss.event.listeners('sync:' + modelConnectionId + ':' + modelId).length > 0)) {
      log('registering modelConnectionId', modelConnectionId, 'modelId', modelId);
      
      return ss.event.on('sync:' + modelConnectionId + ':' + modelId, function(msg) {
        modelRef.trigger('backbone-sync-model', JSON.parse(msg));
        return;
      });
    }
  };
  
  registerCollection = function(collection, modelConnectionId) {
    var collectionRef = collection;
    log('registering collection', modelConnectionId);
    
    return ss.event.on('sync:' + modelConnectionId, function(msg) {
      collectionRef.trigger('backbone-sync-collection', JSON.parse(msg));
      return;
    });
  };
  
  removeModelListener = function(modelConnectionId, id) {
    log('removes all listeners', 'modelConnectionId', modelConnectionId, 'modelId', id);
    ss.event.removeAllListeners('sync:' + modelConnectionId + ':' + id);
  };
  
  window.syncedModel = Backbone.Model.extend({
    
    sync: function(method, model, options) {
      var modelname = this.constructor.modelname;
      var modelConnectionId = this.constructor.modelConnectionId || modelname;
      var idAttribute = model.idAttribute || 'id';
      
      var cb = function(resp) {
        var respModel = resp.model || {};
        var modelId = (idAttribute)? respModel[idAttribute]: model.cid;
        log('Model downsync', modelConnectionId, resp);
        
        if(options.error && resp.error) {
          options.error(resp, respModel, options);
        }
        if(options.success && !resp.error) {
          if(resp.method == 'confirm') {
            removeModelListener(modelConnectionId, model.cid);
            registerModel(model, modelConnectionId, modelId);
          }
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
      
      log('Model upsync', modelConnectionId, req);
      return ss.backbone(req, cb);
    },
    
    initialize: function(attrs) {
      var modelname = this.constructor.modelname;
      var modelConnectionId = this.constructor.modelConnectionId || modelname;
      
      if (attrs == null) {
        attrs = {};
      }
      
      if (!modelname) {
        var err = 'Cannot sync. You must set the name of the modelname on the Model class';
        log(err);
        throw err;
        return delete this;
      }
      
      var model = this;
      this.idAttribute = this.idAttribute || 'id';
      registerModel(model, modelConnectionId, attrs[this.idAttribute] || model.cid);
      var deleted = false;
      
      return this.on('backbone-sync-model', function(res) {
        log('Model downsync', modelConnectionId, res);
        if (res.e) {
          return log(res.e);
        } else {
          if (res.method === 'confirm' && !res.error) {
            registerModel(model, modelConnectionId, res.model[this.idAttribute]);
            this.set(res.model);
          }
          if (res.method === 'update' && !res.error) {
            this.set(res.model);
          }
          if (res.method === 'delete' && !res.error) {
            if (!deleted) {
              this.trigger('destroy');
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
        log('collection downsync', modelConnectionId, resp);
        
        if(options.error && resp.error) {
          options.error(resp, respModel, options);
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
      
      log('Collection upsync', modelConnectionId, req);
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
        method = (options.reset ? 'reset' : 'set');
        collection[method](resp, options);
        if (success) {
          success(collection, resp, options);
        }
        return collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      model = new this.model(attributes);
      return this.sync('read', model, options);
    },
    
    initialize: function() {
      var collection;
      var modelname = this.constructor.modelname;
      var modelConnectionId = this.constructor.modelConnectionId || modelname;
      if (!modelname) {
        var err = 'Cannot sync. You must set the name of the modelname on the Collection class';
        log(err);
        throw err;
        return delete this;
      } else {
        collection = this;
        registerCollection(collection, modelConnectionId);
        
        return this.on('backbone-sync-collection', function(res) {
          log('collection downsync', modelConnectionId, res);
          
          if (res.method === 'create' && !res.error) {
            this.add(res.model);
          }
          if (res.method === 'read' && !res.error) {
            this.add(res.models, {
              parse: true,
              merge: true
            });
          }
          
          return this.trigger('change');
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
      return model.trigger('error', model, resp, options);
    };
  };
})();
