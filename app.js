const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const methodOverride = require("method-override");
const fs = require("fs");
const app = express();
const nodemailer = require("nodemailer");
const multer = require("multer");

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(methodOverride('_method'));


mongoose.connect("mongodb://localhost:27017/ticketDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

var transporter = nodemailer.createTransport({
  service: 'gmail/exchange etc...',
  auth: {
    user: 'your_email',
    pass: 'your_password'
  }
});


const ticketTrackerSchema = new mongoose.Schema({
  name: String,
  ticketNumber: Number
});
const TicketTracker = mongoose.model("TicketTracker", ticketTrackerSchema);

//UNCOMMENT THE CODE BELOW ON FIRST RUN
// const ticket = new TicketTracker({
//   name: "Ticket Number",
//   ticketNUmber: 0
// });
//
// ticket.save();

const itemSchema = new mongoose.Schema({
  title: String,
  ticketNumber: Number,
  description: String,
  priority: Number,
  type: String,
  service: String,
  team: String,
  individual: String,
  status: String,
  action: String,
  createBy: String,
  created: {type: Date, default: Date.now()}
});

const Item = mongoose.model("Item", itemSchema);
const Resolved = mongoose.model("Resolved", itemSchema);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  items: [itemSchema]
});

const User = mongoose.model("User", userSchema);

//UNCOMMENT THE CODE BELOW ON FIRST RUN
// const john = new User({
//   name: "John Doe",
//   email: "john@john.com"
// });
//
// const shane = new User({
//   name: "Shane Joyce",
//   email: "shane@shane.com"
// });
//
// const chris = new User({
//   name: "Chris Smith",
//   email: "chris@chris.com"
// });
//
// const mike = new User({
//   name: "Mike Riley",
//   email: "marc@marc.com"
// });
//
// john.save();
// shane.save();
// chris.save();
// mike.save();

app.get("/", function(req, res){
  res.redirect("/tickets");
});

  app.get("/tickets", function(req, res){
    Item.deleteOne({status: "Resolved"}, function(err){
      if(!err){
        Item.find({}, function(err, foundItems){
          Item.find({priority: {$lt: 4}}, function(err, highPriority){
            Item.find({priority: {$gt: 3, $lt: 7}}, function(err, mediumPriority){
              Item.find({priority: {$gt: 6}}, function(err, lowPriority){
                  res.render("index", {
                    foundItems: foundItems,
                    highPriority: highPriority.length,
                    mediumPriority: mediumPriority.length,
                    lowPriority: lowPriority.length
                });
              });
            });
          });
        });
      }
    });
  });

function emailOptions(emailTo, title, desc){
  mailOptions = {
    from: 'email@somwhere.com',
    to: emailTo,
    subject: "New Ticket: " + title,
    text: "Description: " + desc
  };
}

var mailOptions = {
  from: 'email@somewhere.com',
  to: "",
  subject: "",
  text: ""
};

  app.post("/tickets", function(req, res){
    TicketTracker.findOneAndUpdate({name: "Ticket Number"}, {$inc: {"ticketNumber": 1}}, function(err, num){
      if(!err){
        num.save();
      }
    });
    TicketTracker.findOne({name: "Ticket Number"}, function(err, ticketNum){
      if(!err){
        const ticket = {
          title: req.body.title,
          ticketNumber: ticketNum.ticketNumber,
          description: req.body.description,
          priority: req.body.priority,
          type: req.body.type,
          service: req.body.service,
          team: req.body.team,
          individual: req.body.individual,
          status: req.body.status,
          action: req.body.action,
          created: Date.now()
        }
        const createdTicket = new Item(ticket);
        const resolvedTicket = new Resolved(ticket);
        //email body for sending email notification string
        const emailBody = ticket.description + " Assigned: " + ticket.individual;
        if(createdTicket.status === "Open"){
          createdTicket.save();
          User.findOne({name: req.body.individual}, function(err, user){
            if(!err){
              user.items.push(createdTicket);
              user.save();
              //send email notification
              // emailOptions(user.email, req.body.title, emailBody);
              // transporter.sendMail(mailOptions, function(error, info){
              //   if (error) {
              //     console.log(error);
              //   } else {
              //     console.log('Email sent: ' + info.response);
              //   }
              // });
              res.redirect("/tickets");
            }
          });
        } else {
          resolvedTicket.save();
          res.redirect("/resolved");
        }
      }
    });
  });

app.get("/resolved", function(req, res){
  Resolved.find({}, function(err, foundItems){
    if(!err){
      Resolved.find({priority: {$lt: 4}}, function(err, highPriority){
        Resolved.find({priority: {$gt: 3, $lt: 7}}, function(err, mediumPriority){
          Resolved.find({priority: {$gt: 6}}, function(err, lowPriority){
            res.render("resolved", {
              foundItems: foundItems,
              highPriority: highPriority.length,
              mediumPriority: mediumPriority.length,
              lowPriority: lowPriority.length
            });
          });
        });
      });
    }
  });
});


app.get("/tickets/:id", function(req, res){
  const ticketId = req.params.id;
  Item.findOne({_id: ticketId}, function(err, foundTicket){
    if(!foundTicket){
      res.redirect("/resolved/" + ticketId);
    } else {
      res.render("show", {foundTicket: foundTicket});
    }
  });
});

app.get("/resolved/:id", function(req, res){
  const ticketId = req.params.id;
  Resolved.findOne({_id: ticketId}, function(err, foundTicket){
    res.render("showresolved", {foundTicket: foundTicket});
  });
});

app.put("/tickets/:id", function(req, res){
  const ticketId = req.params.id;
  const individual = req.body.individual;
  const ticket = {
    title: req.body.title,
    ticketNumber: req.body.ticketNumber,
    description: req.body.description,
    priority: req.body.priority,
    type: req.body.type,
    service: req.body.service,
    team: req.body.team,
    individual: req.body.individual,
    action: req.body.action,
    status: req.body.status,
    created: Date.now()
  }
  const userTicketUpdate = {
    "items.$.title" : req.body.title,
    "items.$.ticketNumber" : req.body.ticketNumber,
    "items.$.description" : req.body.description,
    "items.$.priority" : req.body.priority,
    "items.$.type" : req.body.type,
    "items.$.team" : req.body.service,
    "items.$.team" : req.body.team,
    "items.$.individual" : req.body.individual,
    "items.$.action" : req.body.action,
    "items.$.status" : req.body.status
  }
  const resolvedTicket = new Resolved(ticket);
  if(resolvedTicket.status === "Resolved"){
    resolvedTicket.save();
    Item.update({_id: ticketId},ticket, {overwrite: true}, function(err){
        if(!err){
          User.findOneAndUpdate({name: individual}, {$pull: {items: {_id: ticketId}}}, function(err, foundUser){
          if(!err){
            res.redirect("/tickets");
          }
        });
        }
    });
  } else {
    Item.update({_id: ticketId},ticket, {overwrite: true}, function(err){
        if(!err){
          User.update({"items._id": ticketId}, {"$set" : userTicketUpdate}, function(err){
            if(!err){
              res.redirect("/tickets");
            }
          });
        }
    });
  }
});

app.delete("/tickets/:id", function(req, res){
  const individual = req.body.individual;
  const itemId = req.params.id;
  Item.deleteOne({_id: itemId}, function(err, deletedItem){
    if(!err){
      User.findOneAndUpdate({name: individual}, {$pull: {items: {_id: itemId}}}, function(err, foundUser){
      if(!err){
        res.redirect("/tickets");
      }
    });
    }
  });
});

app.delete("/resolved/:id", function(req, res){
  Resolved.deleteOne({_id: req.params.id}, function(err, deletedItem){
    if(!err){
      res.redirect("/resolved");
    }
  });
});

app.get("/users/:name", function(req, res){
  const userName = req.params.name;
      Item.find({individual: userName}, function(err, foundItems){
        Item.find({individual: userName, priority: {$lt: 4}}, function(err, highPriority){
          Item.find({individual: userName, priority: {$gt: 3, $lt: 7}}, function(err, mediumPriority){
            Item.find({individual: userName, priority: {$gt: 6}}, function(err, lowPriority){
                res.render("users", {
                  foundItems: foundItems,
                  highPriority: highPriority.length,
                  mediumPriority: mediumPriority.length,
                  lowPriority: lowPriority.length,
                  userName: userName
              });
            });
          });
        });
      });
    });

app.get("/teams/:name", function(req, res){
  const teamName = req.params.name;
      Item.find({team: teamName}, function(err, foundItems){
        Item.find({team: teamName, priority: {$lt: 4}}, function(err, highPriority){
          Item.find({team: teamName, priority: {$gt: 3, $lt: 7}}, function(err, mediumPriority){
            Item.find({team: teamName, priority: {$gt: 6}}, function(err, lowPriority){
                res.render("teams", {
                  foundItems: foundItems,
                  highPriority: highPriority.length,
                  mediumPriority: mediumPriority.length,
                  lowPriority: lowPriority.length,
                  teamName: teamName
              });
            });
          });
        });
      });
});


app.listen(3000, function(){
  console.log("Ticket app server started on port 3000.");
});
