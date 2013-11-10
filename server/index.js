var fs = require('fs');

module.exports = function(responderId, config, ss){
  var name = config && config.name || 'backbone';
  var responderName = 'ss-backbone-sync';
  if (!config.dontSendLibs) {
    var underscore = fs.readFileSync(__dirname + '/../vendor/underscore-min.js', 'utf8');
    var backbone = fs.readFileSync(__dirname + '/../vendor/backbone-min.js', 'utf8');
    ss.client.send('code', 'init', underscore);
    ss.client.send('code', 'init', backbone);
  }
  var backboneSync = fs.readFileSync(__dirname + '/../client/client.js', 'utf8');
  ss.client.send('code', 'init', backboneSync);
  
  var client_api_registration = fs.readFileSync(__dirname + '/../client/register.js', 'utf8');
  ss.client.send('mod', responderName, client_api_registration);
  
  ss.client.send('code', 'init', "require('" + responderName + "')(" + responderId + ", {}, require('socketstream').send(" + responderId + "));");
  
  return {
    name: name,
    interfaces: function(middleware) {
      return {
        websocket: function(msg, meta, send) {
          var e, handleError, model, req, request;
          request = require('./request')(ss, middleware, config);
          msg = JSON.parse(msg);
          model = msg.model;
          req = {
            modelName: msg.modelname,
            modelConnectionId: msg.modelConnectionId,
            cid: msg.cid,
            method: msg.method,
            params: msg.params,
            socketId: meta.socketId,
            clientIp: meta.clientIp,
            sessionId: meta.sessionId,
            transport: meta.transport,
            receivedAt: Date.now()
          };
          
          if (config.addModelToReq) {
            req.model = model;
          }
          
          handleError = function(e) {
            var message, obj;
            message = (meta.clientIp === '127.0.0.1') && e.stack || 'See server-side logs';
            obj = {
              id: msg.id,
              e: {
                message: message
              }
            };
            ss.log('↩'.red, meta.clientIp, meta.sessionId, req.method, e.message.red);
            if (e.stack) {
              ss.log(e.stack.split("\n").splice(1).join("\n"));
            }
            return;
          };
          try {
            return request(model, req, function(err, response) {
              response = response || {};
              response.id = msg.id;
              var timeTaken;
              if (err) {
                if(!response.e) {
                  response.e = {message: err};
                }
                handleError(err);
              }
              timeTaken = Date.now() - req.receivedAt;
              ss.log('↩'.green, meta.clientIp, meta.sessionId, req.method, ("(" + timeTaken + "ms)").grey);
              return send(JSON.stringify(response));
            });
          } catch (_error) {
            e = _error;
            return handleError(e);
          }
        }
      };
    }
  };
};
