import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { ref, get, set, push, update, getDatabase } from "firebase/database";
import { auth } from "./../firebaseConfig";
import { Ionicons } from "react-native-vector-icons"; // Importing icon set

const GroupsContent = ({ setSelectedTab, setSelectedGroup }) => {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersWithCurrent, setAllUsersWithCurrent] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchData = async () => {
      const database = getDatabase();

      try {
        // Fetch users
        const usersSnapshot = await get(ref(database, "users"));
        const users = usersSnapshot.exists() ? usersSnapshot.val() : {};
        const filteredUsers = Object.keys(users)
          .filter((id) => id !== currentUserId)
          .map((id) => ({ id, ...users[id] }));
        setAllUsers(filteredUsers);

        const filteredUsersWithCurrent = Object.keys(users).map((id) => ({
          id,
          ...users[id],
        }));
        setAllUsersWithCurrent(filteredUsersWithCurrent);

        // Fetch groups
        const groupsSnapshot = await get(ref(database, "groups"));
        const groupsData = groupsSnapshot.exists() ? groupsSnapshot.val() : {};
        const groupsArray = Object.keys(groupsData)
          .map((id) => ({
            id,
            ...groupsData[id],
          }))
          .filter((group) => group.members.includes(currentUserId)); // Only include groups where the current user is a member

        setGroups(groupsArray);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [currentUserId]);

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      Alert.alert("Error", "Provide a group name and select members.");
      return;
    }

    const database = getDatabase();
    const groupId = push(ref(database, "groups")).key;

    try {
      const groupMembers = [currentUserId, ...selectedUsers];
      // Save the group with the associated chatId and groupCreator
      await set(ref(database, `groups/${groupId}`), {
        name: groupName.trim(),
        members: groupMembers,
        groupCreator: currentUserId, // Store the ID of the group creator
      });

      setGroups((prev) => [
        ...prev,
        {
          id: groupId,
          name: groupName.trim(),
          members: groupMembers,
          groupCreator: currentUserId,
        },
      ]);
      setModalVisible(false);
      setGroupName("");
      setSelectedUsers([]);
      Alert.alert("Success", "Group created successfully!");
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const openGroupChat = (group) => {
    setSelectedTab("TalksGroup");
    setSelectedGroup(group.id);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        setSelectedUsers((prev) =>
          prev.includes(item.id)
            ? prev.filter((id) => id !== item.id)
            : [...prev, item.id]
        )
      }
      style={[
        styles.userItem,
        selectedUsers.includes(item.id) && styles.selectedUser,
      ]}>
      <Text>{item.fullname}</Text>
    </TouchableOpacity>
  );

  const [searchTerm, setSearchTerm] = useState("");
  const filtredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ImageBackground
        style={styles.background}
        source={require("../assets/background.jpg")}
        resizeMode="cover">
        <View style={styles.content}>
          <Text style={styles.title}>Groups</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search Chats"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            <TouchableOpacity
              style={styles.addGroupButton}
              onPress={() => setModalVisible(true)}>
              <View style={styles.addGroupIconContainer}>
                <Text style={styles.addGroupIcon}>+</Text>
              </View>
            </TouchableOpacity>
          </View>
          {/* Render groups manually using map */}
          {filtredGroups.map((item) => {
            // Find the full name of the group creator
            const groupCreator = allUsersWithCurrent.find(
              (user) => user.id === item.groupCreator
            );
            const creatorName = groupCreator
              ? groupCreator.fullname
              : "Unknown";

            return (
              <View key={item.id} style={styles.groupItem}>
                <View>
                  <Text style={styles.groupItemTitle}>{item.name}</Text>
                  <Text style={styles.groupCreator}>Admin: {creatorName}</Text>
                </View>
                <View>
                  <TouchableOpacity
                    onPress={() => openGroupChat(item)}
                    style={styles.chatButton}>
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={28}
                      color="#25D366"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <Modal visible={modalVisible} animationType="slide">
            <View style={styles.modalContainer}>
              <View
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 25,
                }}>
                <Text style={styles.modalHeader}>Create a New Group</Text>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#e74c3c" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Group Name"
                value={groupName}
                onChangeText={setGroupName}
              />

              <Text style={styles.subHeader}>Select Members</Text>

              <FlatList
                data={allUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUserItem}
                style={styles.userList} // Apply style to the FlatList
              />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={createGroup}>
                  <Text style={styles.buttonText}>Create Group</Text>
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
    width: "100%",
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
  groupItem: {
    width: "90%",
    marginBottom: 20,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    justifyContent: "space-between",
  },
  searchContainer: {
    width: "100%",
    marginBottom: 20,
    display: "flex",
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 20,
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
  addGroupButton: {
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
  addGroupIconContainer: {
    backgroundColor: "#fff",
    borderRadius: 50,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  addGroupIcon: {
    color: "#25D366",
    fontSize: 20,
    fontWeight: "bold",
  },
  groupName: { fontSize: 16, marginBottom: 10 },

  chatButton: { width: "auto", borderRadius: 5 },
  chatButtonText: { color: "#fff" },

  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 20,
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    flexGrow: 1,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
    color: "#fff",
  },
  input: {
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    width: "100%",
    backgroundColor: "#fff",
  },
  // User List Styling
  userList: {
    width: "100%",
    paddingVertical: 10,
  },

  userItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 5,
  },

  selectedUser: {
    backgroundColor: "#d1f7c4",
  },

  // Button Container and Action Button Styles
  buttonContainer: {
    marginTop: 20,
    width: "100%",
  },
  actionButton: {
    backgroundColor: "#27b141",
    padding: 15,
    marginTop: 16,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  groupItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginBottom: 8,
  },
});

export default GroupsContent;
