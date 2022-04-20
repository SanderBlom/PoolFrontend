//This file is used to store functions related to fetching data from the pool table. 
const { user } = require("pg/lib/defaults");
const { pool } = require("./dbConfig");
const moment = require('moment'); //Used to generate timestamps
const res = require("express/lib/response");

async function ValidateUniqueUsername(username) {
    //This function returns false if the username exist in the database.
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
	WHERE userid = $4 RETURNING *;`
    const values = [`${firstname}`, `${lastname}`, `${email}`, id]

    try {
        let result = await pool.query(query, values) //Updating the user data in the database
        if (result.rows.length != 0) {
            return true
        }
        else {
            return false
        }
    } catch (error) {
        return false
    }
}

async function RegisterNewUser(username, firstname, lastname, email, password) {
    const queryUserTable = `INSERT INTO public.users(username, firstname, lastname, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *;`
    const valuesUserTable = [`${username}`, `${firstname}`, `${lastname}`, `${email}`, `${password}`]
    let resultUserTable //Here we store the result of the first query towards the usertable 
    let resultPlayerTable //Here we store the result of the second query towards the playertable 

    resultUserTable = await pool.query(queryUserTable, valuesUserTable)

    let userid = await resultUserTable.rows[0].userid


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

async function CreateNewGame(tableid) {
    //This function should generate a game and add the first player to the game.
    const timestamp = moment() //Creating timestamp in millisec
    const timestampFormated = timestamp.format('YYYY-MM-DD HH:mm:ss') //Formats data into valid ISO 8601 standard for postgres
    const queryGame = 'INSERT INTO public.game(createtime, tableid) VALUES ($1, $2) RETURNING *;'
    const valueGame = [timestampFormated, tableid]

    let resultgame = await pool.query(queryGame, valueGame) //Inserting the data into the database.
    let gameid = resultgame.rows[0].gameid //Fetching the game ID from the response from the db

    return gameid //Returning the gameid 

}

async function StartGame(gameid) {
    const timestamp = moment() //Creating timestamp in millisec
    const timestampFormated = timestamp.format('YYYY-MM-DD HH:mm:ss') //Formats data into valid ISO 8601 standard for postgres
    const query = {
        text: 'UPDATE public.game SET starttime = $1 WHERE gameid = $2 RETURNING *;',
        values: [timestampFormated, gameid]
    }
    let result = await pool.query(query)
    if (result.rows.length > 0) {
        return true
    }
    else { return false }

}

async function AddPlayerToGame(gameid, userid) {
    if (gameid == null || userid == null) {
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
    let fetchplayerid = await pool.query(query2)
    let playerid = fetchplayerid.rows[0].playerid //Fetching playerid from the object
    let playerids = await GetPlayerIDinGame(gameid)
    let playerid1 = null
    let playerid2 = null

    if (playerids == null) {
        playerid1 = null
        playerid2 = null
    }
    else {
        playerid1 = playerids[0]
        playerid2 = playerids[1]
    }

    //If gameid is valid then add user
    if (gamevalidation.rows.length == 1) {

        if (playerid1 == null) {
            //If no user is assigned to the game we can assign our fist user to the userid table.
            const query3 = {
                text: 'INSERT INTO public.game_players(gameid, playerid) VALUES ($1, $2) RETURNING *;',
                values: [gameid, playerid]
            }
            let result = await pool.query(query3)
            if (result.rows.length != 0) { return true }
            else { return false }
        }
        else {
            //This should be triggered when the second player tries to join the game. 
            //The second player will be added to the playerid2 colum since player1 is already added to playerid
            const query4 = {
                text: 'UPDATE public.game_players SET playerid2 = $2 WHERE gameid = $1 RETURNING *;',
                values: [gameid, playerid]
            }
            let result = await pool.query(query4)
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
        let player1 = result.rows[0].playerid
        let player2 = result.rows[0].playerid2
        //returns the amount of players
        if (player1 == null && player2 == null) { return 0 }
        else if (player1 != null && player2 == null) { return 1 }
        else if (player1 == null && player2 != null) { return 1 }
        else if (player1 != null && player2 != null) { return 2 }
    }
}
async function GetGameIDForActiveGame(userid) {
    //This returns the gameid for an active game based on the userid inputed.

    playerid = await GetPlayerID(userid)
    const query = {
        text: 'select gameid from game_players NATURAL JOIN game WHERE (endtime IS NULL) AND (playerid = $1 OR playerid2 = $1);',
        values: [playerid]
    }
    let result = await pool.query(query)


    if (result.rows[0].gameid != null) {
        const gameid = result.rows[0].gameid
        return gameid
    }
    else {
        return null
    }
}

async function GetPlayerID(userid) {
    //This returns playerid
    const query = {
        text: 'SELECT playerid FROM player WHERE userid = $1;',
        values: [userid]
    }
    let result = await pool.query(query) //Returns the amount of players in the game
    if(result.rows.length > 0){
        const playerid = result.rows[0].playerid
        return playerid
    }
    else{
        return null}

}
async function GetTableID(gameid) {
    //This function finds the table if given the gameid
    const query = {
        text: 'SELECT tableid FROM game WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query) //Fetches tableid from game table

    if (result.rows.length == 0) {
        return null
    }
    else {
        let tableid = result.rows[0].tableid
        if (tableid > 0) {
            return tableid
        }

        else {
            console.log('Table id is invalid'); return null
        }
    }
}

async function fetchUsernamesInGame(gameid) {
    const query = {
        text: 'SELECT playerid, playerid2 FROM public.game_players WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query) //Returns the amount of players in the game
    let playerid1 = result.rows[0].playerid
    let playerid2 = result.rows[0].playerid2

    let username1 = await GetUsernamesFromPlayerID(playerid1)
    let username2 = await GetUsernamesFromPlayerID(playerid2)
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
        let userid = result.rows[0].userid

        if (userid != null) {
            const query = {
                text: 'SELECT username from users WHERE userid = $1;',
                values: [userid]
            }
            let result = await pool.query(query) //Returns the amount of players in the game
            let username = result.rows[0].username
            if (username != null) {
                return username
            }
            else { console.log('No username found'); return null }
        }
        else {
            console.log('Userid is null...mvh GetUsernamesFromPlayerID '); return null
        }
    }
}

async function latestBallPosition(gameid) {
    //This function will querry the database and fetch the latest ballpositions in a game.
    const query = {
        text: 'SELECT ballcoulor, x_pos, y_pos, playerid FROM billiardball WHERE playcount = (SELECT max(playcount) FROM billiardball WHERE gameid = $1) AND gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)

    return result.rows
}

async function IsUserInAGame(userid) {
    if (userid == null) {
        console.log('No user id provided. Returning null')
        return null
    }
    //returns true if user is in a game
    const query = {
        text: 'SELECT playerid from player WHERE userid = $1;',
        values: [userid]
    }
    let result = await pool.query(query) //Returns the playerid from player table
    let playerid = result.rows[0].playerid

    if (playerid != null) {
        const query = {
            text: 'select * from game_players NATURAL JOIN game WHERE (endtime IS NULL) AND (playerid = $1 OR playerid2 = $1)',
            values: [playerid]
        }
        let result = await pool.query(query)

        if (result.rows.length == 1) { return true }

        else { return false }
    }
    else { return null }
}

async function GetPlayerIDinGame(gameid) {
    if (gameid == null) {
        console.log('No game id provided. Returning null')
        return null
    }
    const query = {
        text: 'SELECT * from game_players NATURAL JOIN game WHERE (endtime IS NULL) AND gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)
    let playerids = [] //Init array to store usernames
    if (result.rows.length == 0) {
        return null
    }
    else {
        let playerid = result.rows[0].playerid
        let playerid2 = result.rows[0].playerid2
        playerids.push(playerid, playerid2)
        return playerids
    }
}

async function CancelGame(gameid) {
    //This function will delete the game from the game and game_players table. This should only be done if game has not started
    const query1 = {
        text: 'DELETE from game_players WHERE gameid = $1;',
        values: [gameid]
    }
    await pool.query(query1)

    const query2 = {
        text: 'DELETE from billiardball WHERE gameid = $1;',
        values: [gameid]
    }
    await pool.query(query2)

    //After we have deleted fro the game_players table we can the delete the game from gameid
    const query3 = {
        text: 'DELETE from game WHERE gameid = $1;',
        values: [gameid]
    }
    await pool.query(query3)

}

async function GetTableIPWithTableID(tableid) {
    //This function will return the ip address of the table
    const query = {
        text: 'SELECT ipaddress FROM tables WHERE tableid = $1;',
        values: [tableid]
    }
    let result = await pool.query(query)
    if (result.rows.length > 0) {
        return result.rows[0].ipaddress
    }
    else { return null }

}

async function GetTableIPWithGameID(gameid) {
    //This function will return the ip address of the table
    let tableid = null
    const query = {
        text: 'SELECT tableid FROM game WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)//Gets the tableid from the database 
    tableid = result.rows[0].tableid
    if (tableid = ! null) {
        if (tableid == true) {
            tableid = 1
        }

        const query2 = {
            text: `SELECT ipaddress FROM tables WHERE tableid = $1;`,
            values: [tableid]
        }
        let result2 = await pool.query(query2)//Using the tableid to fetch the ip address from the database
        let ip = result2.rows[0].ipaddress
        return ip

    }
    else { return null }

}


async function JoinGame(gameid, userid) {
    let playercount = await CheckPlayerCountInGame(gameid) //Returns and integer of players inside the game.

    if (playercount < 2) {
        let result = await AddPlayerToGame(gameid, userid) //Adds the the playerid to the game 
        return result
    }
    else { return false }

}

async function IsGameActive(gameid) {
    //This function returns true if the inputed gameid is an active game.
    const query = {
        text: 'SELECT gameid FROM public.game WHERE (endtime is null) AND (starttime is not null) AND gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)

    if (result.rows.length > 0) {
        return true
    }
    else { return false }
}


async function TimePlayed(gameid) {
    //This will return a timestamp object with hours, minutes and seconds from the database. We then format the data and return an integer representing the time in minutes 
    const query = {
        text: 'SELECT current_timestamp - starttime as now FROM game  WHERE (endtime is null) AND (starttime is not null) AND gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)
    let time = null

    if (result.rows.length > 0) {
        let minutes = result.rows[0].now.minutes
        let hours = result.rows[0].now.hours

        if (hours >= 1) {
            time = (hours * 60) + minutes // Make the time in minutes instead of hours + minutes
        }
        else {
            if (minutes < 1) {
                time = 0 // Make the time in minutes instead of hours + minutes
            }
            else {
                time = minutes // Make the time in minutes instead of hours + minutes
            }
        }
        return time
    }
    else {
        return null
    }

}

async function TotalGameTime(gameid) {
    //This will return a timestamp object with hours, minutes and seconds from the database. We then format the data and return an integer representing the time in minutes 
    const query = {
        text: 'SELECT endtime - starttime as now FROM game WHERE (endtime is not null) AND (starttime is not null) AND gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)
    let time = null

    if (result.rows.length > 0) {
        let minutes = result.rows[0].now.minutes
        let hours = result.rows[0].now.hours

        if (hours >= 1) {
            time = (hours * 60) + minutes // Make the time in minutes instead of hours + minutes
        }
        else {
            if (minutes < 1) {
                time = 0 // Make the time in minutes instead of hours + minutes
            }
            else {
                time = minutes // Make the time in minutes instead of hours + minutes
            }
        }
        return time
    }
    else {
        return null
    }

}

async function GetPreviousGameList(userid){
    //This will return all the gameids for a spesific user.
    let playerid = await GetPlayerIDFromUserID(userid)
  
        const query = {
            text: 'SELECT gameid FROM public.game WHERE winner = $1 OR loser = $1;',
            values: [playerid]
        }
        let result = await pool.query(query)
        let object = result.rows
        let gamearry = []

        for (let index = 0; index < object.length; index++) {
            let element = object[index].gameid;
            gamearry.push(element)
            
        }
        return gamearry

}

async function PersonalStatsWL(userid) {
    //This function finds the win/loss ratio for a specific user
    const query = {
        text: 'SELECT * FROM public.player WHERE userid = $1;',
        values: [userid]
    }
    let result = await pool.query(query)
    let wl

    if (result.rows[0].losses == 0) {
        wl = 0
        return wl
    }
    else {
        wl = result.rows[0].wins / result.rows[0].losses
        wl = wl.toFixed(2)
        return wl
    }
}

async function AvrageStatsWL() {
    //This functions returns the average win/loss ratio for all the players 
    const query = {
        text: 'SELECT wins, losses FROM player WHERE losses > 0'
    }
    let result = await pool.query(query)
    let WL = []
    let sum = 0

    for (let index = 0; index < result.rows.length; index++) {
        let indexWL = (result.rows[index].wins / result.rows[index].losses)
        WL.push(indexWL) //Adding each WL to the array
    }
    for (let index = 0; index < WL.length; index++) {
        sum += WL[index]; //Summing all the values in the array

    }
    let averageWL = sum / WL.length //Calculates the average win / loss ratio
    return averageWL
}

async function GetGameWinner(gameid) {
    //This function will get the username of the winner in a specific game'
    const query = {
        text: 'SELECT winner FROM public.game WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)
    if (result.rows.length > 0) {
        let playerid = result.rows[0].winner
        let winner = await GetUsernamesFromPlayerID(playerid)

        if (winner === undefined || winner === null) {
            return null
        }
        else {
            return winner
        }
    }
    else { return null }
}

async function GetGameLoser(gameid) {
    //This function will get the username of the winner in a specific game'
    const query = {
        text: 'SELECT loser FROM public.game WHERE gameid = $1;',
        values: [gameid]
    }
    let result = await pool.query(query)
    if (result.rows.length > 0) {
        let playerid = result.rows[0].loser
        let loser = await GetUsernamesFromPlayerID(playerid)

        if (loser === undefined || loser === null) {
            return null
        }
        else {
            return loser
        }
    }
    else { return null }
}


async function Top25WL(gameid) {
    //This will return an array with the top 25 players based on win/loss ratio
    const query = {
        text: 'SELECT wins, losses, userid FROM public.player WHERE losses > 0;'
    }
    let result = await pool.query(query)
    for (let index = 0; index < result.rows.length; index++) {
        let indexWL = (result.rows[index].wins / result.rows[index].losses)
        if (isNaN(indexWL)) {
            indexWL = 0
        }
        indexWL = indexWL.toFixed(2) // rounds up to two decimals
        result.rows[index].wl = indexWL //Adds new property to store calculated W/L
        result.rows[index].username = await GetUsername(result.rows[index].userid) //Adds new property to store username
    }
    return result.rows
}

async function GetUsername(userid) {
    //This function returns the username given the userid 
    const query = {
        text: 'SELECT username FROM public.users WHERE userid = $1;',
        values: [userid]
    }
    let result = await pool.query(query)

    return result.rows[0].username
}
async function CreateNewTournament(tournamentName){
    //This function creates a new tournament and returns the tournament ID
    const query = {
        text: 'INSERT INTO public.Tournament(TournamentName) VALUES ($1) RETURNING *;',
        values: [tournamentName]
    }
    let result = await pool.query(query)
    if(result.rows.length > 0 ){
        let tournamentid = result.rows[0].tournamentid
        return tournamentid
    }
    else{return null}

}

async function GetPlayerIDFromUserID(userid){
    //This function will return the playerid correlating to the playerid
    const query = {
        text: 'SELECT playerid from player WHERE userid = $1',
        values: [userid]
    }
    let result = await pool.query(query)
    if(result.rows.length > 0){
        return result.rows[0].playerid
    }
    else{return null}
    

}

async function ValidateGameAccess(userid, gameid){
    //This checks if the userid has played a game matching the gameid. Will return true if the user has played a game matching the gameid
    let playerid = await GetPlayerID(userid)

    if(playerid != null){
        const query = {
            text: 'SELECT * from game WHERE gameid = $2 AND (winner = $1 OR loser = $1)',
            values: [playerid, gameid]
        }
        let result = await pool.query(query)
    
        if(result.rows.length > 0){
            return true
        }
        else{return false}
    }
    else{
        return false
    }


}

async function GetAllBallPositions(gameid){
    //This will fetch all the x, y coordinates of the balls for an entire game
    const query = {
        text: `SELECT x_pos, y_pos, playcount, ballcoulor 
        FROM public.billiardball
        WHERE gameid = $1
        ORDER by playcount`,
        values: [gameid]
    }
    let result = await pool.query(query)

    return result.rows

}

//Exporting all the functions so they can be access by server.js
module.exports = {
    ValidateUniqueEmail, ValidateUniqueUsername, UpdaterUserDetails, RegisterNewUser,
    CreateNewGame, AddPlayerToGame, CheckPlayerCountInGame, GetTableID, GetUsernamesFromPlayerID,
    fetchUsernamesInGame, IsUserInAGame, GetPlayerIDinGame, CancelGame, GetGameIDForActiveGame, GetTableIPWithTableID,
    JoinGame, IsGameActive, StartGame, GetTableIPWithGameID, latestBallPosition, TimePlayed, PersonalStatsWL, AvrageStatsWL, Top25WL, 
    GetUsername, GetGameWinner, CreateNewTournament, GetPreviousGameList, ValidateGameAccess, GetGameLoser,
    TotalGameTime, GetAllBallPositions
}
