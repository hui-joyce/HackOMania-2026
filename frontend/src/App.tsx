
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AudioAnalysis } from './pages/AudioAnalysis';
import { Analytics } from './pages/Analytics';
import { PABDemo } from './pages/PABDemo';
import { Audit } from './pages/Audit';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/audio" element={<AudioAnalysis />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/pab-demo" element={<PABDemo />} />
          <Route path="/audit" element={<Audit />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
