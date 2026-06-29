import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './index.css';
import './styles/theme.css';
import './styles/components.css';
import './styles/sideNav.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/character.css';
import './styles/themes/default.css';
// import './styles/themes/magic.css';
import './styles/themes/dos.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
