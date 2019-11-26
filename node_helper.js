const { Control, Discovery }  = require('magic-home');
const path = require("path")
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
        console.log('Starting' + this.name + '...');
	this.Magic_data = []
	this.FB_status = []
	this.TV_status = []
	this.TV_source = []
	this.PC_status = []
	this.PC_name = []
	this.XBOX_status = []
	this.XBOX_app = []
	this.INTERNET_status = []
	this.INTERNET_ping = '0'
	this.FBS_status = []
	this.FBS_rate = '0'
	this.FBCrystal_display = [ 'Freebox Crystal' ]
	this.FBCrystal_rate = '0'
	this.FBCrystal_up = '0'
	this.FBCrystal_down= '0'

	this.HomeStatus = {
		"Light": {
			"active": false,
			"display": [],
			"status": [],
			"color": []
		},
		"Freebox_Player": {
			"active": false,
			"display" : [ 'Freebox Player' ],
			"status": []
		},
		"Freebox_Server": {
			"active": false,
			"display": [ 'Freebox Server' ],
			"status": [],
			"rate": null
		},
		"TV": {
			"active": false,
			"display": [],
			"status": [],
			"source": []
		},
		"PC": {
			"active": false,
			"display": [],
			"status": [],
			"name": []
		},
		"Xbox": {
			"active": false,
			"display": [],
			"status": [],
			"app": []
		},
		"Internet": {
			"active": false,
			"display" : [],
			"status": [],
			"ping": null
		}
	}

    },

    magic_query: function(ip,nb) {
	var query = new Control(ip);
	var self = this;
	query.queryState().then(state => {
		self.Magic_data[nb] = state;
	}, function (error) {
		console.log("[HomeStatus] MagicHome -- " + error);
		self.Magic_data[nb] = {
			on: false,
			color: { red: 0, green: 0, blue: 0 }
		}
	});
    },

    internet_Status: function() {
	var self = this;
	ping.promise.probe(self.config.Internet.scan).then(function (res) {
	    if (res.alive) {
		self.INTERNET_status = true;
		self.INTERNET_ping = res.time;
	    } else {
		self.INTERNET_status = false;
		self.INTERNET_ping = null;
	    }
        }).done();
    },

    tv_Status: function (ip,nb) {
	var self = this;
	ping.sys.probe(ip, function(isAlive){
		if (isAlive) {
			self.TV_status[nb] = true
		} else {
			self.TV_status[nb] = false
		}
    	});
    },

    tv_Source: function(cmd,nb) {
	var self = this;
        exec (cmd,(err, stdout, stderr)=>{
        	if (err == null) {
                	var res = JSON.parse(stdout.trim())
                	self.TV_source[nb] = res.id;
                } else {
			self.TV_source[nb] = null;
		}
        });
    },

    pc_Status: function (ip,nb) {
        var self = this;
        ping.sys.probe(ip, function(isAlive){
                if (isAlive) {
                        self.PC_status[nb] = true
                } else {
                        self.PC_status[nb] = false
                }
        });
    },

    pc_Name: function (ip,nb) {
	var self = this;
	var scan_pcname = "nmblookup -A " + ip + " | grep '<00>' | grep -v '<GROUP>' | awk '{print($1)}'"
	exec(scan_pcname,(err, stdout, stderr)=>{
                if (err == null) {
                        self.PC_name[nb] = stdout.trim()
                }
        });

    },

    xbox_Status: function (ip,nb) {
	var sgClient = Smartglass()
	var self = this;
	var deviceStatus = { current_app: false, connection_status: false };

	sgClient.connect(ip).then(function(){
		//console.log('Xbox succesfully connected!');
		self.XBOX_status[nb] = true;
	}, function(error){
		self.XBOX_status[nb] = false;
		self.XBOX_app[nb] = null;
	});

	if (self.XBOX_status[nb]) {
		//console.log("It's Turn on ... Go!");
		sgClient.on('_on_console_status', function(message, xbox, remote, smartglass){
			deviceStatus.connection_status = true
				if(message.packet_decoded.protected_payload.apps[0] != undefined){
					if(deviceStatus.current_app != message.packet_decoded.protected_payload.apps[0].aum_id){
						deviceStatus.current_app = message.packet_decoded.protected_payload.apps[0].aum_id;
						self.XBOX_app[nb] = deviceStatus.current_app;
					}
				}
		}.bind(deviceStatus));
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
	Freebox_Rate(token,id,domain,port).then( function(res) { 
		self.FBS_rate = res;
	}, function(err) { 
		console.log("[HomeStatus] Freebox Server Rate -- " + err) 
	} );
    },

    FBCrystal : function () {
	var self = this
	var up = "curl -s http://mafreebox.free.fr/pub/fbx_info.txt | grep -a ATM | awk '{print $5}'"
	var down = "curl -s http://mafreebox.free.fr/pub/fbx_info.txt | grep -a ATM | awk '{print $3}'"
	exec (down,(err, stdout, stderr)=>{
		if (err == null) {
			self.FBCrystal_down = stdout.trim()
			exec (up,(err, stdout, stderr)=>{
				if (err == null) {
					self.FBCrystal_up = stdout.trim()
					self.FBCrystal_rate = self.FBCrystal_down + "/" + self.FBCrystal_up
				}
			})
		} else {
			self.FBCrystal_down = '0'
			self.FBCrystal_up = '0'
		}
	})
    },

    updateDB: function(payload) {
	var self = this;
    	var dir = path.resolve(__dirname, "")
    	var cmd = "cd " + dir + "; cp xbox.db xbox.db.sav ; rm xbox.db ; git checkout xbox.db"
    	exec(cmd, (e,so,se)=>{
      		console.log("[HomeStatus] Fresh Update of the xbox database")
		self.sendSocketNotification("UPDATED", payload)
    	})
    },

    HomeScan: function() {
	var self = this;

	if (self.config.MagicHome.active) {
			for(var i in self.config.MagicHome.ip) this.magic_query(self.config.MagicHome.ip[i],i);
	}
	if (self.config.TV.active) {
		for(var i in self.config.TV.ip) {
			this.tv_Status(self.config.TV.ip[i],i);
			if (self.TV_status[i]) this.tv_Source(self.config.TV.command[i],i);
		}
	}
	if (self.config.PC.active) {
		for(var i in self.config.PC.ip) {
	    		this.pc_Status(self.config.PC.ip[i],i);
			if (self.PC_status[i]) this.pc_Name(self.config.PC.ip[i],i);
		}
	}
	if (self.config.Freebox_V6.active) {
		this.FBplayer_Status(self.config.Freebox_V6.player_ip);
	    	this.FBserver_Status(self.config.Freebox_V6.server_ip);
		if (self.config.Freebox_V6.rate.active && self.FBS_status) {
			this.FBserver_Rate(self.config.Freebox_V6.rate.app_token,self.config.Freebox_V6.rate.app_id,self.config.Freebox_V6.rate.api_domain,self.config.Freebox_V6.rate.https_port);
		} else {
			self.FBS_rate = 0;
		}
	}
	if (self.config.Freebox_Crystal.active) this.FBCrystal();

	if (self.config.Xbox.active && !self.config.Xbox.rest) for(var i in self.config.Xbox.ip) this.xbox_Status(self.config.Xbox.ip[i],i);
	if (self.config.Internet.active) this.internet_Status();
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'SCAN') {
	    var self = this;
	    if (payload) {
		this.config = payload;
		if (this.config.Xbox.active && !self.config.Xbox.rest) this.updateDB(true);
	    }

	    if (this.config.debug) console.log("[HomeStatus] Collecting devices informations ...");
	    this.HomeScan();

            setTimeout(() => {
		if (this.config.debug) {
			if (this.config.Internet.active) console.log("[HomeStatus] Module Internet: " + self.INTERNET_status + " - ping " + this.config.Internet.scan + " : " + self.INTERNET_ping + "ms");
			if (this.config.MagicHome.active) for(var i in self.config.MagicHome.ip) console.log("[HomeStatus] Module Magic Home: " + this.config.MagicHome.ip[i] + " -> " + this.config.MagicHome.display[i] + ": " + self.Magic_data[i].on + " - Color: " + JSON.stringify(self.Magic_data[i].color));
			if (this.config.Freebox_V6.active) {
				console.log("[HomeStatus] Module Freebox Player: " + this.config.Freebox_V6.player_ip + " -> " + self.FB_status);
				console.log("[HomeStatus] Module Freebox Server: " + this.config.Freebox_V6.server_ip + " -> " + self.FBS_status + " (" + self.FBS_rate +")");
			}
			if (this.config.Freebox_Crystal.active) console.log("[HomeStatus] Module Freebox Crystal: mafreebox.free.fr -> " + self.FBCrystal_rate);
			if (this.config.TV.active) {
				for(var i in self.config.TV.ip) console.log("[HomeStatus] Module TV: " + this.config.TV.ip[i] + " -> " + this.config.TV.display[i] + " : " + self.TV_status[i] + " (" + self.TV_source[i] + ")");
			}
			if (this.config.PC.active) {
					for(var i in self.config.PC.ip) console.log("[HomeStatus] Module PC: " + this.config.PC.ip[i] + " -> " + self.PC_name[i] + " : " + self.PC_status[i]);
			}
			if (this.config.Xbox.active && !this.config.Xbox.rest) {
					for(var i in self.config.Xbox.ip) console.log("[HomeStatus] Module XBOX: " + this.config.Xbox.ip[i] + " -> " + this.config.Xbox.display[i] + " : " + self.XBOX_status[i] + " (" + self.XBOX_app[i] + ")");
			}
			if (this.config.Xbox.rest) console.log("[HomeStatus] Module XBOX: Live by Rest Server")

			console.log("[HomeStatus] All informations collected !");

		}

		if (this.config.MagicHome.active) {
			this.HomeStatus.Light.active = true;
			this.HomeStatus.Light.display = this.config.MagicHome.display;
			for(var i in self.config.MagicHome.ip) {
				this.HomeStatus.Light.status[i] = self.Magic_data[i].on;
				this.HomeStatus.Light.color[i] = self.Magic_data[i].color;
			}
		}
		if (this.config.Freebox_V6.active) {
			// Freebox Player
			this.HomeStatus.Freebox_Player.active = true;
			this.HomeStatus.Freebox_Player.status[0] = self.FB_status;
			// Freebox Server
			this.HomeStatus.Freebox_Server.active = true;
			this.HomeStatus.Freebox_Server.status[0] = self.FBS_status;
			this.HomeStatus.Freebox_Server.rate = self.FBS_rate;
		}
		if (this.config.Freebox_Crystal.active) {
			// on envoi les données vers le Freebox Server
			if (self.FBCrystal_down > 0) self.FBCrystal_status = true;
			else self.FBCrystal_status = false;
			this.HomeStatus.Freebox_Server.active = true;
			this.HomeStatus.Freebox_Server.status[0] = self.FBCrystal_status;
			this.HomeStatus.Freebox_Server.rate = self.FBCrystal_rate;
			this.HomeStatus.Freebox_Server.display = self.FBCrystal_display
		}
		if (this.config.TV.active) {
			this.HomeStatus.TV.active = true;
			this.HomeStatus.TV.display = this.config.TV.display;
			this.HomeStatus.TV.status = self.TV_status;
			this.HomeStatus.TV.source = self.TV_source;
		}
		if (this.config.PC.active) {
			this.HomeStatus.PC.active = true;
			this.HomeStatus.PC.display= this.config.PC.display;
			this.HomeStatus.PC.status = self.PC_status;
			this.HomeStatus.PC.name = self.PC_name;
		}
		if (this.config.Xbox.active) {
			this.HomeStatus.Xbox.active = true;
			this.HomeStatus.Xbox.display = this.config.Xbox.display;
			if (!this.config.Xbox.rest) {
				this.HomeStatus.Xbox.status = self.XBOX_status;
				this.HomeStatus.Xbox.app = self.XBOX_app;
			}
		}
		if (this.config.Internet.active) {
			this.HomeStatus.Internet.active = true;
			this.HomeStatus.Internet.display = this.config.Internet.display;
			this.HomeStatus.Internet.status[0] = self.INTERNET_status;
			this.HomeStatus.Internet.ping = self.INTERNET_ping;
		}
		//console.log(this.HomeStatus)
		self.sendSocketNotification("RESULT", this.HomeStatus);
            } , 4000);
        }
	if (notification === 'UpdateDB') this.updateDB(payload);
	if (notification === 'LOG') console.log("[HomeStatus] Xbox Database: Please ask update of the title " + payload)
	if (notification === 'UPDATED_OK') console.log(payload)

	// update via Rest Server (MMM-Xbox)
	if (notification === 'UPDATE_XBSTATUS') this.HomeStatus.Xbox.status[0] = payload
	if (notification === 'UPDATE_XBNAME') this.HomeStatus.Xbox.app[0] = payload
    },

});
