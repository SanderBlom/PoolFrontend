
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



