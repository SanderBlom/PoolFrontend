//This file is used to store functions related to fetching data from the pool table. 
const moment = require('moment'); //Used to generate timestamps
const fetch = require("node-fetch") //Used to fetch data from http/https
const https = require("https"); //Used to be able to work with self signed certificates 
let db = require("./db.js") //Gives us access to the db class to access data in the database


async function CheckTableAvailability(tableid) {
  
  var ipaddress = await db.GetTableIP(tableid) //We get the ip address of the system by asking the database with the correct tableid
  console.log(ipaddress)
  let responseJson

  const API = `https://${ipaddress}:7159/tablestatus`
  const agent = new https.Agent({
    rejectUnauthorized: false //This is enabled since we are using a self signed certificate. We should probably setup a letsencrypt sometime.
  })

  try {
    
    const respons = await fetch(API, { agent })
    responseJson = await respons.json()
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
  CheckTableAvailability

}
