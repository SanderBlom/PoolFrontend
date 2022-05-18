#!/bin/bash
# This script will install the web application on an ubuntu 22.04 server.

#Asks user if they have installed postgres. This has to be installed for the web server to work. 
read -p "Is postgres installed? (yes/no) " yn

case $yn in 
	yes ) echo ok, we will proceed;
		break;;
	no ) echo exiting...;
		exit;;
	* ) echo invalid response;;
esac

done

echo doing stuff...
#Installing nesassary applications and frameworks
echo "Installing NPM and NodeJS"
sudo apt install nodejs npm -y
echo "Installing pm2 prosesses manger"
npm install pm2@latest -g

#Getting the source code from github
echo "Cloing source code from github"
git clone https://github.com/SanderBlom/PoolFrontend.git

#Moving into the new folder container the source code
cd PoolFrontend
#Installing the required depences.
echo "Installing dependecies from package-lock file "
npm install package-lock.json

#User inputs nesassary information to create the .env file. 
echo "Please enter the username for the postgreSQL database:"
read dbusername

echo "Please provide the password for the username $dbusername:"
read dbpassword

echo "Please provide the listening IP for the database:"
read dbip 

echo "Please provide the listening port for the database. The default is 5432"
read dbport

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
echo "DB_HOST$dbip" >> .env
echo "DB_PORT$dbport" >> .env
echo "SESSION_SECRET$sessionkey" >> .env
echo "DEVELOPMENT=false" >> .env

echo "Creating a new directory for ssl files"
mkdir ssl 
echo "Installation sucsessfull!"


RED='\033[0;31m'

echo -e "${RED}Please add the certifiacte and private key in the SSL folder before you start the application!"
echo "The server can be started by running: pm2 start server.js"





