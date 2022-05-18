#!/bin/bash
# This script will install the web application on an ubuntu 22.04 server.

#Asks user if they have installed postgres. This has to be installed for the web server to work. 
read -p "Is postgres installed? (yes/no) " yn


case $yn in 
	yes ) echo ok, we will proceed;;
	no ) echo exiting...;
		exit;;
	* ) echo invalid response;
		exit 1;;
esac

#Installing nesassary applications and frameworks
echo "Installing snap"
sudo snap install core; sudo snap refresh core
echo "Installing certbot to generate ssl keys and certs"
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
echo "Installing NPM and NodeJS"
curl -s https://deb.nodesource.com/setup_16.x | sudo bash
sudo apt-get install -y nodejs
echo "Installing pm2 prosesses manger"
npm install pm2@latest -g

#Getting the source code from github
echo "Cloing source code from github"
git clone https://github.com/SanderBlom/PoolFrontend.git

#Moving into the new folder container the source code
cd PoolFrontend
#Installing the required depences.
echo "Installing dependecies from package-lock file "
npm i --package-lock-only
npm upate

#User inputs nesassary information to create the .env file. 
echo "Please enter the username for the postgreSQL database:"
read dbusername

echo "Please provide the password for the username $dbusername:"
read dbpassword

echo "Please provide the listening IP for the database:"
read dbip 

echo "Please provide the listening port for the database. The default is 5432"
read dbport

echo "Please provide the database name. Eks: smartpool"
read dbname

echo "Generating a random session key...."

sessionkey=$(echo $RANDOM | md5sum | head -c 20; echo;)

echo "Session key is: $sessionkey"

#Creating file to store enviorment variables
echo "Creating the .env file"
: > .env

echo "Adding provied data to the .env file"
#Adding all the variables to the .env file
echo "DB_USER=$dbusername" >> .env
echo "DB_PASSWORD=$dbpassword" >> .env
echo "DB_HOST=$dbip" >> .env
echo "DB_PORT=$dbport" >> .env
echo "DB_DATABASE=$dbname" >> .env
echo "SESSION_SECRET=$sessionkey" >> .env
echo "DEVELOPMENT=false" >> .env

echo "Creating a new directory for ssl files"
mkdir ssl 

cd ssl
ssl_loccation=$(pwd)
echo "$ssl_loccation"




read -p "Should we try to enable SSL? (yes/no) " yn

case $yn in 
	yes ) echo ok, we will proceed;;
	no ) echo "Ok, but then do it manualy. Installation sucsessfull!";
		exit;;
	* ) echo invalid response;
		exit 1;;
esac

echo "Please provide a domainname. Eks smartpool.no"
read domainname

foldercount=$(ls -l /etc/letsencrypt/live/$domainname* | egrep -c '^-')

if [ foldercount -gt 0] 
then
    echo "Looks like the certs allready has been generated. Please move them manualy"
fi


else
    echo "No certs found for that domain. Generating new ones."
    sudo certbot certonly --standalone
    #Checking for the new files
    echo "Please provide cert path:"
    read certpath
    echo "Please provide key path:"
    read keypath

if test -f "$certpath"; then
    echo "Where should we place the cert ? eks: /root/PoolFrontend/ssl/"
    read sslfolder
    cp $certpath sslfolder
fi

if test -f "$keypath"; then
    cp $keypath sslfolder
    echo "Key as been copied"
fi

echo "The server can be started by running: pm2 start server.js"

fi








