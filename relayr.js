var request = require("request");
var pubnub = require("pubnub");

var relayr = module.exports = {};

var subscriptions = [];
var connected = [];
var listeners = [];

function contains(a, obj) {
    var i = a.length;
    while (i--) {
       if (a[i] === obj) {
           return true;
       }
    }
    return false;
}

relayr.connect = function(options){

	connected.push(options.dev_id);

	getPubNubKeys(options,function(err,data){

		var pubnubkeys = {
			windowing : 2000	
		};

	pubnubkeys.cipher_key = data.cipherKey;
	pubnubkeys.auth_key = data.authKey;
	pubnubkeys.subscribe_key = data.subscribeKey;
	pubnubkeys.channel = data.channel;
	
	pubnubkeys.deviceid = options.dev_id;
	listen(pubnubkeys);

	});

};

relayr.listen = function(listener){
	if(!contains(listeners,listener))
		listeners.push(listener);
};

var getPubNubKeys = function(relayrkeys,callback){

	var app_id = relayrkeys.app_id;
	var dev_id = relayrkeys.dev_id;
	var token = relayrkeys.token;

	var options = {
		url:"https://api.relayr.io/devices/"+dev_id+"/apps/"+app_id,
		headers: {'Authorization': 'Bearer ' + token},
	}

	request.post(options,function(err,data){
		var pubnubkeys = {};
		if(!err) {
			try {
				pubnubkeys = JSON.parse(data.body);
			} catch(ex) {
				err = ex;
			}
		}
		callback(err,pubnubkeys);
	});

};

var listen = function(pubnubkeys) {

	var connection = pubnub.init(pubnubkeys);

	connection.unsubscribe({
		channel : pubnubkeys.channel,
	});

	connection.subscribe({
		channel  : pubnubkeys.channel,
		 message : function(command) {
        // Unsubscribe Command
        if (command.type == 'unsubscribe')
            return pubnub.unsubscribe({
                channel : command.channel
            });
    	},
		callback : function(message) {
			var err = null;
			try {
				message = JSON.parse(message);
			} catch (ex) {
				err = ex;
			}
			listeners.forEach(function(listener, index){
				if(connected[index] == pubnubkeys.deviceid){
					listener(err,message,connected[index]);
				}
			});
		},
		error:function(err) {
			//console.log("Relayr Error!");
			//console.log(err);
		},
		restore: false,
	});

	console.log(pubnubkeys.channel);
	subscriptions.push([connection, pubnubkeys.channel]);

};

relayr.unsubscribeAll = function(){
	
	subscriptions.forEach(function(sub,index){
		sub[0].unsubscribe({
	    channel : sub[1],
	    restore: false });

	    sub[0].subscribe({channel : sub[1]+1});
	});

	listeners = [];
	connected = [];
	subscriptions = [];
}