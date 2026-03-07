const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const healthRouter = require('./routes/health');
const audioRouter = require('./routes/audio');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '500mb' }));

app.use('/api/health', healthRouter);
app.use('/api/audio', audioRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
