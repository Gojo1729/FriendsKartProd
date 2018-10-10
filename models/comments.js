var mongoose = require("mongoose");

var commentSchema = new mongoose.Schema({
    text:String,
    pid:{
        type:mongoose.Schema.Types.ObjectId,
         ref:"Comment"
    },
    size:{type:Number,default:0},
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:String
    },
    date:{type:Date,default:Date.now},
   comments:[
      {
         
         type:mongoose.Schema.Types.ObjectId,
         ref:"Comment"
      }]
});

module.exports = mongoose.model("Comment",commentSchema);