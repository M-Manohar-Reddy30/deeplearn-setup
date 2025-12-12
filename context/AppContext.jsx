"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

export const AppContextProvider = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState({ messages: [] });

  // ✅ Create new chat
  const createNewChat = async () => {
    try {
      if (!user) return null;

      const token = await getToken();

      await axios.post(
        "/api/chat/create",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchUsersChats();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Fetch all chats for current user
  const fetchUsersChats = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/chat/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setChats(data.data);

        // If no chats, create one
        if (data.data.length === 0) {
          await createNewChat();
          return fetchUsersChats();
        } else {
          // Sort by most recently updated
          data.data.sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );

          // Select most recent chat
          setSelectedChat(data.data[0]);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // ✅ Send message to AI
  const sendMessage = async (chatId, prompt) => {
    try {
      const token = await getToken();

      const { data } = await axios.post(
        "/api/chat/ai",
        { chatId, prompt },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        // Append user message + AI reply to selected chat
        setSelectedChat((prev) => ({
          ...prev,
          messages: [...prev.messages, { role: "user", content: prompt }, data.data],
        }));
      } else {
        toast.error(data.message || "Failed to get AI response");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Auto-fetch chats on login
  useEffect(() => {
    if (user) {
      fetchUsersChats();
    }
  }, [user]);

  const value = {
    user,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    fetchUsersChats,
    createNewChat,
    sendMessage, // 👈 now available in context
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
