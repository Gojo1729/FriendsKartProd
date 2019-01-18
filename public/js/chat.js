var AssistantV2 = require('watson-developer-cloud/assistant/v2');
var session;
var service = new AssistantV2({
 "username": process.env.svcusername,
 "password": process.env.service,
  "url": 'https://gateway.watsonplatform.net/assistant/api/',
  "version": '2018-09-19'
});
 service.createSession({
  assistant_id: 'f1bd9515-34e3-4598-a0d2-fa37d3108d62',
}, function(err, response) {
  if (err) {
    console.error(err);
  } else{
      session=response.session_id;
    console.log(JSON.stringify(response, null, 2));
  }
});

(function() {
    'use strict';
  
    const PUSHER_INSTANCE_LOCATOR = "INSTANCE_LOCATOR"

    // ----------------------------------------------------
    // Chat Details
    // ----------------------------------------------------


    let chat = {
    
     message:"Hello there, I am chiku.How can I help you???",
     category:"support"
     
     
    
    }


    // ----------------------------------------------------
    // Targeted Elements
    // ----------------------------------------------------

    const chatPage   = $(document)
    const chatWindow = $('.chatbubble')
    const chatHeader = chatWindow.find('.unexpanded')
    const chatBody   = chatWindow.find('.chat-window')


    // ----------------------------------------------------
    // Helpers
    // ----------------------------------------------------

    let helpers = {
        /**
         * Toggles the display of the chat window.
         */
        ToggleChatWindow: function () {
            chatWindow.toggleClass('opened')
            chatHeader.find('.title').text(
                chatWindow.hasClass('opened') ? 'Minimize Chat Window' : 'Need help?Chat with chiku here!!!'
            )
            
        },

        /**
         * Show the appropriate display screen. Login screen
         * or Chat screen.
         */
        ShowAppropriateChatDisplay: function () {
         helpers.ShowChatRoomDisplay("Chiku") 
        },
            
      
        ShowChatRoomDisplay: function (name) {
            chatBody.find('.chats').addClass('active');
            
                helpers.NewChatMessage(chat.message,chat.category,name);
            
        },

        /**
         * Append a message to the chat messages UI.
         */
        NewChatMessage: function (message,category,name) {
           console.log("new message");
                // const messageClass = message.sender.id !== chat.userId ? 'support' : 'user'

                chatBody.find('ul.messages').append(
                    `<li class="clearfix message ${category}">
                        <div class="sender">${name}</div>
                        <div class="message">${message}</div>
                         
                    </li>
                    `
                )
  
             //   chat.messages[message.id] = message
              
                chatBody.scrollTop(chatBody[0].scrollHeight)
            
        },

        /**
         * Send a message to the chat channel
         */
        SendMessageToSupport: function (evt) {
            evt.preventDefault()
        
            const newmessage = $('#newMessage').val().trim()
            
            chat.message=newmessage;
            chat.category="sender";
            helpers.ShowChatRoomDisplay($("#name").val());
            chat.category="";
            service.message(
  {
    input: { text: chat.message },
    assistant_id: 'f1bd9515-34e3-4598-a0d2-fa37d3108d62',
    session_id: session,
  },processResponse);

function processResponse(err, response) {
  if (err) {
    console.error(err); // something went wrong
    return;
  }

  // If an intent was detected, log it out to the console.
  if (response.output.intents > 0) {
    console.log('Detected intent: ' + response.output.intents[0].intent);
  }

  // Display the output from dialog, if any. Assumes a single text response.
  if (response.output.generic.length != 0) {
   if(response.output.intents[0].intent == "search")
   {
       if(response.output.entities.length == 3 && response.output.entities[1].value && response.output.entities[2].value)
       {
           var val1 = response.output.entities[1].value;
           var val2 = response.output.entities[2].value;
             console.log("res="+JSON.stringify(response,null,2));
       //var tokens = chat.message.split(" ");
    //   console.log(tokens[2]);
       $.ajax({  
        type: "POST",  
        dataType: 'json',
        url: "https://friendskart-shivu1998.c9users.io/botsearch",  
        data: {"val1":val1,"val2":val2},  
        success : function(data) {
            if(data.length > 0)
            {
                chatBody.find("ul.messages").append(
                   `<li class="clearfix message support">
                    <div class="sender">Chiku</div>
                    <div class="message">Here's what I found</div>`);
                 data.forEach(function(da)
            {
                console.log("imageId="+da.image);
                
                chatBody.find("ul").append(
                    `<a href="/campgrounds/${da._id}">
               <img  src="${da.image}"  style="width:100px;height:100px;float:right;padding-bottom:10px" >
                       </a>`
                    )
              
            
                
                
            });
          console.log("success"+data);
             chat.message="";
              chatBody.scrollTop(chatBody[0].scrollHeight)
                
            }
           else
           {
               helpers.NewChatMessage(`sorry I couldn't find the thing you were looking for.Please try with different key word`,"support","Chiku")
           }
        } ,
        error: function(err)
        {
          console.log("error with ajax request");
        }
      }); 
      
     
           
       }else
       {
           console.log("res="+JSON.stringify(response,null,2));
       //var tokens = chat.message.split(" ");
    //   console.log(tokens[2]);
       $.ajax({  
        type: "POST",  
        dataType: 'json',
        url: "https://friendskart-shivu1998.c9users.io/botsearch",  
        data: {"key":chat.message},  
        success : function(data) {
            if(data.length > 0)
            {
                chatBody.find("ul.messages").append(
                   `<li class="clearfix message support">
                    <div class="sender">Chiku</div>
                    <div class="message">Here's what I found</div>`);
                 data.forEach(function(da)
            {
                console.log("imageId="+da.image);
                
                chatBody.find("ul").append(
                    `<a href="/campgrounds/${da._id}">
               <img  src="${da.image}"  style="width:100px;height:100px;float:right;padding-bottom:10px" >
                       </a>`
                    )
              
            
                
                
            });
          console.log("success"+data);
             chat.message="";
              chatBody.scrollTop(chatBody[0].scrollHeight)
                
            }
           else
           {
               helpers.NewChatMessage(`sorry I couldn't find the thing you were looking for.Please try with different key word`,"support","Chiku")
           }
        } ,
        error: function(err)
        {
          console.log("error with ajax request");
        }
      }); 
      
       
       }
     
       
   }
   else
   {
       console.log(response.output.generic[0].text);
      chat.message="";
      helpers.NewChatMessage(response.output.generic[0].text,"support","Chiku")
   }
      
      
  }

 
}
  
         

            $('#newMessage').val('');
            
        },

        
    }


    // ----------------------------------------------------
    // Register page event listeners
    // ----------------------------------------------------

    chatPage.ready(helpers.ShowAppropriateChatDisplay);
    chatHeader.on('click', helpers.ToggleChatWindow);
    chatBody.find('#messageSupport').on('submit', helpers.SendMessageToSupport)    
  
    
}())