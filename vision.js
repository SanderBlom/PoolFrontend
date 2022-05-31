const fetch = require("node-fetch") //Used to fetch data from http/https endpoints
let db = require("./database.js"); //Gives us access to the db class to access data in the database



async function SendStart(gameid, playerid1, playerid2, username1, username2) {
  //This function will start send necessary data to start a game. Returns true or false depending if the game is started or not.
  let error1 = null
  let error2 = null
  let ipaddress
  const body = {
    gameid: gameid, playerid1: playerid1, playerid2: playerid2,
    username1: username1, username2: username2
  }

  try {
     ipaddress = await db.GetTableIPWithGameID(gameid)
  } catch (err) {
    console.log('Could not get tableIP from database. Error:' + err)
    err = error1
  }

  if(error1){
    //Retrun false if we could not get the table IP
    console.log('Could not get tableIP. Returning false')
    return null
  }
  else{
    try {
    
      const response = await fetch(`http://${ipaddress}/GameStart`, {
        method: 'post',
        timeout: '5000',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });
  
      return response.status //200 = ok, 400 = wrong format and 404 = no response
  
    } catch (err) {
      console.log('No response from API server. Error:' + err)
      err = error2
    }

  }
}

async function SendStop(gameid) {
  //This function will stop an ongoing game
  const body = {
    gameid: gameid
  }
  const ipaddress = await db.GetTableIPWithGameID(gameid)
  const response = await fetch(`http://${ipaddress}/GameStop`, {
    method: 'put',
    timeout: '5000',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  });
  console.log(response)
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
    console.log('Could not get table info from the database. Error: ' + error)
  }


  else {
    const API = `http://${ipaddress}/CheckTableStatus`

    if (tablestatus == true) {
      try {
        const response = await fetch(API, {
          timeout: '3000'
        })
        responseJson = await response.json()

      } catch (error) {
        console.log('Could not fetch data from API. Error: ' + error)
      }
      return responseJson //This will be either true or false
    }
    else {
      //If table is not active we return false
      return false
    }

  }


}


//Exporting all the functions so they can be access by server.js
module.exports = {
  CheckTableAvailability, SendStart, SendStop

}
