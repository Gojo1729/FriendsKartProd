require('dotenv').config();
var express = require("express");
var router  = express.Router();
var User = require("../models/user");
var passport = require("passport");
var multer = require('multer');
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var storage = multer.diskStorage({
    
  filename: function(req, file, callback) {
  
    

      
    callback(null, Date.now() + file.originalname);
     
  }
   
});
var imageFilter = function (req, file, cb) {
    
  
 
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, imageFilter:imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({ 
 
  cloud_name: 'uservalidation', 
  api_key: process.env.users_key, 
  api_secret: process.env.users_secret
});


router.get("/",function(req,res)
{
    
    res.render("landing.ejs");
    
});

router.get("/register",function(req, res) {
   
    res.render("register.ejs");
});

router.get("/resend",isLoggedIn,async (req, res,next) => {
   
   User.findById(req.user._id,function(err,user)
   {
     if(err)
     {
       req.flash("error","Something went wrong, please try again");
       return res.redirect("/campgrounds");
     }
     if(!user.verified)
     {
        async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
        user.verifyToken = token;
        // user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      
    },
    function(token, user, done) {
      
      var smtpTransport = nodemailer.createTransport({
     
        service: 'Gmail', 
        auth: {
          user: 'friendskarttech@gmail.com',
          pass:  process.env.gmail_pw
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'friendskarttech@gmail.com',
        subject: 'friendsKart Verification Email',
        text: 'You are receiving this because you (or someone else) have requested for email verification for your friendsKart account.\n\n' +
          'Please click on the following link, or paste this into your browser to verify your email with your account:\n\n' +
          'https://' + req.headers.host + '/verify/' + token + '\n\n' +
          'If you did not request this, please ignore this email.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
      
        if(!err){
           
            req.flash('success', 'An e-mail has been sent to ' + user.email + 'to verify.');
        done(err, 'done');
        }
        else
        {
           req.flash('error',"please enter valid email address");
           res.redirect("back");
        
           
           
           
        }
        
      
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/campgrounds');
  });
       
       
     }else
     {
        req.flash("success","Your account has already been verified");
       return res.redirect("/campgrounds");
     }
     
     
     
   });
   
   
    
});

router.post("/register",upload.single("userImage"), async(req, res,next)=>
{
    if(req.body.check){
     await cloudinary.v2.uploader.upload(req.file.path,{crop: "thumb", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" },async (err,result) =>{
       
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("back");
        }
         
    var newUser = new User(
        {username:req.body.username,
        usn:req.body.USN,
        phoneNo:req.body.number,
        profileName:req.body.Profilename,
        email:req.body.email,
        Image:result.secure_url,
        ImageId:result.public_id,
      
        });
   User.register(newUser,req.body.password,function(err,user)
       {
           if(err)
           {
               
               req.flash("error","Duplicate credentials");
              
               return res.redirect("/register");
           }
           
              passport.authenticate("local")(req,res,function(){
              
              req.flash("success","Welcome to friendsKart"+user.profileName+", please verify your email "+user.email);                                                         
             
              });
              async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
        user.verifyToken = token;
        // user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      
    },
    function(token, user, done) {
      
      var smtpTransport = nodemailer.createTransport({
     
        service: 'Gmail', 
        auth: {
          user: 'friendskarttech@gmail.com',
          pass:  process.env.gmail_pw
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'friendskarttech@gmail.com',
        subject: 'friendsKart Verification Email',
        text: 'You are receiving this because you (or someone else) have Signed up to friendskart.\n\n' +
          'Please click on the following link, or paste this into your browser to verify your email with your account:\n\n' +
          'https://' + req.headers.host + '/verify/' + token + '\n\n' +
          'If you did not request this, please ignore this email.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        if(!err){
       
        req.flash('success', 'An e-mail has been sent to ' + user.email + 'to verify.');
        done(err, 'done');
        }
        else
        {
          req.flash('error', 'enter valid email id');
          return next(err);
        }
        
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/campgrounds');
  });
          
               
           
       });
       
    
           
       
 
    });
     
      
    }else
    {
        req.flash("error","Please accept the terms and conditions to proceed");
                return res.redirect("/register");
           
    }

});

router.get("/login",function(req, res) {
   return res.render("login.ejs");
});


router.post("/verify/login/:token",function(req,res,next)
{
  var verifyuser=new User();
  User.find({username:req.body.username,verifyToken:req.params.token},function(err,user)
  {
    verifyuser=user[0];
    if(!err && user[0])
    {
       if(!user[0].verified){
         
      var d=new Date();
      d.setMinutes(d.getMinutes()+330);
  
      user[0].lastLogIn=d;
      user[0].save()
     
    passport.authenticate("local",
    {
        successRedirect:"/verifyagain/"+verifyuser.verifyToken,
        failureRedirect:"/login",
        failureFlash: true,
        successFlash: "Welcome to friendsKart!"
    })(req, res);
         
       }else
       {
         req.flash("success","Your account is already verified");
          passport.authenticate("local",
    {
        successRedirect:"/campgrounds",
        failureRedirect:"/login",
        failureFlash: true,
        successFlash: "Welcome to friendsKart!"
    })(req, res);
         
       }
      
    }
    else
    {
      req.flash("error","Token doesn't match with the user");
      res.redirect("back");
      
    }
    
    
  });
   
   
});


router.post("/login",function(req,res,next)
{
  User.find({username:req.body.username},function(err,user)
  {
    if(!err && user[0])
    {
    
      
      var d=new Date();
      d.setMinutes(d.getMinutes()+330);
  
      user[0].lastLogIn=d;
      user[0].save()
    }
    
    
  });
  
    passport.authenticate("local",
    {
        successRedirect:"/campgrounds",
        failureRedirect:"/login",
        failureFlash: true,
        successFlash: "Welcome to friendsKart!"
    })(req, res);
   
});

function isLoggedIn(req,res,next){
    
    if(req.isAuthenticated())
    {
        return next();
    }
    res.redirect("/login");
    
}

router.get("/logout",function(req,res){
  
    req.flash("success","logged you out!");
    req.logout();
    res.redirect("/campgrounds");
});


router.get("/forgot",function(req, res) {
   
   res.render("campgrounds/forgot.ejs");
    
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email, username:req.body.username }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      
      var smtpTransport = nodemailer.createTransport({
     
        service: 'Gmail', 
        auth: {
          user: 'friendskarttech@gmail.com',
          pass:  process.env.gmail_pw
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'friendskarttech@gmail.com',
        subject: 'friendsKart Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'https://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
       
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions. Processing may take few minutes ');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('campgrounds/reset.ejs', {token: req.params.token});
  });
});

router.get("/verifyagain/:token",function(req,res)
{
  
  async.waterfall([
    function(done) {
       
      User.findOne({ verifyToken: req.params.token}, function(err, user) {
        if (!user) {
        
          req.flash('error', 'Token is invalid');
          return res.redirect('back');
        }
        
        
        
            user.verifyToken = undefined;
            user.verified=true;

            user.save(function(err) {
              done(err, user);
            
            });
        
    })},
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'friendskarttech@gmail.com',
          pass: process.env.gmail_pw
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Your friendsKart account has been verified',
        text: 'Hello,\n\n' +
          'This is a confirmation that your account for the email ' + user.email + ' has been verified successfully.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your account has been verified.');
        done(err);
      });
    
  }], function(err) {
    res.redirect('/campgrounds');
  });
  
});
router.get("/verify/:token",function(req,res)
{
    
  //  res.redirect("/verify/login/"+req.paramas.token);
     User.findOne({ verifyToken: req.params.token}, function(err, user) {
       if(err)
       {
         req.flash("error","Whoops!!!Something went wrong");
        return res.redirect("/login");
       
         
       }
       if(user && !user.verified)
       {
         
         res.render("verifylogin.ejs",{token:req.params.token});
         
       }
       else
       {
        req.flash("error","Invalid token/This token is already used.Please try to LogIn");
        res.redirect("/login")
       }
       
     });
    
});
router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'friendskarttech@gmail.com',
          pass: process.env.gmail_pw
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});


module.exports = router;


