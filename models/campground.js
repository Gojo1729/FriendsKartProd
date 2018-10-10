
var mongoose = require("mongoose");

var Comment = require("../models/comments");

var campGroundSchema = new mongoose.Schema({
   name:String,
   image:String,
   imageId:String,
   description:String,
   sale:Boolean,
   date:{type:Date,default:Date.now},
   category:{type:String,default:"Miscallenous"},
   requestedBy:String,
   sold:{type:Boolean,default:false},
   recieved:{type:Boolean,default:false},
   agree :{type:Boolean,default:false},
   money:{type:Boolean,default:false},
   price:Number,
   favourite:[{
     id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
     },
     username:String
   }],
   author:{
      id:{
         type:mongoose.Schema.Types.ObjectId,
         ref:"User"
      },
      username:String
   },
   comments:[
      {
         type:mongoose.Schema.Types.ObjectId,
         ref:"Comment"
      }]
});
campGroundSchema.pre('remove', function(next) {
  
    console.log("inside remove");
    Comment.remove({}).exec();
   
    next();
});

module.exports = mongoose.model("Camp",campGroundSchema);
