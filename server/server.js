const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

require("mongoose").connect(MONGO_URI)
.then(() => {
    console.log("Connected to MongoDB");
})
.catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
});


app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});