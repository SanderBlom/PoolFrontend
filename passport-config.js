
//Source 1  = https://www.passportjs.org/docs/

//Source 2 = https://github.com/WebDevSimplified/Nodejs-Passport-Login
const LocalStrategy = require('passport-local').Strategy //Local strategy. Other options could be login with google, facebook, local, etc
const bcrypt = require('bcrypt') //Require becrypt to give us hashing functionality
const {pool} = require("./dbConfig") //Required to query the database
function initialize(passport) {
    console.log("Passport Initialized");
  
    const authUser = (username, password, done) => {
      username = username.toLowerCase()
      pool.query(
        `SELECT userid, username, password, active FROM users WHERE username = $1`,
        [username],
        (err, results) => {
          if (err) {
            throw err;
          }
  
          if (results.rows.length > 0) {
            const user = results.rows[0];
  
            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) {
                console.log(err);
              }
              if (isMatch) {
                if(user.active){
                  return done(null, user);
                }
                else{
                  //User is deactivated
                  return done(null, false, {
                    message: "User is deactivated."
                  })
                }
                
              } else {
                //password is incorrect
                return done(null, false, {
                  message: "Incorrect password"
                })
              }
            });
          } else {
            //No user found with that username
            return done(null, false, {
              message: "No user with that username could be found"
            });
          }
        }
      );
    };
  
    passport.use(
      new LocalStrategy(
        { usernameField: "username", passwordField: "pwd"},
        authUser, 
      )
    );
    
    passport.serializeUser((user, done) => done(null, user.userid));
  
    passport.deserializeUser((userid, done) => {
      pool.query(`SELECT userid, username, firstname, lastname, email FROM users WHERE userid = $1`, [userid], (err, results) => {
        if (err) {
          return done(err);
        }
        return done(null, results.rows[0]);
      });
    });
  }
  
  module.exports = initialize;