require('dotenv').config();
var express = require("express");
var app = express();
var compression = require('compression');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var passport = require("passport");
var flash    = require("connect-flash");
var localStrategy = require("passport-local");
var User = require("./models/user");
var methodOverride = require("method-override");
var campgroundRoutes = require("./routes/campgrounds");
var commentRoutes    = require("./routes/comments");
var userRoutes = require("./routes/category");
var indexRoutes      = require("./routes/index");


 mongoose.connect(process.env.database_url);

//mongoose.connect("mongodb://localhost/friendskart_v15");//last element specifies to name of the database and this
// line is used to create a database.

app.use(compression());

app.use(express.static(__dirname+"/public"));

app.use(bodyParser.urlencoded({extended:true}));

app.use(methodOverride("_method"));
app.use(flash());

app.use(session({
    secret:"csk sucks",
    resave:"false",
    saveUninitialized:"false",
    store:new MongoStore({
       url: "mongodb://shivu:shivu1998atmongolab@ds145752.mlab.com:45752/friendskart",
       touchAfter: 24 * 3600
    })
    
    
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next)
{
    res.locals.loggedUser = req.user;
    res.locals.error    = req.flash("error");
    res.locals.success  = req.flash("success");
    next();
    
});

app.use(commentRoutes);
app.use(userRoutes);
app.use(indexRoutes);

app.use(campgroundRoutes);



app.listen(process.env.PORT,process.env.IP,function(){
    console.log("friendsKart Server has started");
    
});