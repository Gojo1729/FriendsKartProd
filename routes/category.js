var express = require("express");
var router = express.Router();
var Camp = require("../models/campground");
var compression = require('compression');
router.use(compression());


router.get("/products/specific/:catid",isLoggedIn,function(req,res){
   Camp.find({"category":req.params.catid, "sale":true},function(err,products){
       
       if(err){
             error(req,res);
      }else{
          
       if(req.query.search)
    {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
          Camp.find({name:regex, "category":req.params.catid },function(err,camps)
    {
        if(err)
        {
            error(req,res);
        }
        else{
            if(camps.length < 1)
            {
                req.flash("error","Your search "+req.query.search+" didn't match any of our products");
                return res.redirect("back");
                
            }else{
            res.render("campgrounds/search.ejs",{camps:camps,key:req.query.search});
            }
        }
        
    }).sort({"_id":-1});
  
        
    }
       
      else{
         
          res.render("campgrounds/specific.ejs",{camps:products,category:req.params.catid});

      } 
      
      }
       
   
   });
   
    
});


router.get("/product/add/fav/:id",isLoggedIn,function(req,res){
   
   Camp.findById(req.params.id,function(err,product)
   {
      if(err)
        {
           error(req,res);
            
        }else
        {
            var data={"_id":req.user._id,"username":req.user.profileName};
            
            product.favourite.push(data);
            product.save();
            req.flash("success","Added to myFavourites");
            res.redirect("/products/specific/"+product.category);
        }
       
   }).sort({"_id":-1});
    
});

router.get("/product/remove/fav/:id",isLoggedIn,function(req,res){
   
   Camp.findById(req.params.id,function(err,product)
   {
      if(err)
        {
            error(req,res);
        }else
        {
            var data={_id:req.user._id,username:req.user.profileName};
            
            product.favourite.remove(data);
            product.save();
            req.flash("success","Removed from myFavourites");
            res.redirect("back");
        }
       
   });
    
});



router.get("/products/myfav/:userid",isLoggedIn,function(req,res){
   
   Camp.find({"favourite._id":{$exists:true},"favourite":{$elemMatch:{"_id":req.user._id}}},function(err,products)
   {
       if(err)
       {
           error(req,res);
       }
       else
       {
          
           res.render("campgrounds/myfavs.ejs",{camps:products});
           
       }
       
   });
    
});





function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};





function isLoggedIn(req,res,next){
    
    if(req.isAuthenticated() )
    {
        if(req.user.verified)
        {
            return next();
        }
        else
        {
           
            req.flash("error","Your account is still not verfied for the email, "+req.user.email+"click to resend the verification email <a href=/resend> click here </a>");
            res.redirect("/campgrounds"); 
            
            
        }
      
    }
    else{
    req.flash("error","LogIn and be part of our community!!!");
    res.redirect("/login");
    
    }
}

function error(req,res)
{
    req.flash("error","Sorry,something went wrong please try again later");
    return res.redirect("back");
       
}

module.exports = router;