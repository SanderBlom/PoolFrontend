//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database
const { pool } = require("./dbConfig");



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

