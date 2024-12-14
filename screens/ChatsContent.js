import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ImageBackground,
  Alert,
  ScrollView,
  Modal,
  TouchableOpacity,
  Image,
} from "react-native";
import { ref, get, getDatabase, set, remove } from "firebase/database";
import { auth } from "./../firebaseConfig";
import { Ionicons } from "react-native-vector-icons"; // Importing icon set

const ChatsContent = ({ setSelectedTab, setOther }) => {
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const currentUserEmail = auth.currentUser?.email;
  const currentUserId = auth.currentUser?.uid;
  const [otherInfos, setOtherInfos] = useState(null);

  useEffect(() => {
    const fetchUsersAndChats = async () => {
      try {
        const database = getDatabase();

        // Fetch all users
        const usersSnapshot = await get(ref(database, "users"));
        const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

        const usersList = Object.keys(users)
          .filter((userId) => userId !== currentUserId)
          .map((userId) => ({
            id: userId,
            email: users[userId].email,
            fullname: users[userId].fullname,
            phone: users[userId].phone,
            pseudo: users[userId].pseudo,
            picture: users[userId].picture || "https://via.placeholder.com/50",
          }));

        // Fetch all existing chats
        const chatsSnapshot = await get(ref(database, "chats"));
        const existingChats = chatsSnapshot.exists() ? chatsSnapshot.val() : {};

        // Determine users with and without existing chats
        const usersWithChats = usersList.filter((user) => {
          const chatKey = [currentUserId, user.id].sort().join("_");
          return existingChats[chatKey];
        });

        const usersWithoutChats = usersList.filter((user) => {
          const chatKey = [currentUserId, user.id].sort().join("_");
          return !existingChats[chatKey];
        });

        setChats(usersWithChats);

        setAllUsers(usersWithoutChats);

        // Fetch the last message for each chat
        const lastMessagesMap = {};
        for (const chat of usersWithChats) {
          const chatKey = [currentUserId, chat.id].sort().join("_");
          const chatMessagesRef = ref(database, `chats/${chatKey}/messages`);
          const chatMessagesSnapshot = await get(chatMessagesRef);
          if (chatMessagesSnapshot.exists()) {
            const messages = chatMessagesSnapshot.val();
            const lastMessageKey = Object.keys(messages).pop();
            const lastMessage = messages[lastMessageKey];
            lastMessagesMap[chat.id] = {
              text: lastMessage.text
                ? lastMessage.text
                : lastMessage.file
                ? lastMessage.file.type === "image"
                  ? "Image sent 📷"
                  : "File Sent 📁"
                : "Say Hello 👋",
              timestamp: lastMessage.timestamp || new Date().toISOString(),
            };
          } else {
            lastMessagesMap[chat.id] = {
              text: "Say Hello 👋",
              timestamp: null,
            };
          }
        }
        setLastMessages(lastMessagesMap);
      } catch (error) {
        console.error("Error fetching users or chats:", error);
      }
    };

    fetchUsersAndChats();
  }, [currentUserId]);

  const handleAddChat = async (userId) => {
    try {
      const chatKey = [currentUserId, userId].sort().join("_");
      const database = getDatabase();
      const chatRef = ref(database, `chats/${chatKey}`);

      const chatSnapshot = await get(chatRef);
      if (chatSnapshot.exists()) {
        Alert.alert("Info", "Chat already exists!");
        setModalVisible(false);
        return;
      }

      // Create a new chat
      await set(chatRef, {
        users: [currentUserId, userId],
        messages: {},
        createdAt: new Date().toISOString(),
      });

      const userToAdd = allUsers.find((user) => user.id === userId);

      // Update chats and lastMessages state
      setChats((prevChats) => [...prevChats, userToAdd]);
      setAllUsers((prev) => prev.filter((user) => user.id !== userId));
      setLastMessages((prevMessages) => ({
        ...prevMessages,
        [userId]: "Say Hello 👋", // Set a default message for the new chat
      }));

      setModalVisible(false);
      Alert.alert("Success", "Chat added successfully!");
    } catch (error) {
      console.error("Error adding chat:", error);
      Alert.alert("Error", "Failed to add chat.");
    }
  };

  const handleOpenChat = async (userId) => {
    setSelectedTab("Talks");
    setOther(userId);
  };

  const filteredUsers = allUsers.filter((user) =>
    user.pseudo.toLowerCase().includes(modalSearchTerm.toLowerCase())
  );

  const filteredChats = chats.filter((user) =>
    user.pseudo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ImageBackground
        style={styles.background}
        source={require("../assets/background.jpg")}
        resizeMode="cover">
        <View style={styles.content}>
          <Text style={styles.title}>Chats</Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Chats"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            <TouchableOpacity
              style={styles.addChatButton}
              onPress={() => setModalVisible(true)}>
              <View style={styles.addChatIconContainer}>
                <Text style={styles.addChatIcon}>+</Text>
              </View>
            </TouchableOpacity>
          </View>

          {filteredChats.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.chatItemContainer}
              onPress={() => handleOpenChat(item.id)} // Start chat on click
            >
              <Image source={{ uri: item.picture }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.chatItem}>{item.pseudo}</Text>
                <Text style={styles.lastMessage}>
                  {lastMessages[item.id]?.text
                    ? lastMessages[item.id]?.text
                    : lastMessages[item.id]?.file
                    ? lastMessages[item.id]?.file === "image"
                      ? "Image sent 📷"
                      : "File Sent 📁"
                    : "Say Hello 👋"}
                </Text>
              </View>
              <Text style={styles.lastMessageTime}>
                {lastMessages[item.id]?.timestamp
                  ? new Date(
                      lastMessages[item.id].timestamp
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Text>
            </TouchableOpacity>
          ))}

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.headerContainer}>
                  <Text style={styles.modalHeader}>Add New Chat</Text>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={30} color="#e74c3c" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.searchInputUser}
                  placeholder="Search Users"
                  value={modalSearchTerm}
                  onChangeText={setModalSearchTerm}
                />

                {filteredUsers.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleAddChat(item.id)}>
                    <View style={styles.modalUserContainer}>
                      <Image
                        source={{ uri: item.picture }}
                        style={styles.avatar}
                      />
                      <Text style={styles.userEmail}>{item.pseudo}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>
        </View>
      </ImageBackground>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
  },
  background: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#25D366",
    marginVertical: 20,
  },
  searchContainer: {
    width: "100%",
    marginBottom: 10,
    display: "flex",
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 20,
  },
  addChatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  searchInput: {
    height: 50,
    flex: 1,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
    marginRight: 5,
  },

  chatItemContainer: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    paddingBottom: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  searchInputUser: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatItem: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },

  chatButton: {
    backgroundColor: "#25D366",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  chatButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalUserContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  userEmail: {
    fontSize: 16,
    marginLeft: 10,
  },
  closeModalButton: {
    color: "#e74c3c",
  },
  closeModalButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  addChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25D366",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  addChatIconContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  addChatIcon: {
    color: "#25D366",
    fontSize: 20,
    fontWeight: "bold",
  },

  headerContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  modalUserContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  lastMessageTime: {
    color: "#666",
    fontSize: 14,
    alignSelf: "flex-start",
  },
});

export default ChatsContent;
