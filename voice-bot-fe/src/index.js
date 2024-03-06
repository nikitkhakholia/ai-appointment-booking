import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Appointmtnt from './Pages/Appointment';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <div id="main" style={{ height: "100%", background: "#d3d3d3" }} className='h-full hei'>
      <div className='h-full'>
        <Routes>
          <Route path='/' element={<Appointmtnt />} />
        </Routes>
      </div>
    </div>
  </BrowserRouter>
);
