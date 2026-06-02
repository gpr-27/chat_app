import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/chat/Sidebar";
import NoChatSelected from "../components/chat/NoChatSelected";
import ChatContainer from "../components/chat/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="app-bg relative h-screen overflow-hidden pt-16">
      <div className="blobs" aria-hidden="true" />

      <div className="relative mx-auto flex h-full max-w-7xl px-0 sm:px-4 sm:pb-4">
        <div className="glass-card mx-auto mt-0 flex w-full overflow-hidden sm:mt-2 sm:rounded-3xl">
          {/* Contacts — full screen on mobile until a chat is opened */}
          <div
            className={`w-full shrink-0 sm:flex sm:w-80 ${selectedUser ? "hidden" : "flex"}`}
          >
            <Sidebar />
          </div>

          {/* Conversation — full screen on mobile only when a chat is open */}
          <div className={`flex-1 ${selectedUser ? "flex" : "hidden sm:flex"}`}>
            {selectedUser ? <ChatContainer /> : <NoChatSelected />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
