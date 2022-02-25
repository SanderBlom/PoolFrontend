//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database


async function CheckTableAvailability(tableid) {
  let responseJson

  var ipaddress = await db.GetTableIPWithTableID(tableid) //We get the ip address of the system by asking the database with the correct tableid

  const API = `https://${ipaddress}:7159/tablestatus`
  const agent = new https.Agent({
    rejectUnauthorized: false //This is enabled since we are using a self signed certificate. We should probably setup a letsencrypt sometime.
  })

  try {
    const respons = await fetch(API, { agent })
    responseJson = await respons.json()
    console.log('Response table status' + responseJson)
  } catch (error) {
    console.log(error)
  }
  
  if (responseJson.length <= 1) {
    console.log(responseJson[0])
    var status = responseJson[0]
    console.log('status' + status)
    return status
  }

  else{
    console.log('test')
    return null} 
}

async function SendStart(gameid, playerid1, playerid2, username1, username2, timestamp){

  let ipaddress = await db.GetTableIPWithGameID(gameid) 
  if(ipaddress != nul){
    const body = {gameid: gameid, playerid1: playerid1, playerid2: playerid2, timestamp: timestamp, 
      username1: username1, username2: username2 };
  
  const response = await fetch(`https://${ipaddress}/startgame`, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'}
  });
  const data = await response.json()
  console.log(data)
  if(data != null){
    //
    return true 
  }

  }
  else {return false}

}

var tableid2 = 1

async function CheckTableAvailability(tableid2) {
  let responseJson

  var ipaddress = await db.GetTableIPWithTableID(tableid2) //We get the ip address of the system by asking the database with the correct tableid

  const API = `https://${ipaddress}:7132/checktable`
  const agent = new https.Agent({
    rejectUnauthorized: false //This is enabled since we are using a self signed certificate. We should probably setup a letsencrypt sometime.
  })

  try {
    const respons = await fetch(API, { agent })
    responseJson = await respons.json()
    console.log('Response table status' + responseJson)
  } catch (error) {
    console.log(error)
  }
  
  if (responseJson.length <= 1) {
    console.log(responseJson[0])
    var status = responseJson[0]
    console.log('status' + status)
    return status
  }

  else{
    console.log('test')
    return null} 
}


//Exporting all the functions so they can be access by server.js
module.exports = {
  CheckTableAvailability, SendStart

}

CheckTableAvailability(tableid2)