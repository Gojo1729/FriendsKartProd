var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var userSchema = new mongoose.Schema({
   username:{type:Number,unique:true,required:true},
   password:String,
   Image:String,
   ImageId:String,
   isAdmin:{type:Boolean,default:false},
   usn:{type:String,unique:true,required:true},
   profileName:String,
   email:{type:String,unique:true,required:true},
   resetPasswordExpires:Date,
   resetPasswordToken:String,
   lastLogIn:String,
   verified:{type:Boolean,default:false},
   verifyToken:String,
   verfiyExpiry:Date,
   phoneNo:{type:Number,unique:true,required:true},
   created:{type:Date,default:Date.now}
  
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",userSchema);
