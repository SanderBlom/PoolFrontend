//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database
const { pool } = require("./dbConfig");


async function CheckTableAvailability(tableid) {
  let responseJson

  var ipaddress = await db.GetTableIPWithTableID(tableid) //We get the ip address of the system by asking the database with the correct tableid

  const API = `http://${ipaddress}/checktable`

  try {
    const response = await fetch(API, {
      timeout: '5000'
    })
    responseJson = await response.json()

  } catch (error) {
    console.log(error)
  }
  console.log('This is the table status: ' + responseJson)

  if (responseJson == true) {

    return responseJson
  }

  else {

    return false
  }
}

  CheckTableAvailability(1)

  async function genRand(min, max, decimalPlaces) {  
    var rand = Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);  // could be min or max or anything in between
    var power = Math.pow(10, decimalPlaces);
    return Math.floor(rand*power) / power;
}
  async function dummydata(){

    var gameid = 56
    var playerid1 = 4
    var playerid2 = 5
    var x
    var y
    var color
    var playcount = 1
    

    for (let index = 0; index < 15; index++) {
      x = await genRand(0, 1, 2)
      y = await genRand(0, 1, 2)
      color = await genRand(0, 15, 0)
      const timestamp = await moment() //Creating timestamp in millisec
      const timestampFormated = timestamp.format('YYYY-MM-DD HH:mm:ss') //Formats data into valid ISO 8601 standard for postgres
      console.log('x= ' + x + ' y= ' + y + ' timestamp = ' + timestampFormated + ' index = ' + index)

      const query = {
        text: `INSERT INTO public.billiardball(
          gameid, x_pos, y_pos, playerid, "timestamp", playcount, ballcoulor)
          VALUES (56 , $1, $2, 4, $3, 2, $4);`,
        values: [ x, y, timestampFormated, color]
      }
      await pool.query(query)

      index++
    }






  }

  async function SendStart(gameid, playerid1, playerid2, username1, username2, timestamp) {
    //This function will start send necessary data to start a game. Returns true or false depending if the game is started or not.
    const ipaddress = await db.GetTableIPWithGameID(gameid)
    console.log('ip =' + ipaddress)
    const body = {
      gameid: gameid, playerid1: playerid1, playerid2: playerid2, timestamp: timestamp,
      username1: username1, username2: username2
    };
  
    const response = await fetch(`http://${ipaddress}/gamestart`, {
      method: 'post',
      timeout: '5000',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });

    return response.status //200 = ok, 400 = wrong format and 404 = no response

  }
  
  const time = moment() //Creating timestamp in millisec
  var timestamp = time.format('YYYY-MM-DDTHH:mm:SS') //Formats data into valid ISO 8601 standard for postgres
  var gameid = 62
  var playerid1 = 4
  var playerid2 = 5
  var username1 = 'test'
  var username2 = 'test2'

  //SendStart(gameid, playerid1, playerid2, username1, username2,timestamp)