# PoolFrontend
A live demo application can be accesed <a href="https://smartpool.no">here</a>


How to deploy the application to a Ubuntu server:
1. Install postgreSQL, create a new database with the name smartpool and a new user with access to the database.

2. Copy the content of the "database schema" file and run this in a new querry window in the smartpool database.

3. Download the install.sh file <a href="https://github.com/SanderBlom/PoolFrontend/releases">here</a> (only tested on ubuntu 22.04) .

4. Make the file executable by running "chmod +x install.sh"

5. Run the installer by running "./install.sh"

6. Add ssl certficiate and key to the ssl folder (the install scrip will desribe this in more detials). 

7. Run "pm2 start server.js" to start the application (this has to be run inside the application folder).
