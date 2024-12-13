//chatcontent
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  TouchableOpacity,
} from "react-native";
import { ref, get, getDatabase, set, remove } from "firebase/database";
import { auth } from "./../firebaseConfig";

const ChatsContent = ({ setSelectedTab, setOther }) => {
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalSearchTerm, setModalSearchTerm] = useState(""); // Search term for modal
  const [allUsers, setAllUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUserEmail = auth.currentUser?.email;
  const currentUserId = auth.currentUser?.uid; // Get current user ID

  useEffect(() => {
    // Fetch all users and chats from Firebase
    const fetchUsersAndChats = async () => {
      try {
        const database = getDatabase();

        // Fetch all users
        const usersSnapshot = await get(ref(database, "users"));
        const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

        const filteredUsers = Object.keys(users)
          .filter((userId) => userId !== currentUserId) // Exclude the current user
          .map((userId) => ({
            id: userId,
            email: users[userId].email,
            fullname: users[userId].fullname,
            phone: users[userId].phone,
            pseudo: users[userId].pseudo,
          }));
        // Fetch all existing chats
        const chatsSnapshot = await get(ref(database, "chats"));
        const existingChats = chatsSnapshot.exists() ? chatsSnapshot.val() : {};

        // Filter users who have a chat with the current user
        const usersWithChats = filteredUsers.filter((user) => {
          // Check if the current user and the other user are part of the chat
          const chatKey = [currentUserId, user.id].sort().join("_");
          return existingChats[chatKey]; // Include users who have a chat with the current user
        });
        const usersWithoutChats = filteredUsers.filter((user) => {
          // Check if the current user and the other user are part of the chat
          const chatKey = [currentUserId, user.id].sort().join("_");
          return !existingChats[chatKey]; // Include users who have a chat with the current user
        });
        setAllUsers(usersWithoutChats);
        setChats(usersWithChats); // Set the initial chat list
      } catch (error) {
        console.error("Error fetching users or chats:", error);
      }
    };

    fetchUsersAndChats();
  }, [currentUserId]);

  const handleAddChat = async (userId) => {
    try {
      const chatKey = [currentUserId, userId].sort().join("_"); // Sort the user IDs to create a consistent key

      const database = getDatabase();
      const chatRef = ref(database, `chats/${chatKey}`);
      const usersRef = ref(database, `users/${userId}`);

      // Check if the chat already exists
      const chatSnapshot = await get(chatRef);
      if (chatSnapshot.exists()) {
        Alert.alert("Info", "Chat already exists!");
        setModalVisible(false);
        return;
      }
      const userSnapshot = await get(usersRef);
      if (!userSnapshot.exists()) {
        Alert.alert("Error", "User not found.");
        return;
      }
      const user = userSnapshot.val();
      const userWithId = { ...user, id: userId };
      // Create a new chat with an empty messages array
      await set(chatRef, {
        users: [currentUserId, userId],
        messages: [], // Initialize with an empty messages array
        createdAt: new Date().toISOString(),
      });

      setChats((prevChats) => [...prevChats, userWithId]);
      setAllUsers((prev) => prev.filter((e) => e.id != userId));
      setModalVisible(false);
      Alert.alert("Success", "Chat added successfully!");
    } catch (error) {
      console.error("Error adding chat:", error);
      Alert.alert("Error", "Failed to add chat.");
    }
  };

  const handleDeleteChat = async (userId) => {
    try {
      const chatKey = [currentUserId, userId].sort().join("_"); // Sort the user IDs to create a consistent key
      const database = getDatabase();
      const chatRef = ref(database, `chats/${chatKey}`);
      const usersRef = ref(database, `users/${userId}`);

      // Remove the chat from the database
      await remove(chatRef);
      const userSnapshot = await get(usersRef);
      if (!userSnapshot.exists()) {
        Alert.alert("Error", "User not found.");
        return;
      }
      const user = userSnapshot.val();
      const userWithId = { ...user, id: userId };

      // Update the state to remove the deleted chat from the list
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== userId));
      setAllUsers((prev) => [...prev, userWithId]);
      Alert.alert("Success", "Chat deleted successfully!");
    } catch (error) {
      console.error("Error deleting chat:", error);
      Alert.alert("Error", "Failed to delete chat.");
    }
  };

  const handleOpenChat = (userId) => {
    const chatKey = [currentUserId, userId].sort().join("_");
    setSelectedTab("Talks");
    setOther(userId);
    // navigation.navigate('ChatScreen', { chatKey });
  };

  // Filter users based on modal search term (search by email, fullname, phone, or pseudo)
  const filteredUsers = allUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      user.fullname.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      user.phone.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
      user.pseudo.toLowerCase().includes(modalSearchTerm.toLowerCase())
  );
  const filteredChats = chats.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.pseudo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chats</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Chats"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {filteredChats.map((chat) => (
          <View style={styles.chatItemContainer} key={chat.id}>
            <Text style={styles.chatItem}>{chat.email}</Text>
            <TouchableOpacity
              onPress={() => handleOpenChat(chat.id)}
              style={styles.chatButton}>
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteChat(chat.id)}
              style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

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
            <ScrollView>
              {filteredUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleAddChat(user.id)}>
                  <Text style={styles.userEmail}>
                    {user.email} - {user.fullname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Close"
              onPress={() => setModalVisible(false)}
              color="#e74c3c"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 80,
  },
  header: {
    fontSize: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  addButton: {
    height: 50,
    width: 50,
    backgroundColor: "#3498db",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  chatItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  chatItem: {
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    padding: 5,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  chatButton: {
    backgroundColor: "#3498db",
    padding: 5,
    borderRadius: 5,
  },
  chatButtonText: {
    color: "#fff",
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
  userEmail: {
    fontSize: 16,
    marginBottom: 10,
    color: "#3498db",
  },
});

export default ChatsContent;
