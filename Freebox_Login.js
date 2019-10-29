const { FreeboxRegister } = require("freebox");

async function main() {
  const freeboxRegister = new FreeboxRegister({
    app_id: "fbx.Jarvis",
    app_name: "Jarvis",
    app_version: "1.0.0",
    device_name: "Magic Mirror",
  });

  // Obtaining an app_token & everything you need
  // https://dev.freebox.fr/sdk/os/login/
  const access = await freeboxRegister.register();
}

main().catch(err => console.error(err));

/*

Please check your Freebox Server LCD screen and authorize application access to register your app.

Your app has been granted access !

Save safely those following informations secret to connect to your Freebox API:
{ app_token:
   'etCEF2aytGPLWm1KZM0vIW/ziZOU58v/0qv9jUiJcedjadjaRZ/bflWSKy6HODORGUo6',
  app_id: 'fbx.my_amazing_app',
  api_domain: 'r42bhm9p.fbxos.fr',
  https_port: 35023,
  api_base_url: '/api/',
  api_version: '6.0' }

*/
