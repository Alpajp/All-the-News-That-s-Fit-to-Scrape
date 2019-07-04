var express = require("express");
// var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Our scraping tools
//Axios is a promised-based http library, similer to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

const PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
// app.use(logger("dev"));
//Parse request body as JSON
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
//Make public a static folder
app.use(express.static("public"));
//---database configuration with mongoose----
//-----defind local MongoDB URI ----
var databaseUrl = 'mongodb://localhost/week18day2mongoose';
//---------------------
if (process.env.MONGODB_URI) {
    //THIS EXECUTES IF THIS BEING EXECUTED IN YOUR HEROKU APP
    mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
}else {
  //THIS EXECUTES IF THIS IS BEING EXECUTED ON YOUR LOCAL MACHINE
  mongoose.connect(databaseUrl, { useNewUrlParser: true });
}
// Routes

app.get("/", function (req, res) {

        res.sendFile(path.join(__dirname, "./public/index.html"));
    })

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.cbsnews.com/").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
        const articleArr = [];

        // Now we grab every h2 within an article tag, and do the following
        $(".item").each(function (i, element) {
            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties
            result.title = $(this)
                .find(".item__hed")
                .text().trim();
            result.link = $(this)
                .children("a")
                .attr("href");

            articleArr.push(result);


        });

        console.log("Scrapped data: ",articleArr);
        

        // Create a new Article using the 'result' object built from scrape
        db.Article.create(articleArr)
            .then(() => res.send(articleArr))
            .catch(err => {

                console.log(err);
                res.json(err);
            })

    });
});

// Route for getting all Article from the db
app.get("/aricles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to client
            res.json(err);
        });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
    // Using the id passed in the id parameter, prepare a query that find:the matching one in our db...
    db.Article.findOne({
            _id: req.params.id
        })
        // .. and populate all of the notes associated with it
        .populate("note")
        .then(function (dbArticle) {
            // If we are able to successfully find an Article with the given id, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note.create(req.body)
        .then(function (dbNote) {

            return db.Article.findOneAndUpdate({
                _id: req.params.id
            }, {
                note: dbNote._id
            }, {
                new: true
            });
        })
        .then(function (dbArticle) {
            // If we were able to successfully update an Article, send it back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on port " + PORT + "!");
});