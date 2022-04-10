//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database
const { pool } = require("./dbConfig");



async function CreateArray(){
  let gameid = 84
  let array = await db.GetAllBallPositions(gameid)
  let balls = []
  let max = 0
  //Finding the lagrest playcount from the array
  for (let index = 0; index < array.length; index++) {
    const row = array[index];
    if(row.playcount > max){
      max = row.playcount
    }
  }

  //Creating rows in the object
  for (let x = 1; x < max + 1; x++) {
    balls.push([])

  } 
  //Adding x, y and color to correct place in object
  for (let index = 0; index < array.length; index++) {
    const playcount = array[index].playcount - 1
    const x_pos = array[index].x_pos
    const y_pos = array[index].y_pos
    const ballcoulor = array[index].ballcoulor
    balls[playcount].push({x_pos: x_pos, y_pos: y_pos, ballcoulor: ballcoulor })
  }

}


CreateArray()

