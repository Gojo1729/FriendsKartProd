var mongoose = require("mongoose")

var reviewSchema = new mongoose.Schema({
   stars:Number,
   review:String,
   owner:String,
   buyer:String,
   product:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Camp"
   }
   
    
});


module.exports =  mongoose.model("Review", reviewSchema);