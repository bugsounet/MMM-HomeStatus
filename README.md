# MMM-HomeStatus

MMM-HomeStatus is a module for the [MagicMirror](https://github.com/MichMich/MagicMirror) project by [Michael Teeuw](https://github.com/MichMich).

It displays the status of the modules and information if they are available

### Modules

* MagicHome: return color and state
* TV: return state and current source
* PC: return state and NetBios name
* Internet: return ping to web 
* Freebox: return state and display current rate adsl synchronization
* Xbox: return state and XBox Game/App

### Modules Specifications
* MagicHome : If you use this program in your phone to control light, you can use this module
* TV: this module works only with Philips TV
* Freebox: This module works with Freebox Revolution (V6), Freebox Crystal. Freebox Mini, one and Delta have not been tested (need tester)
* Xbox: need a database to translate the name of the application / games from the xbox to the real name (xbox.db)


## Installation

```
git clone https://github.com/bugsounet/MMM-HomeStatus.git
cd MMM-HomeStatus
npm install
```

if you use the Freebox module, you must register the application in your freebox server

```
sh Freebox_Login.sh
```
Please check your Freebox Server LCD screen and authorize application access to register your app.

Your app has been granted access !

Save safely those following informations secret to connect to your Freebox
```
{ app_token: '<token>',
  app_id: 'fbx.HomeStatus',
  api_domain: '<domain>.fbxos.fr',
  https_port: <port>,
  api_base_url: '/api/',
  api_version: '6.0'
}
```

## Configuration

To display the module insert it in the config.js file. 

```
{
	module: "MMM-HomeStatus",
	header: "Home Status",
	position: "top_center", // better place
	config: {
		delay: 10 * 1000, // refresh delay
		debug: false, // debug mode
		MagicHome: { // MagicHome Module
			active: true, // module activation
			ip: [
				"192.168.0.22" // ip1 of the module
			],
			display: [
				"Lumière" // display of the ip1
			]
		},
		Freebox_V6: { // Freebox Revolution module
			active: true, // module Activation
			player_ip: "192.168.0.12", 
			server_ip: "192.168.0.254",
			rate : { // rate freebox server module : replace value by result of Freebox_Login.sh
				active: true, // activation ?
				app_token: "<token>", 
				app_id: "fbx.Jarvis",
				api_domain: "<domain>.fbxos.fr",
				https_port: <port>
			}
		},
		Freebox_Crystal: { // Freebox Crystal Module
			active: false // activation
		},
		TV : { // philips TV module
			active: true, // activation
			display: [
				"TV" // name to display
			],
			ip: [
				"192.168.0.45" // ip1 of the TV
			],
			command:[
				"curl -X GET http://192.168.0.45:1925/1/sources/current" // ip1 command to display the current source
			]
		},
		PC: { // PC module (phone or other)
			active: true, // activation
			display: [
				"PC Fixe", // display of ip1
				"PC Portable", // display of ip2
				"Honor 8X" /// display of ip3 (could be a phone !)
			],
			ip: [
				"192.168.0.17", // ip1
				"192.168.0.38", // ip2
				"192.168.0.14" // ip3
			]
		},
		Xbox: { // Xbox One Module
			active: true, // activation
			ip: [
				"192.168.0.39" // ip1
			],
			display: [
				"Xbox One X" // display of ip1
			]
		},
		Internet: { // internet ping module
			active: true, // activation
			scan: "google.fr", // domain or ip to ping
			display: [ "Internet" ] // display on screen
		}
	}
},

```

## Change Log
