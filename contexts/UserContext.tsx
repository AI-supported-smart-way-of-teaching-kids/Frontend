import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 👇 1. Define types for User and Context
type User = {
  id: string;
  name: string;
  role: "kid" | "parent" | "teacher";
  username?: string;
  email?: string;
  profilePicture?: string;
  points?: number;
  badges?: string[];
} | null;

type UserContextType = {
  user: User;
  login: (data: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<NonNullable<User>>) => void;
  language: string;
  setLanguage: (lang: string) => void;
};

// 👇 2. Give correct type instead of "null"
const UserContext = createContext<UserContextType | undefined>(undefined);

// 👇 3. Fix children type
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [language, setLanguage] = useState<string>('en');

  // Load user from storage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const storedUser = await AsyncStorage.getItem("user");
        const storedRole = await AsyncStorage.getItem("role");
        if (storedUser && storedRole) {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.role === storedRole) {
            setUser(parsedUser);
          }
        }
      } catch (e) {
        console.warn("Error loading user from storage:", e);
      }
    };
    loadUser();
  }, []);

  // 👇 4. Fix login "data" type
  const login = (data: User) => {
    setUser(data);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (updates: Partial<NonNullable<User>>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <UserContext.Provider value={{ user, login, logout, updateProfile, language, setLanguage }}>
      {children}
    </UserContext.Provider>
  );
};

// 👇 5. useUser hook with proper error handling
export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
};
