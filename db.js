//This file is used to store functions related to fetching data from the pool table. 
const { pool } = require("./dbConfig");

async function ValidateUniqueUsername(username){
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
    else{return true}


}

async function ValidateUniqueEmail(email){
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
    else{return true}
}

module.exports = {ValidateUniqueEmail, ValidateUniqueUsername}
