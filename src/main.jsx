import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import ClerkProviderWrapper from './components/ClerkProviderWrapper.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProviderWrapper>
      <App />
    </ClerkProviderWrapper>
  </StrictMode>
);
