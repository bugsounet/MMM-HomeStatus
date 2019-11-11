echo "Update MMM-HomeStatus Check..."
git pull
echo " "
echo "Install MMM-HomeStatus..."
npm install
echo " "
echo "Install dependencies..."
apt-cache policy samba-common-bin | grep -q samba-common-bin && echo "It's Ok !"  || (echo "NMBLOOKUP Not Found ... Force to install !" && sudo apt-get -y install samba-common-bin)
echo " "
read -p "Register MMM-HomeStatus to Freebox Server (y/n) ? " res
if [ "$res" = "y" ]; then
	node Freebox_Login.js
else
	echo " ";
fi
echo " "
echo "MMM-HomeStatus is now installed !"
