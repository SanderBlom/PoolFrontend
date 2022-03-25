//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database
const { pool } = require("./dbConfig");


async function CheckTableAvailability() {
    let responseJson
  

    const API = `https://10.8.0.2:7132/checktable`
    const agent = new https.Agent({
      rejectUnauthorized: false //This is enabled since we are using a self signed certificate. We should probably setup a letsencrypt sometime.
    })
    console.log('Dette er en test')
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

  //CheckTableAvailability()

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
    //console.log(body)
    console.log(response)
  }
  
  const time = moment() //Creating timestamp in millisec
  var timestamp = time.format('DD/MM/YYYY HH:mm:ss') //Formats data into valid ISO 8601 standard for postgres
  var gameid = 61
  var playerid1 = 5
  var playerid2 = 4
  var username1 = 'test2'
  var username2 = 'test'

  SendStart(gameid, playerid1, playerid2, username1, username2,timestamp)