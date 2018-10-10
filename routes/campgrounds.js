require('dotenv').config();
var express = require("express");
var router = express.Router();
var Camp = require("../models/campground");
var multer = require('multer');
var User = require("../models/user");
var nodemailer = require("nodemailer");
var compression = require('compression');
var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
var fs = require('fs');
var md5 = require("md5")
var bcrypt = require("bcrypt");
const saltRounds = 10;
const visualRecognition = new VisualRecognitionV3({
	
	url: process.env.url,
	version: '2018-03-19',
	iam_apikey: process.env.visionapikey,
	
    
});

var categories = [];


router.use(compression());

var stats={
    productsInSale:0,
    productsSold:0
};

var storage = multer.diskStorage({
    
  filename: function(req, file, callback) {
  
     
      
    callback(null, Date.now() + file.originalname);
     
  }
   
});
var imageFilter = function (req, file, cb) {
    
 
  // upload file to S3

    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, imageFilter:imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'shivucloud', 
  api_key: process.env.api_key, 
  api_secret: process.env.api_secret
});

router.get("/upload",isLoggedIn,function(req,res)
{
    Camp.find({},function(err,camps)
    {
        if(err)
        {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
        }
        else{
            res.render("campgrounds/upload.ejs");
        }
        
    });
  
});



router.get("/campgrounds",function(req,res)
{
    if(req.query.search)
    {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
          Camp.find({$or:[{"category":regex},{"name":regex}]},function(err,camps)
    {
        if(err)
        {
            req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
        }
        else{
            if(camps.length < 1)
            {
                req.flash("error","Your search "+req.query.search+" didn't match any of our products");
                 res.redirect("back");
                
            }else{
            res.render("campgrounds/search.ejs",{camps:camps,key:req.query.search});
            }
        }
        
    }).sort({"_id":-1});
  
        
    }else{
          Camp.find({},function(err,camps)
    {
        if(err)
        {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
        }
        else{
            res.render("campgrounds/index.ejs",{camps:camps});
        }
        
    }).sort({"_id":-1});
  
    }
    
  
});
router.get("/refreshindex",isLoggedIn,function(req,res)
{
    Camp.find({},function(err, camps) {
       
       if(err)
       {
           req.flash("error",err.message);
           res.redirect("/campgrounds");
       }
       else
       {
           
           req.flash("error","Sorry, product request was cancelled by the user");
           res.render("campgrounds/heart2.ejs",{camps:camps});
       }
    });
    
});




router.get("/getproducts",function(req,res)
{
    Camp.find({},function(err, camps) {
       
       if(err)
       {
           req.flash("error",err.message);
           res.redirect("/campgrounds");
       }
       else
       {
           res.render("campgrounds/heart.ejs",{camps:camps});
       }
    }).sort({"_id":-1});
    
});


router.post("/campgrounds",isLoggedIn,upload.single("image"),async (req,res) =>
{

var images_file= fs.createReadStream(req.file.path);
var classifier_ids = 	["next_1532709651"];

var threshold = 0.9;

var params = {
	images_file: images_file,
	classifier_ids: classifier_ids,
	threshold: threshold
};

await visualRecognition.classify(params, function(err, response) {
	if (err)
    {
        req.flash("error","Sorry something went wrong");
      
        res.redirect("back");
    }
	else{
//	   res.send(JSON.stringify(response, null, 2));
	  if(response.images[0].classifiers[0].classes.length == 0)
	  {
	      
	    
	         
	   cloudinary.v2.uploader.upload(req.file.path,{crop: "thumb", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" },async (err,result) =>{
       
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("back");
        }
        
    req.body.camp.image = result.secure_url;
    req.body.camp.imageId = result.public_id;
    req.body.camp.sale=true;
    req.body.camp.category = "Miscallenous";
    req.body.camp.name = req.body.camp.campSiteName;
    req.body.camp.author={
        id:req.user._id,
        username:req.user.username
    };
   
await   Camp.create(req.body.camp,function(err,camp)
    { 
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("back");
        }
         
         res.redirect("/campgrounds");
        
    });
    
    });
    
 
	      
	      
	  }else
	  {
	        var max = response.images[0].classifiers[0].classes[0].score;
	    var category;
	    for(var i=0;i<response.images[0].classifiers[0].classes.length ; i++)
	{
	    if(max<= response.images[0].classifiers[0].classes[i].score)
	    {
	        max =  response.images[0].classifiers[0].classes[i].score;
	        category =  response.images[0].classifiers[0].classes[i].class;
	    }
	}
	if(category!="negative")
	{

	         
	   cloudinary.v2.uploader.upload(req.file.path,{crop: "thumb", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" },async (err,result) =>{
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("back");
        }
        
    req.body.camp.image = result.secure_url;
    req.body.camp.imageId = result.public_id;
    req.body.camp.sale=true;
    req.body.camp.category = category;
    req.body.camp.name = req.body.camp.campSiteName;
    req.body.camp.author={
        id:req.user._id,
        username:req.user.username
    };
   
await   Camp.create(req.body.camp,function(err,camp)
    { 
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("back");
        }
         if(categories.indexOf(category) == -1){
             categories.push(category);
            
         }
         res.redirect("/campgrounds");
        
    });
    
    });
    
 
	        

	}
	else
	{
	    req.flash("error","Sorry category of the product seems to be explicit");
       
        res.redirect("back");
	    
	}
	


	
	  
	      
	  }
	    
	    
	    	
	}

});
 

    
});




   

router.get("/campgrounds/new",isLoggedIn,function(req, res) {
    res.render("campgrounds/new.ejs");
});

router.get("/campgrounds/:id",isLoggedIn,function(req,res)
{
    var campId = req.params.id;
    
    Camp.findById(campId).populate("comments").exec(function(err,camp)
    {
        if(err)
        {
           req.flash("error","Product not found");
           res.redirect("/campgrounds");
        }
        else
        {
            if(req.user){
              if ((!camp || !camp.sale) && !req.user.isAdmin) {
                  req.flash("error","sorry for the inconvienence, product not available right now ");
                  return res.redirect("/campgrounds");
            }
            }
            if(camp){
               
               Camp.findOne({"favourite":{$elemMatch:{"_id":req.user._id}},"_id":req.params.id},function(err,user){
                   if(err){
                       req.flash("error","Sorry, something went wrong");
                       res.redirect("back");
                   }
                   else
                   {
                       if(user)
                       {
                          
                            res.render("campgrounds/show.ejs",{camp:camp,nanu:req.user,fav:true});
                           
                            
                       }
                       else
                       {
                           
                             res.render("campgrounds/show.ejs",{camp:camp,nanu:req.user,fav:false});
                               
                          
                       }
                   }
               });
             
            
            }
            else{
                  req.flash("error","sorry for the inconvienence, product not available right now ");
                  res.redirect("/campgrounds");
            }
        }
        
    });
  
});

router.get("/products/categories",isLoggedIn,function(req,res){
  
     const havingCategory = ["books","bottles","watch","bags","rubiks cube","headphones","Miscallenous"];
   
     res.render("campgrounds/categories.ejs",{havingCategory:havingCategory});
   
    
   
});



router.get("/campgrounds/:id/edit",myCampground,function(req, res) {
    
    if(req.isAuthenticated)
    {
        
        Camp.findById(req.params.id,function(err,camp)
   {
       
       if(err)
       {
           res.redirect("/campgrounds");
       }
       else
       {
         
           if(camp.sale){
            res.render("campgrounds/edit.ejs",{camp:camp});
           }else
           {
               req.flash("error","Sorry product not available to edit");
               res.redirect("/campgrounds");
           }
           
       }
   });
    }
    else{
        
        res.send("You are not looged in!!!!");
        
    }
   
   
   
  
    
});

function myCampground(req,res,next)
{
   
    if(req.isAuthenticated())
    {
        Camp.findById(req.params.id,function(err, camp) {
            if(err)
            {
                req.flash("error","Product not found");
                res.redirect("/campgrounds");
            }
            else
            {
                if(!camp)
                {
                     req.flash("error", "Item not found.");
                     return res.redirect("/campgrounds");
                }
                if(camp.author.id.equals(req.user._id))
                {
                    next();
                }
                else
                {
                    req.flash("error","You are not permitted to do that!!!");
                    res.redirect("/campgrounds/"+req.params);
                }
            }
        });
    }
    else
    {
         req.flash("error","LogIn and be part of our community!!!");
        res.redirect("back");
    }
}



router.put("/campgrounds/:id",isLoggedIn,upload.single("image"), function(req,res){
    var category ;
    Camp.findById(req.params.id, async function(err,camp){
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("/campgrounds/"+req.params.id+"/edit");
        }
        else
        {
            if(req.file){
             
               
               var images_file= fs.createReadStream(req.file.path);
                var classifier_ids = ["producttagging_1727079250"];

var threshold = 0;

var params = {
	images_file: images_file,
	classifier_ids: classifier_ids,
	threshold: threshold
};

await visualRecognition.classify(params, async function(err, response) {
	if (err)
    {
        req.flash("error","Sorry something went wrong");
       
        res.redirect("back");
    }
	else{
	
	    var max = response.images[0].classifiers[0].classes[0].score;
	  
	    for(var i=0;i<response.images[0].classifiers[0].classes.length ; i++)
	{
	    if(max<= response.images[0].classifiers[0].classes[i].score)
	    {
	        max =  response.images[0].classifiers[0].classes[i].score;
	        category =  response.images[0].classifiers[0].classes[i].class;
	    }
	}   
	           
	
	           if( category != "negative")
                {
                           try{
                    await  cloudinary.v2.uploader.destroy(camp.imageId);
                     var result = await cloudinary.v2.uploader.upload(req.file.path,{crop: "scale", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" });
                     camp.imageId=result.public_id;
                   
                     camp.image=result.secure_url;
             
                }
                catch(err){
                    
                     req.flash("error",err.message);
                     return res.redirect("back");
                    
                }
         
         
          camp.name = req.body.camp.campSiteName;
          camp.category = category;
          camp.description = req.body.camp.description;
          camp.price=req.body.camp.price;
          camp.save();
          req.flash("success","Successfully updated!!!");
          res.redirect("/campgrounds/"+camp._id);
        }
                    
                else
                {
                 req.flash("error","The image you are trying to upload seems to be explicit.Please try to upload new one!!!");
                 res.redirect("back");   
                }
         
	    
	}
	
});

}else
        {
          camp.name = req.body.camp.campSiteName;
          camp.category = category;
          camp.description = req.body.camp.description;
          camp.price=req.body.camp.price;
          camp.save();
          req.flash("success","Successfully updated!!!");
          res.redirect("/campgrounds/"+camp._id); 
        }
}
});
});


router.get("/campgrounds/buy/:id",isLoggedIn,function(req, res) {
   if(req.user.verified){
        Camp.findById(req.params.id,function(err,camp)
   {
       if(camp){
           if(err || !camp.sale)
       {
           req.flash("error","Sorry your request couldn't be fulfilled");
           res.redirect("/campgrounds");
           
       }
       else
       {
           camp.sale=false;
           camp.sold = false;
           camp.requestedBy = req.user._id;
           User.findById(camp.author.id,function(err, user) {
                User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
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
        subject: 'Your product '+camp.name+" is requested by "+ buyer.profileName ,
        text: 'You are receiving this because someone  have requested your product.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart-shivu1998.c9users.io/campgrounds/user/"+camp.author.id
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to seller");
              return res.redirect("/campgrounds");
          }
      
       
       
      });
                    
                })
      
         
               
           });
           camp.save();
             req.flash('success', 'Your request is being processed and and e-mail has been sent to seller . Processing may take few minutes ');
           res.redirect("/mykart")
       }
       }
       else
       {
           req.flash("error","Product not available");
           return res.redirect("/campgrounds");
       }
       
       
   });
   
   }else
   {                                                                        
       req.flash("error","Your account is still not verfied for the email, "+req.user.email+"click to resend the verification email. <a href='{url('/resend')}'> click here </a>");
        
       return  res.redirect("back");
   }
  
    
});
router.get("/mykart/refresh",isLoggedIn,function(req, res) {
   
   Camp.find({requestedBy:req.user._id},function(err, camps) {
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
       }
       else
       {
            res.render("campgrounds/mykart2.ejs",{camps:camps});
                
       }
   })
  
    
});
router.get("/mykart",isLoggedIn,function(req, res) {
   
   Camp.find({requestedBy:req.user._id},function(err, camps) {
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
       }
       else
       {
            res.render("campgrounds/mykart.ejs",{camps:camps});
                
       }
   })
  
    
});



router.get("/master/users",isLoggedIn,Admin,function(req, res) {
    if(req.user.isAdmin){
   User.find({},function(err, users) {
       if(err)
       {
           req.flash("error",err.message);
       }
       else{
      res.render("campgrounds/users.ejs",{users:users}); 
       }
   });
    }
    else
    {
        req.flash("error","Sorry you don't have permission for entering this page");
        return res.redirect("/campgrounds");
    }
});

router.get("/campgrounds/buyer/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err,camp)
   {
       if(err)
       {
           req.flash("error","Sorry your request couldn't be fulfilled");
           res.redirect("/campgrounds");
       }
       else
       {
           
           if( !camp.sale || req.user.isAdmin){
               camp.save();
           User.findById(camp.author.id,function(err, seller) {
               if(err)
               {
                   req.flash("error",err.message);
                   res.redirect("/campgrounds");
               }
               else
               {
                   User.findById(camp.requestedBy,function(err, buyer) {
                       if(!err){
                           
bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(buyer.username.toString()), salt, function(err, hash_buyer) {
               
               
                    bcrypt.compare(md5(buyer.username.toString()), hash_buyer).then(function(result) {
                  
                    
                    bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(seller.username.toString()), salt, function(err, hash_seller) {
              
             
                    bcrypt.compare(md5(seller.username.toString()), hash_seller).then(function(result) {
                  
                    
                     res.render("campgrounds/seller.ejs",{buyer_usn:hash_buyer,camp:camp,buyer:buyer,seller:seller});
                    
                      
                    });
                
                });
            

});
                    
                      
                    });
                
                });
            

});
   
                           
                          
                       
                       }    
                       
                    
                   });
                
               }
           });
           
           }else
           {
               req.flash("error","Product cannot be found");
               return res.redirect("back");
           }
           
       }
       
   });
   
    
});

router.get("/campgrounds/sell/refresh/:id",isLoggedIn,function(req, res) {
    var Buyer = new User();
    Camp.findById(req.params.id,function(err, camp) {
       
      
      if(err)
      {
          req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
      }
      else
      {
          if(camp &&!camp.sale){
           User.findById(camp.requestedBy,function(err, buyer) {
               Buyer = buyer;
               if(err)
               {
                   req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
               }
              else
               {
                   User.findById(camp.author.id,function(err, seller) {
                       if(!err){
                           
bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(buyer.username.toString()), salt, function(err, hash_buyer) {
               

                    bcrypt.compare(md5(buyer.username.toString()), hash_buyer).then(function(result) {
                  
                   
                    bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(seller.username.toString()), salt, function(err, hash_seller) {
             
               
                    bcrypt.compare(md5(seller.username.toString()), hash_seller).then(function(result) {
                    
                   
                     res.render("campgrounds/buyer_refresh.ejs",{seller_usn:hash_seller,buyer_usn:hash_buyer,camp:camp,buyer:buyer,seller:seller});
                    
                      
                    });
                
                });
            

});
                    
                      
                    });
                
                });
            

});
   
                           
                          
                       }
                         
                   });
                
               }
           });
          }else
          {
              req.flash("error","Sorry, the order for the product "+camp.name+" was cancelled");
              return res.redirect("/campgrounds/user/"+req.user.id);
          }
           
      }
   });
  
   
    
});

router.get("/campgrounds/sell/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      
      if(err)
      {
          req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
      }
      else
      {
          if(!camp.sale){
           User.findById(camp.requestedBy,function(err, buyer) {
               if(err)
               {
                   req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
               }
               else
               {
                   User.findById(camp.author.id,function(err, seller) {
                       if(!err){
                           
bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(buyer.username.toString()), salt, function(err, hash_buyer) {
               
               
                    bcrypt.compare(md5(buyer.username.toString()), hash_buyer).then(function(result) {
                   
                  
                    bcrypt.genSalt(saltRounds, function(err, salt) {
                bcrypt.hash(md5(seller.username.toString()), salt, function(err, hash_seller) {
              
              
                    bcrypt.compare(md5(seller.username.toString()), hash_seller).then(function(result) {
                   
                  
                     res.render("campgrounds/buyer.ejs",{seller_usn:hash_seller,camp:camp,buyer:buyer,seller:seller});
                    
                      
                    });
                
                });
            

});
                    
                      
                    });
                
                });
            

});
   
                           
                          
                       }
                         
                   });
                
               }
           });
          }else
          {
             
              return res.redirect("/campgrounds");
          }
           
      }
   });
  
   
   
    
});

router.post("/revoke/:id",isLoggedIn,function(req,res)
{
    Camp.findById(req.params.id,function(err, camp) {
       if(err)
       {
           req.flash("error","Sorry your request couldn't be processed");
       }
       else
       {
           camp.sale=true;
           camp.sold=false;
           camp.agree = false;
           User.findById(camp.requestedBy,function(err, buyer) {
                   User.findById(camp.author.id,function(err, seller) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to:seller.email,
        from: 'friendskarttech@gmail.com',
        subject:seller.profileName+" ,order for your product "+camp.name+" was cancelled",
        text: 'You are receiving this because the order for the product '+camp.name+' was cancelled by '+buyer.profileName+'\n\n' +
         'So, your product is back on sale, check out your profile for more info\n\n'+
         "https://friendskart-shivu1998.c9users.io/campgrounds/user/"+seller._id
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
      
       
       
      });
                    
                })
                   
                    
                });
        
           camp.requestedBy = "";
           camp.save();
            req.flash("success","We have notified the seller that you have cancelled the order to buy the product");
           res.redirect("back");
       }
    });
    
});

router.get("/master/stats",isLoggedIn,Admin,function(req, res) {
   
   
   Camp.count({$or:[
    {money:true},
    {recieved:true}
  ] },function(err, count) {
       
       stats.productsSold=count;
      

   });
   Camp.count({"sale":true},function(err, count) {
       
       stats.productsInSale=count;
      

   });
    Camp.count(function(err,count){
      if(!err){
          User.count(function(err,users)
          {
              if(!err)
                res.render("campgrounds/stats.ejs",{count:count,users:users,stats:stats});
          });
      }
    });
});
     
function Admin(req,res,next)
{
    if(req.isAuthenticated())
    {
        if(req.user.isAdmin)
        {
          return  next();
        }
        else
        {
            req.flash("error","Sorry you are not permitted");
            return res.redirect("/campgrounds");
        }
    }
}
router.delete("/campgrounds/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,async function(err,camp)
   {
      if(err)
      {
          req.flash("error",err.message);
            res.redirect("back");
      }
      else
      {
          try
          {
             
              if(!camp.sale && !req.user.isAdmin)
              {
                  req.flash("error","Your product is currently being requested by a buyer,check your profile");
                  return res.redirect("/campgrounds/user/"+camp.author.id);
              }
            
              await cloudinary.v2.uploader.destroy(camp.imageId);
          
              camp.remove();
              req.flash("success","Product "+camp.name+" removed");
              res.redirect("/campgrounds");
            
          }
          catch(err)
          {
              req.flash("error",err.message);
              return res.redirect("back");
                
          }
          
          
      }
   });
    
});


router.get("/campgrounds/user/:id",isLoggedIn,function(req, res) {
   
  
   Camp.find({"author.id":req.params.id},function(err,camps)
   {
       if(err)
       {
           req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
            
       }
       else
       {
           Camp.count({"sale":true,"author.id":req.params.id},function(err, count) {
               if(err)
               {
                    req.flash("error","Sorry something went wrong");
                    res.redirect("back");
               }
               else
               {
                    res.render("campgrounds/products.ejs",{camps:camps,count:count});
               }
           })
          
       }
       
   });
   
    
});
router.get("/campgrounds/user/:id/refresh",isLoggedIn,function(req, res) {
   
  
   Camp.find({"author.id":req.params.id},function(err,camps)
   {
       if(err)
       {
          req.flash("error","Sorry!!!something went wrong");
            res.redirect("back");
       }
       else
       {
           res.render("campgrounds/products_refresh.ejs",{camps:camps});
       }
       
   });
   
    
});

router.get("/agree/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      if(!camp.sale){
           if(err)
      {
          req.flash("error",err.message);
           return res.redirect("back");
      }
      camp.sold=true;
      camp.agree = true;
      camp.save();
          User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: buyer.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Seller of the product '+camp.name+" has accepted to sell. Check your profile for more info ",
        text: 'You are receiving this because the product '+camp.name+' was requested by you and the seller has accepted to sell the product.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart-shivu1998.c9users.io/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
      
       
       
      });
                    
                })
      
         
        req.flash("success","We have sent notified the buyer that you have accepted to sell, ");
           
        return  res.redirect("back");
      
      }else
      {
           req.flash("error","Sorry, this order was cancelled");
       return res.redirect("/campgrounds");
          
      }
     
      
       
   });
    
});

router.get("/product/accept/:id",isLoggedIn,function(req, res) {
   Camp.findById(req.params.id,function(err, camp) {
       if(!camp.sale){
       if(err)
       {
           req.flash("error",err.message);
           return res.redirect("back");
       }
       camp.sold=true;
       camp.save();
                User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: buyer.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Seller of the product '+camp.name+" has accepted to chat with you. Check your profile for more info ",
        text: 'You are receiving this because the product '+camp.name+' was requested by you and the seller has accepted to chat with you.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart-shivu1998.c9users.io/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
     
       
      });
                    
                })
      
         
               req.flash("success","We have  notified the buyer that you have accepted his request,check out chat option below");
           
        return  res.redirect("back");
       }
       req.flash("error","Sorry, this order was cancelled");
       return res.redirect("/campgrounds");
       
       
   })
   
    
});
router.post("/cancel_request/:id",isLoggedIn,function(req,res)
{
    Camp.findById(req.params.id,function(err, camp) {
       if(err)
       {
           req.flash("error","Sorry,Product not available");
           return res.redirect("/campgrounds");
       }
       
       camp.sale=true;
       camp.sold=false;
       camp.agree = false;
       camp.save();
       res.redirect("/campgrounds/user/"+req.user._id);
       
    });
    
    
    
});
router.get("/terms",function(req, res) {
    res.render("campgrounds/terms.ejs");
})
router.get("/product/decline/:id",isLoggedIn,function(req, res) {
     req.flash("success","We have notified the buyer that you have cancelled his order");
   Camp.findById(req.params.id,function(err, camp) {
       if(err)
       {
           req.flash("error",err.message);
           return res.redirect("back");
       }
       camp.sold=false;
       camp.sale=true;
       camp.agree = false;
          User.findById(camp.requestedBy,function(err, buyer) {
                   User.findById(camp.author.id,function(err, seller) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to:buyer.email,
        from: 'friendskarttech@gmail.com',
        subject:buyer.profileName+" ,the product "+camp.name+" which you have ordered was cancelled by the seller "+seller.profileName,
        text: 'You are receiving this because your order for the product '+camp.name+' was cancelled by '+seller.profileName+'\n\n' +
          "click the below link to go to your cart \n\n"+
         "https://friendskart-shivu1998.c9users.io/campgrounds/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
    
       
       
      });
                    
                })
                   
                    
                });
        
       
       camp.requestedBy = "";
       camp.save();
       res.redirect("/campgrounds");
       
   })
    
});

router.get("/money/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      
      camp.money=true;
      camp.save();
      res.redirect("/campgrounds/user/"+camp.author.id);
      
       
   });
   
});


router.get("/recieved/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      
      camp.recieved=true;
      camp.save();
      res.redirect("/mykart");
      
       
   });
    
});

router.delete("/user/:id",isLoggedIn,function(req, res) {
    
   User.findByIdAndRemove(req.params.id,function(err, user) {
       
      
            if(err)
            {
                res.redirect("back");
            }
            Camp.find({"requestedBy":user._id},function(err, camps) {
               
               if(!err)
               {
                   camps.forEach(function(camp)
                   {
                       if(!camp.sale)
                       {
                           
                           camp.sale=true;
                           camp.sold=false;
                           camp.agree=false;
                           camp.save();
                           
                       }
                       
                   });
               }
                
            });
             Camp.remove({"author.id":user._id},function(err, camps) {
                 if(!err){
             req.flash("success","Account with username "+user.username+" removed successfully");
             res.redirect("back");
                 }
           
    });
    
         
       
       });

                  
     
});

router.get("/contact",isLoggedIn,function(req,res)
{
    res.render("campgrounds/email.ejs");
});

router.get("*",function(req, res) {
     
   res.redirect("/campgrounds"); 
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
           
            req.flash("error","Your account is still not verfied for the email, "+req.user.email+"click to resend the verification email <a href=/resend> "+"click here");
            res.redirect("/campgrounds"); 
            
            
        }
      
    }
    else{
    req.flash("error","LogIn and be part of our community!!!");
    res.redirect("/login");
    
    }
}

module.exports = router;