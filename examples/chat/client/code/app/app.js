/* QUICK CHAT DEMO */
var modelName = 'message';
var modelConnectionId = 'quickChat';

var SyncModel = syncedModel.extend({
    idAttribute: "_id",
    defaults: {
      message: 'new message',
      time: new Date()
    }
  }, {
    modelname: modelName,
    modelConnectionId: modelConnectionId
});

var SyncCollection = syncedCollection.extend({
    model: SyncModel
  }, {
    modelname: modelName,
    modelConnectionId: modelConnectionId
});

var syncCollection = new SyncCollection();
syncCollection.on('all', function(event){
  console.log('event', event);
});
syncCollection.on('add', function(model){
  console.log('add', model);
  addNewMessage(model);
});

syncCollection.fetch({
  error: function(model, resp, options){
    console.log('error: fetch', model, resp, options);
  },
  success: function(model, resp, options){ 
    console.log('success: fetch', model, resp, options);
  }
});

// Show the chat form and bind to the submit action
$('#demo').on('submit', function() {

  // Grab the message from the text box
  var text = $('#myMessage').val();
  var time = timestamp();
  
  syncCollection.create({
      message: text,
      time: time
    },
    {
      error: function(model, resp, options){ 
        console.log('error: create', model, resp, options);
        // alert('Oops! Unable to send message');
        console.log('Oops! Unable to send message');
      },
      success: function(model, resp, options){
        console.log('success: create', model, resp, options);
        $('#myMessage').val('');
      }
  });
});

// log all socket stream events
ss.event.onAny(function(data) {
  return console.log('EVENT', ss.event.event, data);
});

// Private functions
var addNewMessage = function(model) {
  // Example of using the Hogan Template in client/templates/chat/message.jade to generate HTML for each message
  var html = ss.tmpl['chat-message'].render(model.attributes);

  // Append it to the #chatlog div and show effect
  return $(html).hide().appendTo('#chatlog').slideDown();
};

var timestamp = function() {
  var d = new Date();
  return d.getHours() + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
};

var pad2 = function(number) {
  return (number < 10 ? '0' : '') + number;
};

var valid = function(text) {
  return text && text.length > 0;
};