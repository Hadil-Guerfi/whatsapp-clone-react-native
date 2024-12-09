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
  StyleSheet,
} from "react-native";
import { ref, get, set, push, update, getDatabase } from "firebase/database";
import { auth } from "./../firebaseConfig";

const GroupsContent = ({ setSelectedTab, setSelectedGroup }) => {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersWithCurrent, setAllUsersWithCurrent] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null); // Track the current group being edited
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
    const chatId = push(ref(database, "chats")).key; // Create unique chat ID

    try {
      const groupMembers = [currentUserId, ...selectedUsers];
      // Save the group with the associated chatId and groupCreator
      await set(ref(database, `groups/${groupId}`), {
        name: groupName.trim(),
        members: groupMembers,
        chatId, // Link the chat ID to the group
        groupCreator: currentUserId, // Store the ID of the group creator
      });

      setGroups((prev) => [
        ...prev,
        {
          id: groupId,
          name: groupName.trim(),
          members: groupMembers,
          chatId,
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
  const editGroup = (group) => {
    if (group.groupCreator !== currentUserId) {
      Alert.alert(
        "Permission Denied",
        "You are not the creator of this group."
      );
      return;
    }

    setCurrentGroup(group); // Set the group to be edited
    setGroupName(group.name);
    setSelectedUsers(group.members.filter((id) => id !== currentUserId)); // Exclude the current user
    setModalVisible(true); // Open the modal to add more users
  };

  const addMembersToGroup = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert("Error", "Select at least one member to add.");
      return;
    }

    const database = getDatabase();
    try {
      // Update the group with the new members
      const updatedMembers = [...currentGroup.members, ...selectedUsers];
      await update(ref(database, `groups/${currentGroup.id}`), {
        members: updatedMembers,
      });

      setGroups((prev) =>
        prev.map((group) =>
          group.id === currentGroup.id
            ? { ...group, members: updatedMembers }
            : group
        )
      );
      setModalVisible(false);
      setGroupName("");
      setSelectedUsers([]);
      Alert.alert("Success", "Members added successfully!");
    } catch (error) {
      console.error("Error adding members:", error);
    }
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
  const renderGroupItem = ({ item }) => {
    // Find the full name of the group creator
    const groupCreator = allUsersWithCurrent.find(
      (user) => user.id === item.groupCreator
    );
    const creatorName = groupCreator ? groupCreator.fullname : "Unknown";

    return (
      <View style={styles.groupItem}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupCreator}>Created by: {creatorName}</Text>

        <View style={styles.groupActions}>
          <TouchableOpacity
            onPress={() => openGroupChat(item)}
            style={styles.chatButton}>
            <Text style={styles.chatButtonText}>Start Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => deleteGroup(item.id)}
            style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          {item.groupCreator === currentUserId && ( // Check if the current user is the creator
            <TouchableOpacity
              onPress={() => editGroup(item)}
              style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Groups</Text>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroupItem}
      />
      <Button
        title="Create Group"
        onPress={() => setModalVisible(true)}
        color="#3498db"
      />
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <TextInput
            style={styles.input}
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
          />
          <FlatList
            data={allUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
          />
          {currentGroup ? (
            <Button title="Add Members" onPress={addMembersToGroup} />
          ) : (
            <Button title="Create" onPress={createGroup} />
          )}
          <Button
            title="Close"
            onPress={() => setModalVisible(false)}
            color="#e74c3c"
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 80 },
  header: { fontSize: 20, marginBottom: 20 },
  groupItem: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#f4f4f4",
    borderRadius: 5,
  },
  groupName: { fontSize: 16, marginBottom: 10 },
  groupActions: { flexDirection: "row", justifyContent: "space-between" },
  chatButton: { backgroundColor: "#3498db", padding: 10, borderRadius: 5 },
  chatButtonText: { color: "#fff" },
  deleteButton: { backgroundColor: "#e74c3c", padding: 10, borderRadius: 5 },
  deleteButtonText: { color: "#fff" },
  editButton: { backgroundColor: "#f39c12", padding: 10, borderRadius: 5 },
  editButtonText: { color: "#fff" },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  input: {
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  userItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  selectedUser: { backgroundColor: "#d1f7c4" },
});

export default GroupsContent;
