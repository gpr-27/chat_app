import { useState } from "react";
import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-base-200 flex flex-col">
      {/* Hamburger for mobile */}
      <div className="sm:hidden flex items-center justify-between px-4 pt-20 pb-2">
        <button
          className="btn btn-circle btn-ghost"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <span className="font-bold text-lg">Chatty</span>
      </div>
      <div className="flex flex-1 flex-col sm:flex-row items-stretch justify-center px-0 sm:px-4 pb-4 sm:pt-20 min-h-0">
        {/* Sidebar: hidden on mobile unless toggled */}
        <div className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${sidebarOpen ? "block" : "hidden"} sm:hidden`} onClick={() => setSidebarOpen(false)} />
        <div className={`fixed left-0 top-0 z-50 h-full w-72 bg-base-100 shadow-lg transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} sm:static sm:translate-x-0 sm:w-72 sm:block`}>
          <Sidebar />
        </div>
        {/* Main chat area */}
        <div className="flex-1 min-h-0 flex flex-col bg-base-100 rounded-lg shadow-cl w-full max-w-6xl mx-auto">
          <div className="flex-1 flex flex-col h-full rounded-lg overflow-hidden">
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
