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

const ChatsContent = ({ setSelectedTab, setOther }) => {
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUserEmail = auth.currentUser?.email;
  const currentUserId = auth.currentUser?.uid;

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

      await set(chatRef, {
        users: [currentUserId, userId],
        messages: [],
        createdAt: new Date().toISOString(),
      });

      const userToAdd = allUsers.find((user) => user.id === userId);
      setChats((prevChats) => [...prevChats, userToAdd]);
      setAllUsers((prev) => prev.filter((user) => user.id !== userId));
      setModalVisible(false);
      Alert.alert("Success", "Chat added successfully!");
    } catch (error) {
      console.error("Error adding chat:", error);
      Alert.alert("Error", "Failed to add chat.");
    }
  };

  const handleOpenChat = (userId) => {
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
          </View>

          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.chatItemContainer}>
                <Image source={{ uri: item.picture }} style={styles.avatar} />
                <Text style={styles.chatItem}>{item.pseudo}</Text>

                <TouchableOpacity
                  onPress={() => handleOpenChat(item.id)}
                  style={styles.chatButton}>
                  <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          <TouchableOpacity
            style={styles.addChatButton}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.addChatButtonText}>Add Chat</Text>
          </TouchableOpacity>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalHeader}>Add New Chat</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Users"
                  value={modalSearchTerm}
                  onChangeText={setModalSearchTerm}
                />

                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
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
                  )}
                />

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
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
    marginBottom: 20,
  },
  searchInput: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  chatItemContainer: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatItem: {
    fontSize: 16,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    marginBottom: 20,
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
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  closeModalButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default ChatsContent;
