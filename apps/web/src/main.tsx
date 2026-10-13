import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from './app/providers.js';
import { AppRouter } from './app/router.js';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </React.StrictMode>,
);
