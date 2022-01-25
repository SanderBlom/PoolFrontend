//This file is used to store functions related to fetching data from the pool table. 
const { pool } = require("./dbConfig");

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
    let result //Initizlising an object to store data from database
    let error //Initizlising an object to store error if query failed
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
    const query = `INSERT INTO public.users(username, firstname, lastname, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *;`
    const values = [`${username}`, `${firstname}`, `${lastname}`, `${email}`, `${password}`]
    let results

    try {
        results = await pool.query(query, values)
    } catch (err) {
        console.log(err)
    }
    if (results.rows[0].username == username){
        return true
    }
    else{return false}

   
}

//Exporting all the functions so they can be access by server.js
module.exports = { ValidateUniqueEmail, ValidateUniqueUsername, UpdaterUserDetails, RegisterNewUser}
