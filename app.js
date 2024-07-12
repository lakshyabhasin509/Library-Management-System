const express = require("express");
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const fs = require("fs");
const path = require("path");
const dotenv = require('dotenv')
dotenv.config()
mongoose.connect(process.env.DB)
    .then(() => console.log("DB Connected"))
    .catch(() => console.log("Error Connecting to DB"))

const User = require('./models/user');
const Book = require('./models/book');
const Student = require('./models/student');
let studentsData = fs.readFileSync(path.resolve(__dirname, 'student.json'));
let booksData = fs.readFileSync(path.resolve(__dirname, 'books.json'));
app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    secret: "secret",
    cookie: { maxAge: 24 * 60 * 60 * 1000 * 365 },
    saveUninitialized: true,
    resave: true
}));
app.use((req, res, next) => {
    res.locals.currentUser = req.session.username;
    next();
});
const requireLogin = (req, res, next) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }
    next();
}
app.get("/", (req, res) => {
    res.render("home");
})

app.get("/sign-up", (req, res) => {
    res.render("sign-up");
})

app.post("/sign-up", (req, res) => {
    const { username, password } = req.body;
    User.find({ username }, (err, docs) => {
        if (docs.length) {
            res.render("message", { message: "User Already Registered" });
        } else {
            User.create({ username: username, password: password }, (err, docs) => {
                if (err) {
                    console.log(err);
                } else {
                    res.render("message", { message: "User Registered" });
                }
            })
        }
    })
})
app.get("/login", (req, res) => {
    res.render("login");
})
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    User.findOne({ username }, (err, docs) => {
        if (docs) {
            if (password === docs.password) {
                req.session.username = username;
                res.redirect("/");
            } else {
                res.render("message", { message: "Wrong Username or Password" });
            }
        } else {
            res.render("message", { message: "User Not Registered" });
        }
    })
})

app.get("/add-books", requireLogin, (req, res) => {
    Book.find({}, (err, docs) => {
        if (!docs || docs.length === 0) {
            const books = JSON.parse(booksData);
            for (let i = 0; i < books.length; i++) {
                const { isbn, name, author, quantity } = books[i];
                Book.create({ isbn: isbn, name: name, author: author, quantity: quantity }, (err, docs) => {
                    if (err) {
                        console.log(err);
                    }
                })
            }
        }
    })
    res.render("add-books");
})

app.post("/add-books", (req, res) => {
    const { isbn, name, author, quantity } = req.body;
    Book.findOne({ isbn }, (err, docs) => {
        if (docs) {
            let q = parseInt(docs.quantity);
            q += parseInt(quantity);
            Book.findOneAndUpdate({ isbn: isbn }, {
                $set: {
                    quantity: q
                }   
            }, (err, docs) => {
                if (err) {
                    console.log(err);
                } else {
                    res.render("message", { message: "Book Updated" });
                }
            })
        }
        else {
            Book.create({ isbn: isbn, name: name, author: author, quantity: quantity }, (err, docs) => {
                if (err) {
                    console.log(err);
                } else {
                    res.render("message", { message: "Book Added" });
                }
            })
        }
    })
})

app.get("/books", requireLogin, (req, res) => {
    Book.find({}, (err, docs) => {
        if (docs) {
            res.render("books", { docs });
        } else {
            res.render("books", { docs: "" });
        }
    })
})

app.post("/books/delete", (req, res) => {
    const { isbn } = req.body;
    Book.findOneAndDelete({ isbn }, (err, docs) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/books")
        }
    })
})

app.get("/add-user", requireLogin, (req, res) => {
    Student.find({}, (err, docs) => {
        if (!docs || docs.length === 0) {
            const students = JSON.parse(studentsData);
            for (let i = 0; i < students.length; i++) {
                const { name, studentid } = students[i];
                Student.create({ name: name, studentid: studentid }, (err, docs) => {
                    if (err) {
                        console.log(err);
                    }
                })
            }
        }
    })
    res.render("add-user");
})

app.post("/add-user", (req, res) => {
    const { name, studentid } = req.body;
    Student.create({ name: name, studentid: studentid, issuedBooks: [] }, (err, docs) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/add-user");
        }
    })
})

app.get("/issue-books", requireLogin, (req, res) => {
    res.render("issue-books");
})

app.post("/issue-books", (req, res) => {
    const { studentid, isbn } = req.body;
    Student.findOne({ studentid }, (err, docs) => {
        if (docs) {
            Book.findOne({ isbn }, (err, docs) => {
                if (docs && docs.quantity >= 1) {
                    let q = parseInt(docs.quantity);
                    q -= 1;
                    Book.updateOne({ isbn }, { quantity: q }, (err, docs) => {
                        if (err) {
                            console.log(err);
                        } else {
                            Student.findOneAndUpdate({ studentid }, {
                                $push: {
                                    issuedBooks: isbn
                                }
                            }, (err, docs) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    res.render("message", { message: "Book Issued" });
                                }
                            })
                        }
                    })
                } else {
                    res.render("message", { message: "Book Not Available" });
                }
            })
        } else {
            res.render("message", { message: "Invalid Student ID" });
        }
    })
})

app.get("/students", requireLogin, (req, res) => {
    Student.find({}, (err, docs) => {
        if (docs) {
            res.render("students", { docs });
        } else {
            res.render("students", { docs: "" });
        }
    })
})
app.post("/students/delete", (req, res) => {
    const { studentid } = req.body;
    Student.findOneAndDelete({ studentid }, (err, docs) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/students")
        }
    })
})

app.get("/return-book", requireLogin, (req, res) => {
    res.render("return-book");
})

app.post("/return-book", (req, res) => {
    const { studentid, isbn } = req.body;
    Book.findOne({ isbn }, (err, docs) => {
        if (docs) {
            let q = parseInt(docs.quantity);
            q += 1;
            Book.findOneAndUpdate({ isbn }, {
                $set: {
                    quantity: q
                }
            }, (err, docs) => {
                if (err) {
                    console.log(err);
                } else {
                    Student.findOneAndUpdate({ studentid }, {
                        $pull: {
                            issuedBooks: isbn
                        }
                    }, (err, docs) => {
                        if (err) {
                            console.log(err);
                        } else {
                            res.render("message", { message: "Book Returned" });
                        }
                    })
                }
            })
        }
    })
})

app.get("/message", (req, res) => {
    res.render("message", { message: "Hello There!!" });
})

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
})

app.listen(process.env.PORT, () => {
    console.log("On " + process.env.PORT);
})