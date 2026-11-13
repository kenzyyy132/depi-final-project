import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Root from './Root';
import './index.css';

// Boot milestones drive the loader in index.html. There is no artificial delay anywhere.
const boot = window.__boot;
boot?.step(1);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);

// The loader closes when the session check + first data load finished (signalled by AppContext)
// and web fonts are ready (fonts capped at 1.5s, the whole wait capped at 10s).
const appReady = new Promise((resolve) => { window.__nosAppReady = resolve; });
const cap = (ms) => new Promise((r) => setTimeout(r, ms));
const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), cap(1500)]);
Promise.race([Promise.all([fonts, appReady]), cap(10000)]).then(() => boot?.done());
