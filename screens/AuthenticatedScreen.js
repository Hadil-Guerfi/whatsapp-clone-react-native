import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Navbar from "./Navbar";
import { signOut } from "firebase/auth";
import ProfileContent from "./ProfileContent";
import ChatsContent from "./ChatsContent";
import { ref, set, get, getDatabase } from "firebase/database";
import GroupsContent from "./GroupsContent";
import { auth, database } from "./../firebaseConfig";
import ChatScreen from "./ChatScreen";
import GroupChatScreen from "./GroupChatScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthenticatedScreen = ({ navigation }) => {
  const [selectedTab, setSelectedTab] = useState("Profile");
  const [user, setUser] = useState(null);
  const [other, setOther] = useState("a");
  const [selectedGroup, setSelectedGroup] = useState("a");

  useEffect(() => {
    const userData = auth.currentUser;
    if (userData) {
      const uid = userData.uid;
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
        return <ChatScreen other={other} setSelectedTab={setSelectedTab} />;
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
    paddingTop: 30,
  },
});

export default AuthenticatedScreen;
