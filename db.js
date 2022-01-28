//This file is used to store functions related to fetching data from the pool table. 
const { user } = require("pg/lib/defaults");
const { pool } = require("./dbConfig");
const moment = require('moment'); //Used to generate timestamps

async function ValidateUniqueUsername(username) {
    //This function returns true if the username exist in the database.
    let result
    const query = {
        text: 'SELECT * FROM public.users WHERE username = $1',
        values: [username]
    }
    try {
        result = await pool.query(query)
    } catch (error) {
        throw error
    }
    if (result.rows.length != 0) {
        return false
    }
    else { return true }
}

async function ValidateUniqueEmail(email) {
    //This function returns true if the username exist in the database.
    let result //Initizlising an object to store data from database
    const query = {
        text: 'SELECT * FROM public.users WHERE email = $1',
        values: [email]
    }
    try {
        result = await pool.query(query)
    } catch (error) {
        throw error
    }
    if (result.rows.length != 0) {
        return false
    }
    else { return true }
}

//This function returns true if the data is successfully updated in the database. 
async function UpdaterUserDetails(firstname, lastname, email, id) {
    const query = `UPDATE public.users SET firstname = $1, lastname = $2, email = $3
	WHERE userid = $4;`
    const values = [`${firstname}`, `${lastname}`, `${email}`, id]
    //Trying to insert data into database
    try {
        result = await pool.query(query, values)
    } catch (error) {
        throw error
    }
    //If we catch an error we want to return the error message back to so it can be handled and potentially be displayed to the UI.
    if (error) {
        return error
    }
    else {
        return true
    }
}

async function RegisterNewUser(username, firstname, lastname, email, password) {
    const queryUserTable = `INSERT INTO public.users(username, firstname, lastname, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *;`
    const valuesUserTable = [`${username}`, `${firstname}`, `${lastname}`, `${email}`, `${password}`]
    let resultUserTable //Here we store the result of the first query towards the usertable 
    let resultPlayerTable //Here we store the result of the second query towards the playertable 

    resultUserTable = await pool.query(queryUserTable, valuesUserTable)

    var userid = await resultUserTable.rows[0].userid


    const queryPlayerTable = 'INSERT INTO public.player(userid) VALUES ($1) RETURNING *;'
    const valuesPlayerTable = [userid]

    //If the insert into user table completed successfully. We can proceed by inserting the user into the player table
    if (resultUserTable.rows[0].username == username) {

        resultPlayerTable = await pool.query(queryPlayerTable, valuesPlayerTable)

        if (resultPlayerTable.rows[0].userid == userid) {
            return true
        }
        else {
            //If last insert failed we have to delete the first insert in the user table
            const queryDeleteFromUserTable = 'DELETE FROM public.users WHERE username = $1 VALUES ($1) RETURNING *;'
            const valuesDelteFromUserTable = [userid]
            pool.query(queryDeleteFromUserTable, valuesDelteFromUserTable)
            return false
        }
    }
    //If any of the queries above fails, we return false to let the user know that the usercreation failed.
    else {

        return false
    }
}

async function CreateNewGame(userid, tableid) {
    //This function should generate a game and add the first player to the game.
    const timestamp = moment() //Creating timestamp in millisec
    const timestampFormated = timestamp.format('YYYY-MM-DD HH:mm:ss') //Formats data into valid ISO 8601 standard for postgres
    const queryGame = 'INSERT INTO public.game(createtime, tableid) VALUES ($1, $2) RETURNING *;'
    const valueGame = [timestampFormated, tableid]

    let resultgame = await pool.query(queryGame, valueGame) //Inserting the data into the database.
    var gameid = resultgame.rows[0].gameid //Fetching the game ID from the response from the db

    return gameid //Returning the gameid 

}

async function AddPlayerToGame(gameid, userid) {
    if (gameid == null && userid == null){
        console.log('Inout is empty')
        return null
    }
    //Checks that the game is valid (the game id exists, the game has not started, and the game has not ended)
    const query = {
        text: 'SELECT gameid FROM public.game WHERE gameid = $1 AND endtime IS NULL AND starttime IS NULL;',
        values: [gameid]
    }
    let gamevalidation = await pool.query(query) //Returns one row if the gameid exists in the db

    //Fetches player id based on the userid inputed to the function.
    const query2 = {
        text: 'SELECT playerid FROM public.player WHERE userid = $1;',
        values: [userid]
    }
    let fetchplayerid = await pool.query(query2) //Returns one row if the gameid exists in the db
    var playerid = fetchplayerid.rows[0].playerid //Fetching playerid from the object
    let playerids = await FetchPlayerIDinGame(gameid)

    var playerid1 = playerids[0]
    var playerid2 = playerids[1]


    //If gameid is valid then add user
    if (gamevalidation.rows.length == 1) {

        if (playerid1 == null) {
            console.log('Jeg skal ikke trigges')
            //If no user is assigned to the game we can assign our fist user to the userid table.
            const query3 = {
                text: 'INSERT INTO public.game_players(gameid, playerid) VALUES ($1, $2) RETURNING *;',
                values: [gameid, playerid]
            }
            var result = await pool.query(query3)
            if (result.rows.length != 0) { return true }
            else { return false }
        }
        else {
            console.log('Jeg skal trigges')
            //This should be triggered when the second player tries to join the game. 
            //The second player will be added to the playerid2 colum since player1 is already added to playerid
            const query4 = {
                text: 'UPDATE public.game_players SET playerid2 = $2 WHERE gameid = $1 RETURNING *;',
                values: [gameid, playerid]
            }
            var result = await pool.query(query4)
            if (result.rows.length != 0) { return true }
            else { return false }
        }
    }
    else { return false }
}

async function CheckPlayerCountInGame(gameid) {
    //This function just return the amount of players in a game. 
    const query = {
        text: 'SELECT playerid, playerid2 FROM public.game_players WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query) //Returns the amount of players in the game

    if (result.rows.length == 0) {
        return 0
    }
    else {
        var player1 = result.rows[0].playerid
        var player2 = result.rows[0].playerid2
        //returns the amount of players
        if (player1 == null && player2 == null) { return 0 }
        else if (player1 != null && player2 == null) { return 1 }
        else if (player1 == null && player2 != null) { return 1 }
        else if (player1 != null && player2 != null) { return 2 }
    }
}

async function GetTableID(gameid) {
    //This function finds the table if given the gameid
    const query = {
        text: 'SELECT tableid FROM game WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query) //Fetches tableid from game table

    if (result.rows.length == 0) {
        console.log('You fucked up')

    }
    else {
        var tableid = result.rows[0].tableid
        if (tableid > 0)
            return tableid
        else {
            console.log('Table id is invalid')
        }
    }
}

async function fetchUsernamesInGame(gameid) {
    console.log('Fetch usernames (gameid)=  ' + gameid)
    const query = {
        text: 'SELECT playerid, playerid2 FROM public.game_players WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query) //Returns the amount of players in the game
    var playerid1 = result.rows[0].playerid
    var playerid2 = result.rows[0].playerid2

    var username1 = await GetUsernamesFromPlayerID(playerid1)
    console.log('Username 1')
    var username2 = await GetUsernamesFromPlayerID(playerid2)
    let usernames = []
    usernames.push(username1, username2)

    return usernames
}

async function GetUsernamesFromPlayerID(playerid) {
    const query = {
        text: 'SELECT userid from player WHERE playerid = $1;',
        values: [playerid]
    }
    let result = await pool.query(query) //Returns the amount of players in the game

    if (result.rows.length == 0) {
        return null
    }
    else {
        var userid = result.rows[0].userid

        if (userid != null) {
            const query = {
                text: 'SELECT username from users WHERE userid = $1;',
                values: [userid]
            }
            let result = await pool.query(query) //Returns the amount of players in the game
            var username = result.rows[0].username
            console.log('username' + username)

            if (username != null) {
                return username
            }
            else { console.log('No username found') }
        }
        else {
            console.log('Something broke....')

        }

    }

}

async function IsUserInAGame(userid){
    //returns true if user is in a game
    const query = {
        text: 'SELECT playerid from player WHERE userid = $1;',
        values: [userid]
    }
    let result = await pool.query(query) //Returns the playerid from player table
    var playerid = result.rows[0].playerid

        if(playerid != null){
            const query = {
                text: 'select * from game_players NATURAL JOIN game WHERE (endtime IS NULL) AND (playerid = $1 OR playerid2 = $1)',
                values: [playerid]
            }
            let result = await pool.query(query)
            

            if(result.rows.length == 1){return true}
            else{return false}
        }
        else{return null}
}

async function FetchPlayerIDinGame(gameid){
    if(gameid == null){
        console.log('No game id provided')
        return null
    }
    const query = {
        text: 'SELECT * from game_players NATURAL JOIN game WHERE (endtime IS NULL) AND gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query) 
    var playerid = result.rows[0].playerid
    var playerid2 = result.rows[0].playerid2
    let playerids = []
    playerids.push(playerid, playerid2)

    return playerids

}

//Exporting all the functions so they can be access by server.js
module.exports = {
    ValidateUniqueEmail, ValidateUniqueUsername, UpdaterUserDetails, RegisterNewUser,
    CreateNewGame, AddPlayerToGame, CheckPlayerCountInGame, GetTableID, GetUsernamesFromPlayerID, 
    fetchUsernamesInGame, IsUserInAGame, FetchPlayerIDinGame
}
