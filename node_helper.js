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

  await freebox.login();

  const response = await freebox.request({
    method: "GET",
    url: "connection/xdsl",
  });

  rate = response.data.result.down.rate + "/" + response.data.result.up.rate
  output = rate;

  await freebox.logout();
  return output;
};

module.exports = NodeHelper.create({

    start: function() {
      console.log('Starting ' + this.name + '...');

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

/* MaGicHome Check */
    magic_query: function(ip,nb) {
      var query = new Control(ip);
      var self = this;
      query.queryState().then(state => {
        self.HomeStatus.Light.status[nb] = state.on
        self.HomeStatus.Light.color[nb] = state.color
        self.sendInfo("LIGHT", self.HomeStatus.Light)
      }, function (error) {
        console.log("[HomeStatus] MagicHome -- " + error);
        self.HomeStatus.Light.status[nb] = false
        self.HomeStatus.Light.color[nb] = { red: 0, green :0, blue: 0}
        self.sendInfo("LIGHT", self.HomeStatus.Light)
      });
    },

/* internet check */
    internet_Status: function() {
        var self = this;
        ping.promise.probe(self.config.Internet.scan).then(function (res) {
          if (res.alive) {
            self.HomeStatus.Internet.status[0] = true
            self.HomeStatus.Internet.ping = res.time
          } else {
            self.HomeStatus.Internet.status[0] = false
            self.HomeStatus.Internet.ping = null
          }
          self.sendInfo("INTERNET", self.HomeStatus.Internet)
        });
    },

/* TV check */
    tv_Status: function (ip,nb) {
      var self = this
      ping.promise.probe(ip).then(function(res){
        if (res.alive) {
          self.HomeStatus.TV.status[nb] = true
          exec (self.config.TV.command[nb],(err, stdout, stderr)=>{
            if (err == null) {
              var res = JSON.parse(stdout)
              self.HomeStatus.TV.source[nb] = res.id
            } else {
              self.HomeStatus.TV.source[nb] = null
            }
            self.sendInfo("TV", self.HomeStatus.TV)
          })
        } else {
          self.HomeStatus.TV.status[nb] = false
          self.HomeStatus.TV.source[nb] = false
          self.sendInfo("TV", self.HomeStatus.TV)
        }
      })
    },

/* PC check */
    pc_Status: function (ip,nb) {
      var self = this;
      var scan_pcname = "nmblookup -A " + ip + " | grep '<00>' | grep -v '<GROUP>' | awk '{print($1)}'"
      ping.promise.probe(ip).then(function(res){
        if (res.alive) {
          self.HomeStatus.PC.status[nb] = true
          exec (scan_pcname,(err, stdout, stderr)=>{
            if (err == null) {
              self.HomeStatus.PC.name[nb] = stdout.trim()
            } else {
              self.HomeStatus.PC.name[nb] = null
            }
            self.sendInfo("PC", self.HomeStatus.PC)
          })
        } else {
          self.HomeStatus.PC.status[nb] = false
          self.HomeStatus.PC.name[nb] = null
          self.sendInfo("PC", self.HomeStatus.PC)
        }
      });
    },

/* check Xbox */
    xbox_Status: function (ip,nb) {
      var sgClient = Smartglass()
      var self = this;
      var deviceStatus = { current_app: false, connection_status: false };

      sgClient.connect(ip).then(function(){
	self.HomeStatus.Xbox.status[nb] = true;
      }, function(error){
        self.HomeStatus.Xbox.status[nb] = false
        self.HomeStatus.Xbox.app[nb] = null
	self.sendInfo("XBOX", self.HomeStatus.Xbox)
      });

      sgClient.on('_on_console_status', function(message, xbox, remote, smartglass){
        deviceStatus.connection_status = true
        if(message.packet_decoded.protected_payload.apps[0] != undefined){
          if(deviceStatus.current_app != message.packet_decoded.protected_payload.apps[0].aum_id){
            deviceStatus.current_app = message.packet_decoded.protected_payload.apps[0].aum_id;
            self.HomeStatus.Xbox.app[nb] = deviceStatus.current_app;
            self.sendInfo("XBOX", self.HomeStatus.Xbox)
          }
        }
      }.bind(deviceStatus));

      sgClient.on('_on_console_status', function(message, xbox, remote, smartglass){
        deviceStatus.connection_status = false
        smartglass.disconnect()
      }.bind(deviceStatus));
    },

/* check Freebox Player */
    FBplayer_Status: function(ip) {
      var self = this
      request('http://' + ip + ':54243/device.xml', function (error, response, body) {
        if (error) self.HomeStatus.Freebox_Player.status[0] = false;
        else {
          if (response.statusCode == 200) self.HomeStatus.Freebox_Player.status[0] = true;
        }
        self.sendInfo("PLAYER", self.HomeStatus.Freebox_Player)
      })
    },

/* check Freebox Server */
    FBserver_Status: function (ip,token,id,domain,port) {
      var self = this;
      ping.promise.probe(ip).then(function (res) {
        if (res.alive) {
          self.HomeStatus.Freebox_Server.status[0] = true
          Freebox_Rate(token,id,domain,port).then( function(res) {
            self.HomeStatus.Freebox_Server.rate = res
          }, function(err) {
            console.log("[HomeStatus] Freebox Server Rate -- " + err)
          })
        } else self.HomeStatus.Freebox_Server.status[0] = false
        self.sendInfo("SERVER", self.HomeStatus.Freebox_Server)
      });
    },

/* update Xbox DB */
    updateDB: function(payload) {
	var self = this;
    	var dir = path.resolve(__dirname, "")
    	var cmd = "cd " + dir + "; cp xbox.db xbox.db.sav ; rm xbox.db ; git checkout xbox.db"
    	exec(cmd, (e,so,se)=>{
      		console.log("[HomeStatus] Fresh Update of the xbox database")
		self.sendSocketNotification("UPDATED", payload)
    	})
    },

/* Scan All IOT */
    HomeScan: function() {
      var self = this;
      if (this.config.MagicHome.active) {
        for(var i in this.config.MagicHome.ip) this.magic_query(self.config.MagicHome.ip[i],i)
      }
      if (this.config.TV.active) {
        for(var i in this.config.TV.ip) this.tv_Status(self.config.TV.ip[i],i)
      }
      if (this.config.PC.active) {
        for(var i in self.config.PC.ip) this.pc_Status(this.config.PC.ip[i],i)
      }
      if (this.config.Freebox_V6.active) {
        this.FBplayer_Status(this.config.Freebox_V6.player_ip)
        this.FBserver_Status(this.config.Freebox_V6.server_ip, this.config.Freebox_V6.rate.app_token,this.config.Freebox_V6.rate.app_id,this.config.Freebox_V6.rate.api_domain,this.config.Freebox_V6.rate.https_port);
      }
      if (this.config.Xbox.active && !this.config.Xbox.rest) for(var i in this.config.Xbox.ip) this.xbox_Status(this.config.Xbox.ip[i],i);
      if (this.config.Internet.active) this.internet_Status();
    },

    initialize: function() {
      if (this.config.MagicHome.active) {
        this.HomeStatus.Light.active = true
        this.HomeStatus.Light.display = this.config.MagicHome.display
      }
      if (this.config.TV.active) {
        this.HomeStatus.TV.active = true;
        this.HomeStatus.TV.display = this.config.TV.display
      }
      if (this.config.PC.active) {
        this.HomeStatus.PC.active = true;
        this.HomeStatus.PC.display = this.config.PC.display
      }
      if (this.config.Freebox_V6.active) {
	this.HomeStatus.Freebox_Player.active = true
	this.HomeStatus.Freebox_Server.active = true
      }
      if (this.config.Xbox.active) {
	this.HomeStatus.Xbox.active = true
        this.HomeStatus.Xbox.display = this.config.Xbox.display
      }
      if (this.config.Internet.active) {
        this.HomeStatus.Internet.active = true
        this.HomeStatus.Internet.display = this.config.Internet.display
      }
      if (this.config.Xbox.active && !this.config.Xbox.rest) this.updateDB(true);

      this.sendInfo("INITIALIZED", this.HomeStatus);
    },

    socketNotificationReceived: function(notification, payload) {
      switch(notification) {
        case "INIT":
          this.config = payload
          this.initialize()
          break
        case "SCAN":
          this.HomeScan()
          break
        case "UpdateDB":
          this.updateDB(payload)
          break
        case "LOG":
          console.log("[HomeStatus] Xbox Database: Please ask update of the title " + payload)
          break
        case "UPDATED_OK":
          console.log(payload)
          break
      }
    },

    sendInfo: function (module, payload) {
      //console.log("module: " + module + " payload: ", payload)
      this.sendSocketNotification(module, payload);
    }
});
