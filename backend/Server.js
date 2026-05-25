const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth",         require("./Routes/auth"));
app.use("/api/transactions", require("./Routes/transactions"));
app.use("/api/upload",       require("./Routes/upload"));
app.use("/api/report",       require("./Routes/report"));
app.use("/api/history",      require("./Routes/history"));
app.use("/api/alerts",       require("./Routes/alerts"));

mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("DB Connected"))
.catch(err => console.log(err));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});