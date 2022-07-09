import React from 'react';
import { remote } from 'electron';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Tabs from './tabs';
import './App.global.css';

// const handleDoubleClick = () => {
//   // Solution from: https://github.com/electron/electron/issues/16385#issuecomment-653952292
//   // some possible jankiness since tightly coupled to System Preferences
//   const win = remote.getCurrentWindow();
//   if (!win) return; // No window, nothing to do, although this check doesn't make a whole lot of sense from the renderer process, but you shouldn't handle this from the renderer process
//   if (process.platform === 'darwin') {
//     // `getUserDefault` is only available under macOS
//     const action = remote.systemPreferences.getUserDefault(
//       'AppleActionOnDoubleClick',
//       'string'
//     );
//     if (action === 'None') return; // Action disabled entirely, nothing to do
//     if (action === 'Minimize') return win.minimize(); // The user prefers to minimize the window, weird
//   }
//   // Toggling maximization otherwise
//   // Under macOS this should actually trigger the "zoom" action, but I believe that's identical to toggling maximization for Electron apps, so we'll just do that for simplicity here
//   // In case you want to trigger the zoom action for some reason: Menu.sendActionToFirstResponder ( 'zoom:' );
//   if (win.isMaximized()) return win.unmaximize();
//   return win.maximize();
// };

// const Browser = () => {
//   return (
//     <div>
//       <div className="etabs-tabgroup" onDoubleClick={handleDoubleClick}>
//         <div className="etabs-tabs" />
//         <div className="etabs-buttons" />
//       </div>
//       <div className="etabs-views" />
//       {/* <Tabs /> */}
//     </div>
//   );
// };

export default function App() {
  return (
    <span />
    // <Browser />
    // <Router>
    //   <Routes>
    //     <Switch>
    //       <Route path="/" component={Browser} />
    //     </Switch>
    //   </Routes>
    // </Router>
  );
}
