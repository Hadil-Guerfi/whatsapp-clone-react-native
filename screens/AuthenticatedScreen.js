// AuthenticatedScreen.js
import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Navbar from "./Navbar";
import { signOut } from "firebase/auth";
import ProfileContent from "./ProfileContent";
import ChatsContent from "./ChatsContent";
import { ref, set, get, getDatabase } from "firebase/database";
import GroupsContent from "./GroupsContent";
import { auth, database } from "./../firebaseConfig"; // Import firebase config
import ChatScreen from "./ChatScreen";
import GroupChatScreen from "./GroupChatScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthenticatedScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState("Profile"); // Default to Profile
  const [user, setUser] = useState(null); // Hold user data in state
  const [other, setOther] = useState("a"); // Hold user data in state
  const [selectedGroup, setSelectedGroup] = useState("a"); // Hold user data in state

  useEffect(() => {
    // Fetch user data from Firebase or Supabase on initial load
    const userData = auth.currentUser;
    if (userData) {
      const uid = userData.uid;
      // Fetch user data from Firebase Realtime Database or Supabase
      const fetchUserData = async () => {
        const snapshot = await get(ref(database, `users/${uid}`));
        const userData = snapshot.val();
        setUser({
          email: userData.email,
          fullname: userData.fullname,
          pseudo: userData.pseudo,
          phone: userData.phone,
        });
      };
      fetchUserData();
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem("email");
      await AsyncStorage.removeItem("password");
      console.log("User logged out and session cleared.");
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  const renderContent = () => {
    if (!user) return null;

    switch (selectedTab) {
      case "Profile":
        return <ProfileContent user={user} />;
      case "Chats":
        return (
          <ChatsContent setSelectedTab={setSelectedTab} setOther={setOther} />
        );
      case "Talks":
        return <ChatScreen other={other} />;
      case "TalksGroup":
        return (
          <GroupChatScreen
            selectedGroup={selectedGroup}
            setSelectedTab={setSelectedTab}
          />
        );
      case "Groups":
        return (
          <GroupsContent
            setSelectedTab={setSelectedTab}
            setSelectedGroup={setSelectedGroup}
          />
        );

      case "Logout":
        handleLogout();
        return null;
      default:
        return <ProfileContent user={user} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      <Navbar setSelectedTab={setSelectedTab} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    paddingTop: 30, // Adjust this if using a custom status bar or navbar height
  },
});

export default AuthenticatedScreen;
