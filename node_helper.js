const { Control, Discovery }  = require('magic-home');
var request = require('request');
var NodeHelper = require('node_helper');
var ping = require('ping');
var Smartglass = require('xbox-smartglass-core-node');
const { Freebox } = require("freebox");
var exec = require('child_process').exec


async function Freebox_Rate(token,id,domain,port) {
	var rate;
	var output;
  	const freebox = new Freebox({
    		app_token: token,
    		app_id: id,
    		api_domain: domain,
    		https_port: port,
    		api_base_url: "/api/",
    		api_version: "6.0"
  	});

  	// Open a session
  	await freebox.login();

  	// Get the current DSL rate
  	const response = await freebox.request({
    		method: "GET",
    		url: "connection/xdsl",
  	});

	rate = response.data.result.down.rate + "/" + response.data.result.up.rate
	output = rate;

  	// Close the current session
  	// https://dev.freebox.fr/sdk/os/login/#closing-the-current-session
  	await freebox.logout();
 	return output;
};

module.exports = NodeHelper.create({

    start: function() {
        console.log('Démarrage du node_helper pour le module ' + this.name + '...');
	this.Magic_data = ''
	this.FB_status = false
	this.TV_status = false
	this.TV_source = null
	this.PC_status = false
	this.PC_name = null
	this.XBOX_status = false
	this.XBOX_app = null
	this.INTERNET_status = false
	this.INTERNET_ping = '0'
	this.FBS_status = false
	this.FBS_rate = '0'

	this.HomeStatus = {
		"Light": {
			"active": false,
			"display": null,
			"status": null,
			"color": null
		},
		"Freebox_Player": {
			"active": false,
			"status": null
		},
		"Freebox_Server": {
			"active": false,
			"status": null,
			"rate": null
		},
		"TV": {
			"active": false,
			"status": null,
			"source": null
		},
		"PC": {
			"active": false,
			"status": null,
			"name": null
		},
		"Xbox": {
			"active": false,
			"display": null,
			"status": null,
			"app": null
		},
		"Internet": {
			"active": false,
			"status": null,
			"ping": null
		}
	}

    },

    magic_query: function(ip) {
	var query = new Control(ip);
	var self = this;
	query.queryState().then(state => {
		self.Magic_data = state;
	}, function (error) {
		console.log("[HomeStatus] MagicHome -- " + error);
		self.Magic_data = "Erreur !"
	});
    },

    internet_Status: function() {
	var self = this;
	ping.promise.probe("google.fr").then(function (res) {
	    if (res.alive) {
		self.INTERNET_status = true;
		self.INTERNET_ping = res.time;
	    } else {
		self.INTERNET_status = false;
		self.INTERNET_ping = null;
	    }
        }).done();
    },

    tv_Status: function (ip) {
	var self = this;
	ping.sys.probe(ip, function(isAlive){
		if (isAlive) {
			self.TV_status = true
		} else {
			self.TV_status = false
		}
    	});
    },

    tv_Source: function(cmd) {
	var self = this;
        exec (cmd,(err, stdout, stderr)=>{
        	if (err == null) {
                	var res = JSON.parse(stdout.trim())
                	self.TV_source = res.id;
                } else {
			self.TV_source = null;
		}
        });
    },

    pc_Status: function (ip) {
        var self = this;
        ping.sys.probe(ip, function(isAlive){
                if (isAlive) {
                        self.PC_status = true
                } else {
                        self.PC_status = false
                }
        });
    },

    pc_Name: function (ip) {
	var self = this;
	var scan_pcname = "nmblookup -A " + ip + " | grep '<00>' | grep -v '<GROUP>' | awk '{print($1)}'"
	exec(scan_pcname,(err, stdout, stderr)=>{
                if (err == null) {
                        self.PC_name = stdout.trim()
                }
        });

    },

    xbox_Status: function (ip) {
	var sgClient = Smartglass()
	var self = this;
	var deviceStatus = { current_app: false, connection_status: false };

	sgClient.connect(ip).then(function(){
		//console.log('Xbox succesfully connected!');
		self.XBOX_status = true;
	}, function(error){
		self.XBOX_status = false;
		self.XBOX_app = null;
	});
	if (self.XBOX_status) {
		//console.log("It's Turn on ... Go!");
		sgClient.on('_on_console_status', function(message, xbox, remote, smartglass){
			deviceStatus.connection_status = true
				if(message.packet_decoded.protected_payload.apps[0] != undefined){
					if(deviceStatus.current_app != message.packet_decoded.protected_payload.apps[0].aum_id){
						deviceStatus.current_app = message.packet_decoded.protected_payload.apps[0].aum_id;
						self.XBOX_app = deviceStatus.current_app;
						self.xbox_Game();
					}
				}
		}.bind(deviceStatus));
	}
    },

    xbox_Game: function() { // !!!! temporary resolve name of the game !!!!
	var self = this;
	if(self.XBOX_app) {
                        var str = self.XBOX_app
                        var split = str.split('!');
                        //console.log("!!!!!!!!! " + split[0] + " --- " + split[1]);
                        var res = split[1];
                        if (res == "Xbox.Dashboard.Application" ) res = "Accueil"
                        self.XBOX_app = res;
                }
    },

    FBplayer_Status: function(ip) {
	var self = this;
	request('http://' + ip + ':54243/device.xml', function (error, response, body) {
		if (error) {
			self.FB_status= false;
		} else {
			if(response.statusCode == 200) {
				self.FB_status = true;
  			}
		}
   	})
    },

    FBserver_Status: function (ip) {
        var self = this;
        ping.sys.probe(ip, function(isAlive){
                if (isAlive) {
                        self.FBS_status = true
                } else {
                        self.FBS_status = false
                }
        });
    },

    FBserver_Rate: function (token,id,domain,port) {
	var self = this;
	Freebox_Rate(token,id,domain,port).then(function(res) {
		self.FBS_rate = res;
	});
    },

    HomeScan: function() {
	var self = this;
	if (self.config.MagicHome.active) this.magic_query(self.config.MagicHome.ip);
	if (self.config.TV.active) {
		this.tv_Status(self.config.TV.ip);
		if (self.TV_status) this.tv_Source(self.config.TV.command);
	}
	if (self.config.PC.active) {
	    	this.pc_Status(self.config.PC.ip);
		if (self.PC_status) this.pc_Name(self.config.PC.ip);
	}
	if (self.config.Freebox.active) {
		this.FBplayer_Status(self.config.Freebox.player_ip);
	    	this.FBserver_Status(self.config.Freebox.server_ip);
		if (self.config.Freebox.rate.active && self.FBS_status) {
			this.FBserver_Rate(self.config.Freebox.rate.app_token,self.config.Freebox.rate.app_id,self.config.Freebox.rate.api_domain,self.config.Freebox.rate.https_port);
		} else {
			self.FBS_rate = 0;
		}
	}
	if (self.config.Xbox.active) this.xbox_Status(self.config.Xbox.ip);
	if (self.config.Internet.active) this.internet_Status();
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'SCAN') {
	    var self = this;
	    if (payload) this.config = payload;

	    if (this.config.debug) console.log("[HomeStatus] Collecting devices informations ...");
	    this.HomeScan();

            setTimeout(() => {
		if (this.config.debug) {
			if (this.config.Internet.active) console.log("[HomeStatus] Module Internet: " + self.INTERNET_status + " - ping google.fr : " + self.INTERNET_ping + "ms");
			if (this.config.MagicHome.active) console.log("[HomeStatus] Module Magic Home: " + this.config.MagicHome.ip + " -> " + this.config.MagicHome.display + ": " + self.Magic_data.on + " - Color: " + JSON.stringify(self.Magic_data.color));
			if (this.config.Freebox.active) {
				console.log("[HomeStatus] Module Freebox Player: " + this.config.Freebox.player_ip + " -> " + self.FB_status);
				console.log("[HomeStatus] Module Freebox Server: " + this.config.Freebox.server_ip + " -> " + self.FBS_status + " (" + self.FBS_rate +")");
			}
			if (this.config.TV.active) console.log("[HomeStatus] Module TV: " + this.config.TV.ip + " -> " + self.TV_status + " (" + self.TV_source + ")");
			if (this.config.PC.active) console.log("[HomeStatus] Module PC: " + this.config.PC.ip + " -> " + self.PC_name + " : " + self.PC_status);
			if (this.config.Xbox.active) console.log("[HomeStatus] Module XBOX: " + this.config.Xbox.ip + " -> " + this.config.Xbox.display + " : " + self.XBOX_status + " (" + self.XBOX_app + ")");
			console.log("[HomeStatus] All informations collected !");
		}

		if (this.config.MagicHome.active) {
			this.HomeStatus.Light.active = true;
			this.HomeStatus.Light.display = this.config.MagicHome.display;
			this.HomeStatus.Light.status = self.Magic_data.on;
			this.HomeStatus.Light.color = self.Magic_data.color;
		}
		if (this.config.Freebox.active) {
			this.HomeStatus.Freebox_Player.active = true;
			this.HomeStatus.Freebox_Player.status = self.FB_status;
			this.HomeStatus.Freebox_Server.active = true;
			this.HomeStatus.Freebox_Server.status = self.FBS_status;
			this.HomeStatus.Freebox_Server.rate = self.FBS_rate;
		}
		if (this.config.TV.active) {
			this.HomeStatus.TV.active = true;
			this.HomeStatus.TV.status = self.TV_status;
			this.HomeStatus.TV.source = self.TV_source;
		}
		if (this.config.PC.active) {
			this.HomeStatus.PC.active = true;
			this.HomeStatus.PC.status = self.PC_status;
			this.HomeStatus.PC.name = self.PC_name;
		}
		if (this.config.Xbox.active) {
			this.HomeStatus.Xbox.active = true;
			this.HomeStatus.Xbox.display = this.config.Xbox.display
			this.HomeStatus.Xbox.status = self.XBOX_status;
			this.HomeStatus.Xbox.app = self.XBOX_app;
		}
		if (this.config.Internet.active) {
			this.HomeStatus.Internet.active = true;
			this.HomeStatus.Internet.status = self.INTERNET_status;
			this.HomeStatus.Internet.ping = self.INTERNET_ping;
		}
		self.sendSocketNotification("RESULT", this.HomeStatus);
            } , 4000);
        }
    }
});
