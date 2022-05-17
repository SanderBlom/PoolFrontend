
const express = require('express'); //Web server
const session = require('express-session') //Used to keep track of sessions
const flash = require('express-flash');//Used for flash messages
const methodOverride = require('method-override') //Used to override methods.
const passport = require('passport') //Lib to keep track of logged in users
const bcrypt = require('bcrypt'); //This is used to hash password and check hashes so we dont store the passwords in plain text
require('dotenv').config(); //Used to store passwords. This should not be uploaded to github :) 
let vision = require("./vision.js") //Used to communicate with the vision systems API
let db = require("./database.js") //Used to access the database functions
let canvas = require("./canvas.js") //Used to access the database functions
const https = require('https')
const fs = require('fs')
const path = require('path')
const initializePassport = require("./passport-config");
const httpApp = express();
const http = require('http');

let app = express();
//Redirect all http requests to https
httpApp.get("*", function (req, res, next) {
    res.redirect("https://" + req.headers.host + req.path);
});



app.set('view engine', 'ejs'); // Changing the view engine to ejs
app.use(express.static('views'));//Gives express access to views folder 
app.use(express.urlencoded({ extended: false }))


initializePassport(passport);

app.use(
    session({
        secret: process.env.SESSION_SECRET,//Encryption key for our sessions.
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 3600000 } //Session timeout.
    })
);
// Funtion inside passport which initializes passport
app.use(passport.initialize()); //Starting passport to keep track of our users
app.use(passport.session());// Store our letiables to be persisted across the whole session. Works with app.use(Session) above
app.use(flash()); //Used for to display flash messages to the frontend
app.use(methodOverride('_method')) //used for triggering .delete functions with posts function in html



//Checks if user is logged in.
function checkAuth(req, res, next) {
    if (req.user) {
        return next()
    }
    else {
        res.redirect("/login")
    }
}

//Checks if the user is not logged in
function checkNotAuth(req, res, next) {
    if (req.user) {
        //If user is logged in and tries to access any route using this middleware they will be redirected to their homepage
        res.redirect("/user/dashboard")
    }
    else {
        next()
    }
}

app.delete('/logout', (req, res) => {
    req.logOut()
    req.flash('message', "You have logged out")
    res.redirect("/")
})

app.get("/login", checkNotAuth, (req, res) => {

    res.render("login", { title: 'login', message: req.flash('message') })
})

app.post("/login", checkNotAuth, passport.authenticate('local', {
    //Function to fetch login credentials and potentially login the user.The checkNotAuth is middleware to check if the usr/pw is valid
    successRedirect: '/user/dashboard',
    failureRedirect: '/login',
    failureFlash: true


}))


app.get("/", async (req, res) => {
    //Checks if user is logged in or not
    if (req.user) {
        let userid = req.user.userid
        let username = req.user.username
        res.render('index', { message: req.flash('message'), username, user: userid, title: 'index' }) //Renderes the index websites and passes title for the navbar
    }
    else {
        let userid = null
        let username = null
        res.render('index', { message: req.flash('message'), username: username, user: userid, title: 'index' }) //Renderes the index websites and passes title for the navbar
    }
})


app.get("/register", checkNotAuth, (req, res) => {

    res.render('register', { message: req.flash('message'), title: 'register' }) //Renders the register websites and passes different letiables for flash message and title for navbar
})

app.post("/register", checkNotAuth, async function (req, res) {
    let { username, firstname, lastname, email, pwd, repwd } = req.body
    let usernameresponse //Calling function to check if the username is not taken.
    let emailresponse //Calling function to check if the email is not taken.
    let InsertUserResult // Calling function to insert data into the database
    let emailerror
    username = username.toLowerCase() //Makes the username lowercase

    //Checks that the email passes the regex in const emailRegexp.
    //Found the expression at: https://stackoverflow.com/questions/52456065/how-to-format-and-validate-email-node-js
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (emailRegexp.test(email) == false) {
        req.flash('message', 'The email you provided does not pass our email validator. Have you made a typo?')
        res.redirect("register")
    }

    if (pwd == repwd) {
        //Checks if the email and username is already in the database
        try {
            emailresponse = await db.ValidateUniqueEmail(email)
            usernameresponse = await db.ValidateUniqueUsername(username)

        } catch (err) {
            err = emailerror
        }
        if (emailerror) {
            res.sendStatus(400).send(`Could not check username and email validity..<a href="/">Go back</a> Error: ` + emailerror)
        }
        else {
            if ((usernameresponse == true) && (emailresponse == true)) {
                //Both email and username are unique. Lets let the user create the account.
                const validatorregex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{12,34}$/;
                if(validatorregex.test(pwd) == true){
                    try {
                        const hashedPassword = await bcrypt.hash(pwd, 10) //Hashing the password
                        InsertUserResult = await db.RegisterNewUser(username, firstname, lastname, email, hashedPassword)
                    }
                    catch (error) {
                        console.log(error)
                    }
                    if (InsertUserResult) {
                        req.flash('message', `You are now registered and can login!`)
                        res.redirect("login")
                    }
                    else {
                        req.flash('message', `Ops, something went wrong..`)
                        res.redirect("register")
                    }

                }
                else{
                    req.flash('message', `Password does not meet the minimum requirements`)
                    res.redirect("login")
                }
               
            }
            //Checks if email or username is unique.
            else if ((usernameresponse != true) || (emailresponse != true)) {
                let emailerror = 'Looks like your email is already in use'
                let usernameerror = 'Looks like your username is already in use'
                let usernameandemailerror = 'Looks like both email and username is already in use'

                if (usernameresponse == false && emailresponse == false) {
                    //This should be triggered if both username and email is already in use. 
                    req.flash('message', usernameandemailerror)
                    res.redirect("register")
                }

                else if (usernameresponse == false) {
                    //This should be triggered if the username is already in use.
                    req.flash('message', usernameerror)
                    res.redirect("register")
                }

                else if (emailresponse == false) {
                    //This should be triggered if the email is already in use.
                    req.flash('message', emailerror)
                    res.redirect("register")
                }
                else {
                    req.flash('message', 'Not sure what you did but something broke')
                    res.redirect("register")
                }
            }
        }


    }
    else {
        req.flash('message', 'The password entered did not match.')
        res.redirect("register")
    }

})
//Gets the users profile page
app.get("/user/dashboard", checkAuth, async (req, res) => {
    let userid = req.user.userid
    let username = req.user.username
    let firstname = req.user.firstname
    let lastname = req.user.lastname
    let email = req.user.email
    let error
    let wl, avwl, ingame, previousgames, gameid, tournamentdetails

    try {
        [wl, avwl, ingame, previousgames, tournamentdetails] = await Promise.all([db.PersonalStatsWL(userid), db.AvrageStatsWL(),
        db.IsUserInAGame(userid), db.GetPreviousGameList(userid), db.GetTournamentDetails(userid)]); //Gets necessary data from the db (runs all the functions in parallel)
    } catch (err) {
        error = err
    }

    if (error) {
        console.log(error)
        res.sendStatus(404, `Something went wrong. Error: ${error}`)
    }
    else {
        const tournamentname = tournamentdetails.name
        const tournamentid = tournamentdetails.id
        if (ingame == true) {
            gameid = await db.GetGameIDForActiveGame(userid)
            res.render("profile", {
                username, gameid, user: userid, firstname, lastname, email, ingame, message: req.flash('message'), gamemessage: req.flash('gamemessage'),
                personalWL: wl, averagewl: avwl, gamelist: previousgames, tournamentname, tournamentid, title: 'profile'
            })

        }
        else {
            res.render("profile", {
                username, gameid, user: userid, firstname, lastname, email, ingame, message: req.flash('message'), gamemessage: req.flash('gamemessage'),
                personalWL: wl, averagewl: avwl, gamelist: previousgames, tournamentname, tournamentid, title: 'profile'
            })
        }
    }



})

app.post("/game/previous/", checkAuth, async (req, res) => {
    let { gameid } = req.body
    const userid = await req.user.userid

    let validate = await db.ValidateGameAccess(userid, gameid) //We validate that the user has access to the requested game
    if (validate) {
        res.redirect(`/game/previous/${gameid}`)
    }
    else {
        console.log('You dont have access to watch other users games')
    }

})

app.get("/game/previous/:id", checkAuth, async (req, res) => {
    let gameid = req.params.id.trim()
    const userid = await req.user.userid
    const username = req.user.username
    let validate = await db.ValidateGameAccess(userid, gameid)
    let player1Username = null//This stores player1 name 
    let player2Username = null//This stores player2 name 
    let error
    let time
    let balls = []
    let usernames
    let winner = null
    let loser = null
    let images
    if (validate) {

        try {
            [winner, loser, balls, time, gamestatus, usernames] = await Promise.all([db.GetGameWinner(gameid), db.GetGameLoser(gameid), db.GetAllBallPositions(gameid),
            db.TotalGameTime(gameid), db.IsGameActive(gameid), db.fetchUsernamesInGame(gameid)]); //This runs all the functions in parallel to reduce execution time
            player1Username = usernames[0]
            player2Username = usernames[1]
            images = await canvas.RenderMultipleTables(balls) //Function returns an array with images of the selected canvas.

        } catch (err) {
            error = err

        }
        if (error) {
            res.sendStatus(404, `Something went wrong. Error: ${error}`)
        }

        else {
            try {
                res.render('previousgame', {
                    message: req.flash('message'), username, user: userid, title: 'test', images: images, gameid: gameid,
                    constatus: gamestatus, player1Name: player1Username, player2Name: player2Username, minutes: time, winner: winner, loser: loser
                })

            } catch (error) {
                console.log('User is not probably not logged in' + error)
            }
        }

    }
    else {
        req.flash('gamemessage', `Looks like you dont have access to this canvas.`)
        res.redirect("/user/dashboard")
    }

})

app.post("/user/dashboard", checkAuth, async (req, res) => {
    let { username, firstname, lastname, email } = req.body
    const id = await req.user.userid
    let result;

    result = await db.UpdaterUserDetails(firstname, lastname, email, id)

    //Check that the result is true
    if (result == true) {
        req.flash('message', `Data updated!`)
        res.redirect("/user/dashboard")
    }
    else {
        req.flash('message', `Could not update user details..`)
        res.redirect("/user/dashboard")
    }
})

app.post("/admin/activateuser", checkAuth, async (req, res) => {
    //This post is used to activate users from the admin panel 
    let { usernames } = req.body
    const usr = await req.user.username
    let result = null
    let error = null
    if (usr == 'admin') {
        try {
            result = await db.ActivateUser(usernames)
        }
        catch (err) {
            err = error
        }
        if (error) {
            console.log(error)
            req.flash('message', `Could not activate user. Check the logs for more details`)
            res.redirect("/admin")
        }
        else {
            if (result == true) {
                req.flash('message', `Activated user: ` + usernames)
                res.redirect("/admin")
            }
            else {
                req.flash('message', `Could not activate user. No response from database`)
                res.redirect("/admin")
            }
        }
    }
    else {
        req.flash('message', `You don't have access to this page`)
        res.redirect("/")
    }

})

app.post("/admin/deactivateuser", checkAuth, async (req, res) => {
    //This post is used to activate users from the admin panel 
    let { usernames } = req.body
    const usr = await req.user.username
    let result = null
    let error = null
    if (usr == 'admin') {
        try {
            result = await db.DeactivateUser(usernames)
        }
        catch (err) {
            err = error
        }
        if (error) {
            console.log(error)
            req.flash('message', `Could not deactivate user. Check the logs for more details`)
            res.redirect("/admin")
        }
        else {
            if (result == true) {
                req.flash('message', `Deactivated user: ` + usernames)
                res.redirect("/admin")
            }
            else {
                req.flash('message', `Could not deactivate user. No response from database`)
                res.redirect("/admin")
            }
        }
    }
    else {
        req.flash('message', `You don't have access to this page`)
        res.redirect("/")
    }

})
app.post("/admin/addtable", checkAuth, async (req, res) => {
    //This post is used to activate users from the admin panel 
    let { ip } = req.body
    const usr = await req.user.username
    let tableid
    if (usr == 'admin') {
        try {
            tableid = await db.AddNewTable(ip)
        }
        catch (err) {
            console.log(err)
        }
        req.flash('ipmessage', `Added new table with ID: ${tableid}`)
        res.redirect("/admin")
    }
    else {
        req.flash('message', `You don't have access to this page`)
        res.redirect("/")
    }

})
app.post("/admin/deactivatetable", checkAuth, async (req, res) => {
    //This post is used to deactivate a table in the database
    let { tableid } = req.body
    const usr = await req.user.username
    let result = null
    let error = null
    if (usr == 'admin') {
        try {
            result = await db.DeactivateTable(tableid)
        }
        catch (err) {
            err = error
        }
        if (error) {
            console.log(error)
            req.flash('ipmessage', `Could not deactivate the table. Check the logs for more details`)
            res.redirect("/admin")
        }
        else {
            if (result == true) {
                req.flash('ipmessage', `Deactivated table: ` + tableid)
                res.redirect("/admin")
            }
            else {
                req.flash('ipmessage', `Could not deactivate the table.. No response from database`)
                res.redirect("/admin")
            }
        }
    }
    else {
        req.flash('message', `You don't have access to this page`)
        res.redirect("/")
    }

})

app.post("/admin/activatetable", checkAuth, async (req, res) => {
    //This post is used to deactivate a table in the database
    let { tableid } = req.body
    const usr = await req.user.username
    let result
    let error
    if (usr == 'admin') {
        try {
            result = await db.ActivateTable(tableid)
        }
        catch (err) {
            err = error
        }
        if (error) {
            console.log(error)
            req.flash('ipmessage', `Could not activate table. Check the logs for more details`)
            res.redirect("/admin")
        }
        else {
            if (result == true) {
                req.flash('ipmessage', `Activated table: ` + tableid)
                res.redirect("/admin")
            }
            else {
                req.flash('ipmessage', `Could not activate table. No response from database`)
                res.redirect("/admin")
            }
        }
    }
    else {
        req.flash('message', `You don't have access to this page`)
        res.redirect("/")
    }

})
//This is taking the submitted tableid from users dashboard and checks if the table is free. If its free user will be redirected the new game page.
app.post("/game/create", checkAuth, async (req, res) => {
    const tableid = await req.body.tableid.trim()
    const userid = await req.user.userid
    let tableAvailability = false;
    let gameid = null
    try {
        tableAvailability = await vision.CheckTableAvailability(tableid)  //Checks the tableid the user has submitted, and ask the visionsystem if the table is available 
    } catch (error) {
        console.log(error)
    }

    if (tableAvailability == true) {
        gameid = await db.CreateNewGame(tableid) //Creating a game and returning the game id.
    }

    else {
        console.log('Table is in use')
        req.flash('gamemessage', `Looks like the table is already in use or does not exsist.`)
        res.redirect("/user/dashboard")
    }

    if (gameid != null) {
        let result = await db.JoinGame(gameid, userid)
        if (result == true) {
            req.flash('message', `Please give your opponent the game ID so they can join.`)
            res.redirect(`/game/${gameid}`)
        }
        else {
            req.flash('gamemessage', `Could not create a new canvas. Please contact staff`)
            res.redirect("/user/dashboard")
        }
    }
    else {
        console.log('Something broke')
    }
})

app.delete("/game/cancel/:id", checkAuth, async (req, res) => {
    let gameid = req.params.id.trim();
    const usr = await req.user.username
    let error


    if (usr == 'admin') {
        try {
            let result = await vision.SendStop(gameid)

            if (result == 200) {
                await db.CancelGame(gameid)
                console.log('Canceled canvas. API response: ' + result)
            }
            else {
                error = `Could not cancel the canvas. Bad response from API. Response: ${result} `
                console.log('Could not cancel canvas. API response:' + result)
            }

        } catch (err) {
            err = error
        }
        if (error) {
            req.flash('mgmtmessage', 'Could not cancel your game with gameID:' + gameid)
            res.redirect("/admin")
        }
        else {
            req.flash('mgmtmessage', 'Canceled game with gameid:' + gameid)
            res.redirect("/admin")
        }
    }

    else {
        try {
            let result = await vision.SendStop(gameid)

            if (result == 200) {
                await db.CancelGame(gameid)
                console.log('Canceled canvas. API response: ' + result)
            }
            else {
                error = `Could not cancel the canvas. Bad response from API. Response: ${result} `
                console.log('Could not cancel canvas. API response:' + result)
            }

        } catch (error) {
            err = error
        }

        if (error) {
            req.flash('gamemessage', 'Could not cancel your game with gameID:' + gameid)
            res.redirect("/user/dashboard")
        }
        else {
            req.flash('gamemessage', 'Canceled game with gameid:' + gameid)
            res.redirect("/user/dashboard")
        }
    }

})

app.post("/game/start/:id", checkAuth, async (req, res) => {
    let gameid = req.params.id.trim(); //Getting gameid from url
    let { username1, username2 } = await req.body //Getting usernames from post request.
    let username = await req.user.username //Getting logged in users username
    let tablestatus //Stores the table status. This should be true if there are no active games on the table.
    let tableid

    //Checking that the usernames are not empty. We need two players to start a canvas.
    if (username1 != '' && username2 != '') {
        //Checks that the game is not allready started
        let gamestatus = await db.IsGameActive(gameid)
        if (gamestatus == true) {
            res.redirect(`/livegame/${gameid}`)
        }
        else {
            let playerids = await db.GetPlayerIDinGame(gameid)
            let playerid1 = playerids[0]
            let playerid2 = playerids[1]
            if ((username == username1) || (username == username2)) //Checks that the logged in user is one of the players in the game 
            {
                tableid = await db.GetTableID(gameid) //Fetches the tableid for the canvas. 
                tablestatus = await vision.CheckTableAvailability(tableid) //Checks that nobody has started a game on the same table.
                if (tablestatus == true) {

                    let response = await vision.SendStart(gameid, playerid1, playerid2, username1, username2) //Send data to API to check. Returns HTTP status codes

                    if (response == 200) {
                        let creategame = await db.StartGame(gameid)
                        if (creategame == true) {
                            res.redirect(`/livegame/${gameid}`)
                        }
                        else {
                            vision.SendStop(gameid) //Stoping the game if it started on the vision system.
                            console.log('Could not insert the gamedata into the database')
                            req.flash('gamemessage', 'Could not start the game')
                            res.redirect("/user/dashboard")
                        }
                    }
                    else {
                        req.flash('gamemessage', `Error in response from API. HTTP response: ${response}`)
                        res.redirect("/user/dashboard")
                    }
                }
                else if (tablestatus == false) {
                    req.flash('gamemessage', 'Table is already in use.')
                    res.redirect("/user/dashboard")
                }
                else {
                    req.flash('gamemessage', 'No response from API')
                    res.redirect("/user/dashboard")
                }
            }

            else {
                //If the user trying to start the game is not one of the users that plays. Redirect him back to his profile.
                req.flash('message', 'Looks like your dont have access to stop this game')
                res.redirect("/")
            }
        }

    }

    else{
        console.log('Missing one or more players...')
        req.flash('message', `You can not start the game with just one player.`)
        res.redirect(`/game/${gameid}`)

    }

})
app.get("/game/:id", checkAuth, async (req, res) => {
    let gameid = req.params.id.trim();
    let gamestartedstatus
    let username1 = null
    let username2 = null
    let username = req.user.username // fetching username to use in the navbar
    let usernames = null
    let error = null
    let tableid
    let gameactivestatus

    try {
        gameactivestatus = await db.HasGameEnded(gameid) //If the game has ended it will return true.
    } catch (err) {
        console.log(error)
        err = error
    }
     

    if (!gameactivestatus){
        //If the game has not ended we can continue to try to display the page.
        try {
            tableid = await db.GetTableID(gameid)
            usernames = await db.fetchUsernamesInGame(gameid) //returns an array with users added to the game
    
            if (usernames == null) {
                username1 == null
                username2 == null
            }
            else {
                username1 = usernames[0]
                username2 = usernames[1]
            }
            if (username1 != null && username2 != null) {
                gamestartedstatus = await db.IsGameActive(gameid)
            }
        }
        catch (err) {
            error = err
        }
        if (error) {
            console.log('Error... getting game details')
            console.log(error)
            res.sendStatus(404).send(`Could not get the game details..<a href="/">Go back</a>`)
        }
        else {
            if (username1 == null && username2 == null) {
                res.redirect("/login")
            }
            else if (req.user) {
                if (username != username1 && username != username2) {
                    //If user is not a part of the game they should be redirected 
                    res.sendStatus(404).send(`Looks like your not supposed to be here...<a href="/">Go back</a> `)
                    console.log('Her gikk noe galt')
    
                }
                else {
                    let userid = req.user.userid
                    res.render('gameWizard', { message: req.flash('message'), username, username1, username2, user: userid, gameid, title: 'game', tableid, gamestatus: gamestartedstatus })
                }
    
            }
    
    
            else {
                res.redirect("/login")
            }
        }
    }
    else{
        //If the game has ended we redirect the user back to their profile page.
        req.flash('gamemessage', 'Looks like the game has ended')
        res.redirect('/user/dashboard')
    }
   
})

//This page loads after you have picked a table and the system has checked that its not in use.
app.get("/game/create/:id", checkAuth, (req, res) => {
    let tableid = req.params.id.trim();
    let player2Username
    try {
        if (req.user) {
            let userid = req.user.userid
            let username = req.user.username
            res.render('gameWizard', { message: req.flash('message'), username, player2Username, user: userid, title: 'game', tableid })
        }
        else {
            res.redirect("/login")
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }

})

app.post("/user/dashboard/joingame/", checkAuth, async (req, res) => {
    let gameid = await req.body.gameid
    let userid = await req.user.userid

    //Validate that the game exsist and has not been started or ended
    let players = await db.CheckPlayerCountInGame(gameid)

    if (players >= 2) {
        req.flash('gamemessage', "Looks like the game is full")
        res.redirect("/user/dashboard/")
    }

    else {
        let result = await db.AddPlayerToGame(gameid, userid)
        if (result == true) {
            res.redirect(`/game/${gameid}`)
        }
        else {
            req.flash('gamemessage', "Could not add you to the canvas. It's either full or does not exsist")
            res.redirect("/user/dashboard/")
        }
    }
})

//Fetches the scoreboard
app.get("/scoreboard", async (req, res) => {
    let data = await db.GetWLSummary()
    let usernames = []
    let wl = []
    for (let index = 0; index < data.length; index++) {
        //Adds usernames and win/loss ratio to two arrays
        let name = data[index].username
        //name = await addQuotes(name)
        usernames.push(name)
        wl.push(data[index].wl)

    }
    //Sorting array from high to low
    //Adding the data into one array
    let Data = [];
    for (let i = 0; i < usernames.length; ++i) {
        Data.push({
            label: usernames[i],
            data: wl[i]
        });
    }

    // Sorting the array based on the W/L ratio (dec)
    Data.sort((a, b) => parseFloat(b.data) - parseFloat(a.data));

    //Splittng the data into two arrays.
    let sortedLabels = Data.map(e => e.label);
    let sortedData = Data.map(e => e.data);

    try {
        if (req.user) {
            let userid = req.user.userid
            let username = req.user.username
            let firstname = req.user.firstname
            let lastname = req.user.lastname
            res.render('statistics', { message: req.flash('message'), username, user: userid, title: 'scoreboard', Usernames: sortedLabels, WL: sortedData }) //Renderes the statistic websites and passes title for the navbar
        }
        else {
            let userid = null
            let username = null
            res.render('statistics', { message: req.flash('message'), username: username, user: userid, title: 'scoreboard', Usernames: sortedLabels, WL: sortedData }) //Renderes the statistic websites and passes title for the navbar
        }

    } catch (error) {

        console.log(error)

    }
})

app.get("/rules", (req, res) => {

    try {
        if (req.user) {
            let userid = req.user.userid
            let username = req.user.username
            res.render('rules', { message: req.flash('message'), username, user: userid, title: 'rules' }) //Renderes the index websites and passes title for the navbar
        }
        else {
            let userid = null
            let username = null
            res.render('rules', { message: req.flash('message'), username: username, user: userid, title: 'rules' }) //Renderes the index websites and passes title for the navbar
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }

})

app.get("/tutorial", (req, res) => {

    try {
        if (req.user) {
            let userid = req.user.userid
            let username = req.user.username
            res.render('tutorial', { message: req.flash('message'), username, user: userid, title: 'tutorial' }) //Renderes the index websites and passes title for the navbar
        }
        else {
            let userid = null
            let username = null
            res.render('tutorial', { message: req.flash('message'), username: username, user: userid, title: 'tutorial' }) //Renderes the index websites and passes title for the navbar
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }

})


app.get("/tournament/new", checkAuth, (req, res) => {
    let username = req.user.username
    let userid = req.user.userid
    res.render('tournamentWizard', { message: req.flash('message'), username: username, user: userid, title: 'tournament' }) //Renderes the index websites and passes title for the navbar




})

app.post("/tournament/new", checkAuth, async (req, res) => {

    let tournament = req.body //Gets body from POST
    let tournamentName = tournament.TournamentName //storing tournament name
    let usernames = tournament.usernames //array of usernames to add to tournament
    let invalidusernames = []
    let usernamearray = []
    for (let index = 0; index < usernames.length; index++) {
        const username = usernames[index];
        let validation = await db.ValidateUniqueUsername(username) //Checks if the username exist in the db

        if (validation == true) {
            //If username is not found in the db is added to the invalidusername array
            invalidusernames.push(username)
        }


    }

    if (invalidusernames.length == 0) {
        //Cheks that we dont have any invalid usernames
        console.log('Valid')
        let id = await db.CreateNewTournament(tournamentName)

        let playerids = []

        for (let index = 0; index < usernames.length; index++) {
            const username = usernames[index]
            let playerid = await db.GetPlayerIDFromUsername(username)
            playerids.push(playerid)
        }
        await db.AddPlayersToTournament(id, playerids)
    }
    else {
        if(invalidusernames.length == 1){
            let invalidusernamestring = ''
            invalidusernames.forEach(username => {
               invalidusernamestring = invalidusernamestring + ' ' + username
           });
           req.flash('message', 'The username:' + invalidusernamestring + ' is invalid.')
           res.redirect('back');
        }
        else{
            let invalidusernamestring = ''
            invalidusernames.forEach(username => {
               invalidusernamestring = invalidusernamestring + ' ' + username + ','
           });
           req.flash('message', 'The usernames:' + invalidusernamestring + ' are invalid.')
           res.redirect('back');
        }
    }
})

app.delete("/tournament/leave/:id", checkAuth, async (req, res) => {
    //Removes user for requested tournament id
    const tournamentid = req.params.id
    const userid = await req.user.userid
    let error


    try {
        db.RemoveUserFromTournament(userid, tournamentid)
    } catch (err) {
        console.log(err)
        error = err
    }

    if (error) {
        req.flash('message', 'Could not delete your from the tournament')
        res.redirect("/user/dashboard")
    }

    else {
        req.flash('message', 'Deleted you from the tournament')
        res.redirect("/user/dashboard")
    }


})
app.post("/livegame", async (req, res) => {
    //This just forwards the users search to the correct page.
    let { gameid } = req.body
    res.redirect(`/livegame/${gameid}`)
})

app.get("/livegame/:id", async (req, res) => {
    let gameid = req.params.id.trim(); //Fetches game id from url
    let player1Username = null
    let player2Username = null
    let error
    let time
    let balls
    let usernames
    let gamestatus
    let winner = null
    try {
        [winner, balls, time, gamestatus] = await Promise.all([db.GetGameWinner(gameid), db.latestBallPosition(gameid), db.TimePlayed(gameid),
        db.IsGameActive(gameid)]); //This runs all the functions in parallel to save execution time

        if (gamestatus == true) {
            usernames = await db.fetchUsernamesInGame(gameid)
            player1Username = usernames[0]
            player2Username = usernames[1]
        }

    } catch (err) {
        error = err

    }
    if (error) {
        res.status(400).send(`Problems fetching gamedata. <a href="/">Go back</a> ` + error)
    }

    else {
        try {
            if (req.user) {
                let userid = req.user.userid
                let username = req.user.username
                canvas.RenderSingleTable(balls)
                    .then((image) => res.render('game', {
                        message: req.flash('message'), username, user: userid, title: 'test', gameimage: image, gameid: gameid,
                        constatus: gamestatus, player1Name: player1Username, player2Name: player2Username, minutes: time, winner: winner
                    }))

            }
            else {
                let userid = null
                let username = null
                canvas.RenderSingleTable(balls)
                    .then((image) => res.render('game', {
                        message: req.flash('message'), username, user: userid, title: 'test', gameimage: image, gameid: gameid,
                        constatus: gamestatus, player1Name: player1Username, player2Name: player2Username, minutes: time, winner: winner
                    }))

            }

        } catch (error) {
            console.log('User is not probably not logged in' + error)
        }
    }


})

app.get("/about", (req, res) => {

    try {
        if (req.user) {
            let userid = req.user.userid
            let username = req.user.username
            res.render('about', { message: req.flash('message'), username, user: userid, title: 'about' }) //Renderes the index websites and passes title for the navbar
        }
        else {
            let userid = null
            let username = null
            res.render('about', { message: req.flash('message'), username: username, user: userid, title: 'about' }) //Renderes the index websites and passes title for the navbar
        }

    } catch (error) {
        console.log('User is not probably not logged in' + error)
    }

})

app.get("/admin", checkAuth, async (req, res) => {
    //Checks that the user is 
    let userid = req.user.userid
    let username = req.user.username
    let usernames = []
    let activegames = []
    let tables = []
    let tableids = []
    let inactivetableids = []
    let inactiveusersnames = []

    if (username == "admin") {

        try {
            [usernames, activegames, tables, tableids, inactivetableids, inactiveusersnames] = await Promise.all([db.GetAllUserNames(), db.GetAllActiveGames(), db.GetAllTables(),
            db.GetAllActiveTableIds(), db.GetAllInActiveTableIds(), db.GetAllInactiveUserNames()]); //This runns all the functions in parallel to save execution time
        } catch (err) {
            error = err
        }
        res.render('admin', {
            message: req.flash('message'), ipmessage: req.flash('ipmessage'), mgmtmessage: req.flash('mgmtmessage'), username, user: userid, title: 'admin', usernames, activegames,
            tables, tableids, inactivetableids, inactiveusersnames
        })
    }
    else {
        req.flash('message', "You don't have access to this page")
        res.redirect("/")
    }

})


//--------------------------------Last route to  match any incorect urls----------------//
app.all('*', function(req, res) {
    res.status(404).send(`Looks like that pages does not exsist. <a href="/">Go back</a> `)
  }); 

//-------------------------------------Start server-------------------------------------//
//Loading the private key and the certificate
const sslServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'privkey.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'fullchain.pem'))
}, app)

//Starting server
let PORT
if (process.env.DEVELOPMENT == 'false') {
    PORT = 443 //Ports that the server will listen to.
}
else {
    PORT = 3000 //Ports that the server will listen to.
}
sslServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}. Time & Date = ` + new Date().toString());

})

if (process.env.DEVELOPMENT == 'false') {
    //Setting up a http server to redirect all requests to the https server
    http.createServer(httpApp).listen(80, function () {
        console.log("Redirect server listening on port 80");
    });
}


//-------------------------------------End server-------------------------------------//