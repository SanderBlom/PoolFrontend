//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database
const { pool } = require("./dbConfig");



async function CreateArray() {
  let gameid = 84
  let array = await db.GetAllBallPositions(gameid)
  let balls = []
  let max = 0
  //Finding the lagrest playcount from the array
  for (let index = 0; index < array.length; index++) {
    const row = array[index];
    if (row.playcount > max) {
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
    balls[playcount].push({ x_pos: x_pos, y_pos: y_pos, ballcoulor: ballcoulor })
  }

}



async function correctWinsnLosses() {
  const query = {
    text: 'SELECT playerid FROM public.player;'
  }
  let players = await pool.query(query)

  for (let index = 0; index < players.rows.length; index++) {
    const playerid = players.rows[index].playerid

    const query1 = {
      text: 'SELECT * FROM public.game WHERE winner = $1;',
      values: [playerid]
    }
    let wins = await pool.query(query1)

    const query2 = {
      text: 'SELECT * FROM public.game WHERE loser = $1;',
      values: [playerid]
    }
    let losses = await pool.query(query2)

    const query3 = {
      text: 'UPDATE public.player SET wins= $2, losses= $3 WHERE playerid = $1;',
      values: [playerid, wins.rows.length, losses.rows.length]
    }
    pool.query(query3)

  }
}

correctWinsnLosses()

//CreateArray()

