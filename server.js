const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

const mongoose = require('mongoose');
const MONGO_CREDENTIALS = 'mongodb+srv://dbUserMongo:q1w2e3r4t5@cluster0.h4ukd.mongodb.net/tracker?retryWrites=true&w=majority';
const uri = MONGO_CREDENTIALS;

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
});

const connection = mongoose.connection;

connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
})

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});


// Middleware error handling
app.use((err, req, res, next) => {
    let errCode;
    let errMessage;

    if (err.errors) {
        //mongoose validation error
        errCode = 400 // bad request
        const keys = Object.keys(err.errors);
        //report the first validation error
        errMessage = err.errors[keys[0]].message
    } else {
        //generic custom error
        errCode = err.status || 500
        errMessage = err.message || 'Internal Server Error'
    }
    res.status(errCode).type('txt').send(errMessage)
});

//create userSchema
let userSchema = new mongoose.Schema({
    username: String
});

let User = mongoose.model('User', userSchema);

// Add new user
app.post('/api/exercise/new-user', (req, res) => {
    let username = req.body.username;
    User.findOne({
        username: username
    }, (err, storedUsername) => {
        if (err) return;
        if (storedUsername) {
            res.send('the username <' + username + ' > has already been taken :(');
        } else {
            let newUser = new User({
                username: username
            });
            newUser.save((err, createdUser) => {
                if (err) return;
                res.json({
                    username: username,
                    _id: createdUser.id
                });
            })
        }
    })
});

//get all users 
app.get('/api/exercise/users', (req, res) => {
    User.find({}, 'username _id', (err, users) => {
        let output = [];
        users.map((user) => {
            output.push(user);
        });
        res.send(output);
    });
});

// create exerciseShema
let exerciseSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

let Exercise = mongoose.model('Exercise', exerciseSchema);

// Add new exercise for a user
app.post('/api/exercise/add', (req, res) => {
    let userId = req.body.userId;
    let description = req.body.description;
    let duration = req.body.duration;
    let date = req.body.date;

    User.findOne({ _id: userId }, (err, user) => {
        if (err) return
        if (user) {
            let newExercise = new Exercise({
                userId: user._id,
                description: description,
                duration: duration
            });
            if (date.length > 0) {
                newExercise.date = new Date(date);
            } else {
                newExercise.date = new Date();
            }
            newExercise.save((err, createdExercise) => {
                if (err) return;
                res.json({
                    userId: userId,
                    description: description,
                    duration: duration,
                    date: createdExercise.date,
                    _id: createdExercise._id
                });
            });

        }
    });

})

//get list of all exercises
app.get('/api/exercise/log/:userId', (req, res) => {
    let userId = req.params.userId;
    let from = req.query.from;
    let to = req.query.to;
    let limit = req.query.limit;

    User.findOne({ _id: userId }, 'username_id', (err, user) => {
        if (err) return;
        if (from === undefined) {
            from = new Date(0);
        }
        if (to === undefined) {
            to = new Date();
        }
        if (limit === undefined) {
            limit = 0;
        } else {
            limit = parseInt(limit);
        }

        let query = Exercise.find({
            userId: userId,
            date: {
                $gte: from,
                $lte: to
            }
        }, 'description duration date _id', (err) => {
            if (err) return;
        }).sort({
            date: -1
        }).limit(limit);

        query.exec((err, exercises) => {
            if (err) return;
            res.json({
                user: user,
                exercises: exercises
            });
        });
    });
});

//Listen requests:)
const listener = app.listen(3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
});