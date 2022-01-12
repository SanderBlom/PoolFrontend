
//Kilde1 = https://www.passportjs.org/docs/

//Kilde 2 =https://github.com/WebDevSimplified/Nodejs-Passport-Login
const LocalStrategy = require('passport-local').Strategy //Local strategy. Other options could be login with google, facebook, etc
const bcrypt = require('bcrypt') //Require becrypt to check hashes against user password 
const {pool} = require("./dbConfig") //Required to query the database
function initialize(passport) {
    console.log("Passport Initialized");
  
    const authUser = (username, password, done) => {
      pool.query(
        `SELECT id, username, password FROM users WHERE username = $1`,
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
                return done(null, user);
              } else {
                //password is incorrect
                return done(null, false, { message: "Password is incorrect" });
              }
            });
          } else {
            //No user found with that username
            return done(null, false, {
              message: "No user with that username"
            });
          }
        }
      );
    };
  
    passport.use(
      new LocalStrategy(
        { usernameField: "username", passwordField: "pwd" },
        authUser
      )
    );
    
    passport.serializeUser((user, done) => done(null, user.id));
  
    passport.deserializeUser((id, done) => {
      pool.query(`SELECT id, username, firstname, lastname, email FROM users WHERE id = $1`, [id], (err, results) => {
        if (err) {
          return done(err);
        }
        return done(null, results.rows[0]);
      });
    });
  }
  
  module.exports = initialize;