const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const healthRouter = require('./routes/health');
const audioRouter = require('./routes/audio');
const analyticsRouter = require('./routes/analytics');
const auditRouter = require('./routes/audit');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '500mb' }));

app.use('/api/health', healthRouter);
app.use('/api/audio', audioRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/audit', auditRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
