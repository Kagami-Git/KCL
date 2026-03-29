import { NavLink, Routes, Route } from "react-router-dom";
import HomePage from "../pages/HomePage";
import GamePage from "../pages/GamePage";
import DownloadPage from "../pages/DownloadPage";
import SettingsPage from "../pages/SettingsPage";
import AccountPage from "../pages/AccountPage";
import ToolboxPage from "../pages/ToolBoxPage";

export default function Sidebar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `btn btn-ghost justify-start ${isActive ? "btn-active" : ""}`;

  return (
    <div className="drawer min-[810px]:drawer-open">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col h-screen">
        <div className="navbar bg-base-300 w-full min-[810px]:hidden">
          <div className="flex-none">
            <label htmlFor="main-drawer" className="btn btn-square btn-ghost">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-5 h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="text-lg sm:text-xl font-bold"></span>
          </div>
        </div>
        <div className="flex-1 p-2 sm:p-4 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/accounts" element={<AccountPage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/toolbox" element={<ToolboxPage />} />
          </Routes>
        </div>
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <ul className="menu bg-base-200 min-h-full w-48 sm:w-64 p-2 sm:p-4 gap-1 sm:gap-2">
          <li className="min-[810px]:list-item">
            <span className="text-lg sm:text-xl font-bold mb-2 sm:mb-4">Kagami Launcher</span>
          </li>
          <li>
            <NavLink to="/" className={linkClass} end>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              <span className="text-sm sm:text-base">Home</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/game" className={linkClass}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-sm sm:text-base">Game</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/accounts" className={linkClass}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <span className="text-sm sm:text-base">Accounts</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/download" className={linkClass}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span className="text-sm sm:text-base">Download</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={linkClass}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span className="text-sm sm:text-base">Settings</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/toolbox" className={linkClass}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 stroke-current">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
              </svg>
              <span className="text-sm sm:text-base">Toolbox</span>
            </NavLink>
          </li>
          
        </ul>
      </div>
    </div>
  );
}
