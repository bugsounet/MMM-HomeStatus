Module.register("MMM-HomeStatus", {

	defaults: {
		delay: 10 * 1000,
		debug: false,
		MagicHome: {
			active: false,
			display: [],
			ip: []
		},
		Freebox_V6: {
			active: false,
			player_ip: "",
			server_ip: "",
			rate : {
				active : false,
				app_token: "",
				app_id: "",
				api_domain: "",
				https_port: 0
			}
		},
		Freebox_Crystal: {
			active: false,
		},
		TV: {
			active: false,
			display: [],
			ip: [],
			command: []
		},
		PC: {
			active: false,
			display: [],
			ip: []
		},
		Xbox: {
			active: false,
			rest: false,
			display: [],
			ip: []
		},
		Internet: {
			active: true,
			scan: "google.fr",
			display: [ "Internet" ]
		}
	},

  	configAssignment : function (result) {
    		var stack = Array.prototype.slice.call(arguments, 1)
    		var item
   		var key
    		while (stack.length) {
      			item = stack.shift()
      			for (key in item) {
        			if (item.hasOwnProperty(key)) {
          				if (
            					typeof result[key] === "object"
            					&& result[key]
            					&& Object.prototype.toString.call(result[key]) !== "[object Array]"
          				) {
            					if (typeof item[key] === "object" && item[key] !== null) {
              						result[key] = this.configAssignment({}, result[key], item[key])
            					} else {
              						result[key] = item[key]
            					}
          				} else {
            					result[key] = item[key]
          				}
        			}
      			}
    		}
    		return result
  	},

	start: function () {
		this.config = this.configAssignment({}, this.defaults, this.config);
		this.Init = false;
		this.HomeStatus = {};
		this.XboxDB = {};
		this.VersionDB = ""
	},

	notificationReceived: function (notification, payload) {

        	if (notification === 'DOM_OBJECTS_CREATED') {
            		//DOM creation complete, let's start the module
            		this.sendSocketNotification("SCAN", this.config);
        	}
		if (notification === 'XBOXDB_UPDATE') {
			// demande une nouvelle base de donnée depuis GitHub
			this.sendSocketNotification("UpdateDB", false);
		}
		if (this.config.Xbox.rest) {
			if (notification === "XBOX_ACTIVE") {
				this.sendSocketNotification("UPDATE_XBSTATUS", true);
				this.HomeStatus.Xbox.status[0] = true;
				this.updateDom();
			}
			if (notification === "XBOX_INACTIVE") {
				this.sendSocketNotification("UPDATE_XBSTATUS", false);
				this.sendSocketNotification("UPDATE_XBNAME", "");
				this.HomeStatus.Xbox.status[0] = false;
				this.HomeStatus.Xbox.app[0] = ""
				this.updateDom();
                	}
			if (notification === "XBOX_NAME") {
				this.sendSocketNotification("UPDATE_XBNAME", payload);
				this.HomeStatus.Xbox.app[0] = payload;
				this.updateDom();
                	}
		}
	},
	socketNotificationReceived: function (notification, payload) {
		if (notification === "RESULT") {
			this.Init = true;
			this.HomeStatus = payload;
			this.IntervalScanDevice();
		}
		if (notification === "UPDATED") {
			// Mise a jour effectué -> recharge la nouvelle base de donnée Xbox
			this.XboxDBReload();
			if (payload) this.IntervalScanDB(); // lance une tempo de scan si le payload est sur true
		}
	},

        IntervalScanDevice: function () {
        	var self = this;
			clearInterval(self.interval);
			self.counter = this.config.delay;
			self.updateDom();

        	self.interval = setInterval(function () {
            		self.counter -= 1000;
            		if (self.counter <= 0) {
				clearInterval(self.interval);
				self.sendSocketNotification("SCAN", false);
            		}
        	}, 1000);
        },

        IntervalScanDB: function () {
                var self = this;
                        clearInterval(self.intervalDB);
                        self.counterDB = 4 * 60 * 60 * 1000 // mise a jour tous les 4 heures

                self.intervalDB = setInterval(function () {
                        self.counterDB -= 1000;
                        if (self.counterDB <= 0) {
                                clearInterval(self.intervalDB);
                                self.sendSocketNotification("UpdateDB",true);
                        }
                }, 1000);
        },

	getDom: function () {
		var self = this;
		var data = self.HomeStatus;

		var wrapper = document.createElement("div")

		if (!this.Init) {
			wrapper.className = "HS_LOADING"
			wrapper.innerHTML = this.translate("LOADING");
			return wrapper
		}
		wrapper.innerHTML = ""

		// table building
		var dataTable = document.createElement("table")
		dataTable.className = "small data"


		if (Object.keys(data).length > 0) {
			for (let [item, value] of Object.entries(data)) { // search in all Modules entry
			   var activate = value.active
			   var display = value.display
			   var status = value.status
			   var color = value.color
			   var ping = value.ping
			   var rate = value.rate
			   var name = value.name
			   var app = value.app
			   var source = value.source
			   var new_title = false;

			   for (var i in display) { // search in module (multi display)
			   	var StatusRow = document.createElement("tr")

				if (activate) { // --> Display only if module actived
					// item Cell
					var ItemCell = document.createElement("td")
					ItemCell.className = "HS_ITEM"
					ItemCell.innerHTML = display[i] // ? display[i] : item.replace(/_/gi, ' ')
					StatusRow.appendChild(ItemCell)

					// Infos Cell
					var InfoCell = document.createElement("td")
					InfoCell.className = "HS_INFO"
					InfoCell.style.width = "200px"
					if (status[i]) { // device is on ?
						if (color && color[i]) { // MagicHome Color
							var rgb = "rgb(" + color[i].red + "," + color[i].green + "," + color[i].blue + ")"
							InfoCell.style.backgroundColor = rgb
							InfoCell.style.borderRadius = "25px"
						}
						if (ping && ping != null) InfoCell.innerHTML = ping + " ms" // ping internet
						if (rate && rate !=0) InfoCell.innerHTML = rate + " kbit/s"// rate Freebox
						if (name && name[i] && name[i] != null) InfoCell.innerHTML = name[i] // name PC
						if (app && app[i] && app[i] != null) {
							if (!self.config.Xbox.rest) {
								for ( var nb in self.XboxDB ) { // search title app in xbox db
									if(self.XboxDB[nb][0] == app[i]) {
										InfoCell.innerHTML = this.translate(self.XboxDB[nb][1])
										new_title = true;
									}
								}
								if(!new_title) {
									InfoCell.innerHTML = "-!!!- Titre Inconnu";
									self.sendSocketNotification("LOG", app[i]); // ? better place in console node_helper
								}
							} else InfoCell.innerHTML = app[i]
						}
						if (source && source[i] && source[i] != null) InfoCell.innerHTML = source[i] // source TV
					}
					StatusRow.appendChild(InfoCell)

					// Need Space ?
					var SpaceCell = document.createElement("td")
					SpaceCell.style.width = "15px"
					StatusRow.appendChild(SpaceCell)

					//switch Cell
					var StatusCell = document.createElement("td")
					StatusCell.className = "switch"

					// Create switch
					var button = document.createElement("INPUT")
					button.id = "switched"
					button.type = "checkbox"
					button.className = "switch-toggle switch-round";
					button.checked = status[i]
					button.disabled = true

					var label = document.createElement('label')
					label.htmlFor = "swithed"

					StatusCell.appendChild(button)
					StatusCell.appendChild(label)

					StatusRow.appendChild(StatusCell)

					//end table
					dataTable.appendChild(StatusRow)

					wrapper.appendChild(dataTable)
				}
			   }
			}
			return wrapper
		}
	},

  	getTranslations: function() {
    		return {
      			fr: "translations/fr.json",
    		}
  	},

    	getScripts: function () {
        	return ["moment.js"];
	},

	getStyles: function() {
		return ["MMM-HomeStatus.css"]
  },

  XboxDBReload: function () {
    var self = this;
    self.XboxDB = {};
    this.readDB();
  },

 // for read xbox.db i use eouia MMM-Timetable Code :) 

  readDB: function () {
    var self = this;
    var db = "/modules/MMM-HomeStatus/xbox.db"
    var xmlHttp = new XMLHttpRequest()
    xmlHttp.onreadystatechange = () => {
      var res = []
      if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
        var lines = xmlHttp.responseText.split(/[\r\n]+/)
        if (lines.length > 0) {
          for(var i = 0; i < lines.length; i++) {
            var line = lines[i]
            if (line != "") {
              var a = this.DBToArray(line, ",")
              res.push(a[0])
            }
          }
          self.XboxDB = res;
	  self.VersionDB = self.XboxDB[0][1] + "." + self.XboxDB[0][2]
	  this.sendSocketNotification("UPDATED_OK", "[HomeStatus] Title Loaded in Xbox Database : " + (self.XboxDB.length-3) + " -- Version : " + self.VersionDB)
        }
      }
    }
    xmlHttp.open("GET", db, true)
    xmlHttp.send(null)
  },

  DBToArray: function (strData, strDelimiter){
    strDelimiter = (strDelimiter || ",")
    var objPattern = new RegExp(
      (
        "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
        "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
        "([^\"\\" + strDelimiter + "\\r\\n]*))"
      ),
      "gi"
      )
    var arrData = [[]]
    var arrMatches = null
    while (arrMatches = objPattern.exec( strData )){
      var strMatchedDelimiter = arrMatches[ 1 ]
      if (
        strMatchedDelimiter.length &&
        (strMatchedDelimiter != strDelimiter)
        ){
        arrData.push( [] )
      }
      if (arrMatches[ 2 ]){
        var strMatchedValue = arrMatches[ 2 ].replace(
          new RegExp( "\"\"", "g" ),
          "\""
          )
      } else {
        var strMatchedValue = arrMatches[ 3 ]
      }
      arrData[ arrData.length - 1 ].push( strMatchedValue )
    }
    return( arrData )
  },

  // TelegramBot Command

  getCommands: function () {
    return [
      {
        command: "updatedb",
        callback: "telegramCommand",
        description: "Vous pouvez forcer la mise à jour de la base de donnée du module Xbox avec cette commande."
      },
      {
	command: "homestatus",
	callback: "telegramCommand",
	description: "Affiche l'état des péripheriques IOT"
      },
    ]
  },

  telegramCommand: function(command, handler) {
    if (command == "updatedb") {
	if (this.config.Xbox.active && !this.config.Xbox.rest) {
      		handler.reply("TEXT", "La demande de mise à jour a été envoyé")
      		this.notificationReceived("XBOXDB_UPDATE", handler.args, "MMM-TelegramBot")
	}
	else handler.reply("TEXT", "Le module Xbox database est désactivé")
    }
    if (command == "homestatus") this.cmd_homestatus(handler)
  },

  cmd_homestatus: function(handler) {
      var self = this
      var data = self.HomeStatus
      var text = ""
      if (Object.keys(data).length > 0) {
      	for (let [item, value] of Object.entries(data)) {
		var activate = value.active
		var display = value.display
		var status = value.status
		var color = value.color
		var ping = value.ping
		var rate = value.rate
		var name = value.name
		var app = value.app
		var source = value.source
		var new_title = false;

		for (var i in display) {
			if (activate) {
				var end = false
				if (status[i]) {
					text += "*ON -- " + display[i]
					if (ping && ping != null) {
						text +=  ":* " + ping + " ms\n"
						end = true
					}
					if (rate && rate !=0) {
						text += ":* " + rate + " kbit/s\n"
						end = true
					}
					if (name && name[i] && name[i] != null) {
						text += ": * " + name[i] + "\n"
						end = true
					}
					if (app && app[i] && app[i] != null) {
						if (!self.config.Xbox.rest) {
							for ( var nb in self.XboxDB )
								if(self.XboxDB[nb][0] == app[i]) {
									text += ":* " + self.XboxDB[nb][1] + "\n"
									new_title = true;
									end = true
								}
							if(!new_title) {
								text += ": * -!!!- Titre Inconnu\n"
								end = true
							}
						} else {
							text += ":* " + app[i] + "\n"
							end = true
						}
					}
					if (source && source[i] && source[i] != null) {
						text += ": * " + source[i] + "\n"
						end = true
					}
					if (!end) text += "*\n"
				} else text += "*OFF -- " + display[i] + "*\n"
			}
		}
	}
	handler.reply('TEXT', text, {parse_mode:'Markdown'})
     }
  },

});
