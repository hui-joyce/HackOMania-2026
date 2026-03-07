const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const healthRouter = require('./routes/health');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/health', healthRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
