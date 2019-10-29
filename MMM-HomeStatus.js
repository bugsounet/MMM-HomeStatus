Module.register("MMM-HomeStatus", {

	defaults: {
		delay: 10 * 1000,
		debug: false,
		MagicHome: {
			active: false,
			ip: ""
		},
		Freebox: {
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
		TV : {
			active: false,
			ip: "",
			command: ""
		},
		PC: {
			active: false,
			ip: ""
		},
		Xbox: {
			active: false,
			ip: ""
		},
		Internet: {
			active: true
		}
	},

	start: function () {
		this.Init = false;
		this.HomeStatus = {};
	},

	notificationReceived: function (notification, payload) {

        	if (notification === 'DOM_OBJECTS_CREATED') {
            		//DOM creation complete, let's start the module
            		this.sendSocketNotification("SCAN", this.config);
        	}
	},
	socketNotificationReceived: function (notification, payload) {
		if (notification === "RESULT") {
			this.Init = true;
			this.HomeStatus = payload;
			this.resetCountdown();
		}
	},

        resetCountdown: function () {
        	var self = this;
        	clearInterval(self.interval);
		self.counter = this.config.delay;
        	self.updateDom();

        	self.interval = setInterval(function () {
            		self.counter -= 1000;
            		if (self.counter <= 0) {
				clearInterval(self.interval);
				self.sendSocketNotification("SCAN", self.config);
            		}
	    		self.updateDom();
        	}, 1000);
        },

	getDom: function () {
        	var self = this;
		var data = self.HomeStatus;

		var wrapper = document.createElement("div")

		if (!this.Init) {
			wrapper.className = "HS_LOADING"
			wrapper.innerHTML = "Chargement des données ..."
			return wrapper
		}
		wrapper.innerHTML = ""

		// table building
		var dataTable = document.createElement("table")
		dataTable.className = "small data"


		if (Object.keys(data).length > 0) {
			for (let [item, value] of Object.entries(data)) {
				var activate = value.active
				var status = value.status
				var color = value.color
				var switched

				var StatusRow = document.createElement("tr")

				if (activate) { // --> Display only if module actived
					// item Cell
					var ItemCell = document.createElement("td")
					ItemCell.className = "HS_ITEM"
					ItemCell.innerHTML = item.replace(/_/gi, ' ')
					StatusRow.appendChild(ItemCell)

					// Infos Cell
					var InfoCell = document.createElement("td")
					InfoCell.className = "HS_INFO"
					if (value.color && status) {
						var rgb = "rgb(" + color.red + "," + color.green + "," + color.blue + ")"
						InfoCell.style.backgroundColor = rgb
						InfoCell.style.borderRadius = "25px"
						InfoCell.style.width = "100px"
					}
					if (status && value.ping && value.ping != null) InfoCell.innerHTML = value.ping + "ms"
					if (status && value.rate && value.rate !=0)) InfoCell.innerHTML = value.rate
					if (status && value.name && value.name != null) InfoCell.innerHTML = value.name
					if (status && value.app && value.app != null)) InfoCell.innerHTML = value.app
					if (status && value.source && value.source != null)) InfoCell.innerHTML = value.source

					StatusRow.appendChild(InfoCell)

					// Need Space ?
					var SpaceCell = document.createElement("td")
					SpaceCell.style.width = "30px"
					StatusRow.appendChild(SpaceCell)

					//switch Cell
					var StatusCell = document.createElement("td")
					StatusCell.className = "switch"

					// Create switch
					var button = document.createElement("INPUT")
					button.id = "switched"
					button.type = "checkbox"
					button.className = "switch-toggle switch-round";
					button.checked = status
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
			return wrapper
		}
	},

    	getScripts: function () {
        	return ["moment.js"];
	},

	getStyles: function() {
		return ["MMM-HomeStatus.css"]
  },

});
