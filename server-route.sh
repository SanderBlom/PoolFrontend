#!/bin/sh
#Dette brukes for å redirecte port fra 3000 til port 80. 
#For å kjøre scriptet skriv "chmod +x navnetpåscriptet.sh etterfuløt av ./navnetpåscriptet.sh"

sudo iptables -A PREROUTING -t nat -p tcp --dport 80 -j REDIRECT --to-ports 3000 
echo "Pre routing is now set from 80 to 3000"
sudo iptables -t nat -A OUTPUT -o lo -p tcp --dport 80 -j REDIRECT --to-port 3000
echo "Redirecting now port 80 to 3000"