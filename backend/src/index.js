const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const aiRouter = require('./routes/ai');

const healthRouter = require('./routes/health');
const audioRouter = require('./routes/audio');
const analyticsRouter = require('./routes/analytics');
const auditRouter = require('./routes/audit');
const aiDispatchRouter = require('./routes/ai-dispatch');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '500mb' }));

app.use('/api/health', healthRouter);
app.use('/api/audio', audioRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai-dispatch', aiDispatchRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
