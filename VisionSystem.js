//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database


async function SendStart(gameid, playerid1, playerid2, username1, username2, timestamp){
//This function will start send necessary data to start a game. Returns true or false depending if the game is started or not.
  let ipaddress = await db.GetTableIPWithGameID(gameid) 
  if(ipaddress != nul){
    const body = {gameid: gameid, playerid1: playerid1, playerid2: playerid2, timestamp: timestamp, 
      username1: username1, username2: username2 };
  
  const response = await fetch(`https://${ipaddress}/startgame`, {
    method: 'post',
    timeout: '5000',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'}
  });
  const data = await response.json()
  if(data != null){
    
    return true 
  }

  }
  else {return false}
}


async function CheckTableAvailability(tableid) {
  let responseJson

  var ipaddress = await db.GetTableIPWithTableID(tableid) //We get the ip address of the system by asking the database with the correct tableid

  const API = `http://${ipaddress}/checktable`

  try {
    const response = await fetch(API, {
    timeout: '5000' })
    responseJson = await response.json()
    
  } catch (error) {
    console.log(error)
  }
  console.log('This is the table status: ' + responseJson)
  if (responseJson.length > 0) {
    var status = responseJson[0]
    return status
  }

  else{

    return null} 
}


//Exporting all the functions so they can be access by server.js
module.exports = {
  CheckTableAvailability, SendStart

}
