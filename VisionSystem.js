//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js"); //Gives us access to the db class to access data in the database
const res = require('express/lib/response');



async function SendStart(gameid, playerid1, playerid2, username1, username2, timestamp) {
  //This function will start send necessary data to start a game. Returns true or false depending if the game is started or not.
  const ipaddress = await db.GetTableIPWithGameID(gameid)
  const body = {
    gameid: gameid, playerid1: playerid1, playerid2: playerid2, timestamp: timestamp,
    username1: username1, username2: username2
  };

  const response = await fetch(`http://${ipaddress}/GameStart`, {
    method: 'post',
    timeout: '5000',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });

  return response.status //200 = ok, 400 = wrong format and 404 = no response

}

async function SendStop(gameid) {
  //This function will stop an ongoing game
  const ipaddress = await db.GetTableIPWithGameID(gameid)
  const response = await fetch(`http://${ipaddress}/GameDone`, {
    method: 'delete',
    timeout: '5000'
  });
  return response.status //200 = ok, 400 = wrong format and 404 = no response

}


async function CheckTableAvailability(tableid) {
  let responseJson
  let tablestatus
  let error
  let ipaddress



  try {
    tablestatus = await db.GetTablelActiveState(tableid) //We get the active state of the table (true or false). 
    ipaddress = await db.GetTableIPWithTableID(tableid) //We get the ip address of the system by asking the database with the correct tableid
  } catch (err) {
    error = err
  }
  if (error) {
    console.log(error)
  }

  
  else {
    const API = `http://${ipaddress}/CheckTableStatus`

    if(tablestatus == true){
      try {
        const response = await fetch(API, {
          timeout: '5000'
        })
        responseJson = await response.json()
  
      } catch (error) {
        console.log(error)
      }
  
      if (responseJson == true) {
  
        return true
      }
  
      else {
  
        return false
      }
    }
    else{
      //If table is not active we return false
      return false
    }

    }
    

}


//Exporting all the functions so they can be access by server.js
module.exports = {
  CheckTableAvailability, SendStart, SendStop

}
