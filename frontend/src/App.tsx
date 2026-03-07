
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AudioAnalysis } from './pages/AudioAnalysis';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/audio" element={<AudioAnalysis />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
