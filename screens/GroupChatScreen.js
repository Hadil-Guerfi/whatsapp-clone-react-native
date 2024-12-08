import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  getDatabase,
  ref,
  get,
  set,
  push,
  onChildAdded,
} from "firebase/database";
import { auth } from "./../firebaseConfig";

const GroupChatScreen = ({ selectedGroup }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted components
    const database = getDatabase();

    const fetchGroupData = async () => {
      try {
        const groupSnapshot = await get(
          ref(database, `groups/${selectedGroup}`)
        );
        if (groupSnapshot.exists()) {
          const groupData = groupSnapshot.val();
          if (isMounted) {
            setGroup(groupData);
          }

          const usersSnapshot = await get(ref(database, "users"));
          const users = usersSnapshot.exists() ? usersSnapshot.val() : {};

          const groupMembers = groupData.members.map((id) => ({
            id,
            name: users[id]?.fullname || "Unknown",
          }));
          if (isMounted) {
            setMembers(groupMembers);
          }
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
      }
    };

    const fetchMessages = () => {
      const messagesRef = ref(database, `groups/${selectedGroup}/messages`);
      const messageKeys = new Set();

      onChildAdded(messagesRef, (snapshot) => {
        const messageKey = snapshot.key;
        if (!messageKeys.has(messageKey)) {
          messageKeys.add(messageKey);
          const newMessage = snapshot.val();
          if (isMounted) {
            setMessages((prevMessages) => [newMessage, ...prevMessages]);
          }
        }
      });
    };

    fetchGroupData();
    fetchMessages();
    setLoading(false);

    return () => {
      isMounted = false; // Cleanup: Prevent state updates after unmount
    };
  }, [selectedGroup]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    const database = getDatabase();
    const newMessageRef = push(
      ref(database, `groups/${selectedGroup}/messages`)
    );

    try {
      await set(newMessageRef, {
        senderId: currentUserId,
        text: messageText.trim(),
        timestamp: new Date().toISOString(),
      });

      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const getSenderName = (senderId) => {
    const sender = members.find((member) => member.id === senderId);
    return sender ? sender.name : "Unknown";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Group Chat: {group ? group.name : "Loading..."}
      </Text>

      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View
            style={
              item.senderId === currentUserId
                ? styles.myMessage
                : styles.otherMessage
            }>
            <Text style={styles.senderName}>
              {getSenderName(item.senderId)}
            </Text>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
        )}
        inverted
        style={{ flex: 1 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { fontSize: 18, marginVertical: 10, textAlign: "center" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  input: {
    flex: 1,
    height: 45,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingLeft: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 5,
  },
  sendButtonText: { color: "#fff", fontSize: 16 },
  myMessage: {
    backgroundColor: "#2ecc71",
    alignSelf: "flex-end",
    padding: 10,
    marginBottom: 5,
    borderRadius: 5,
    maxWidth: "70%",
  },
  otherMessage: {
    backgroundColor: "#3498db",
    alignSelf: "flex-start",
    padding: 10,
    marginBottom: 5,
    borderRadius: 5,
    maxWidth: "70%",
  },
  messageText: { fontSize: 16, color: "#fff" },
  timestamp: { fontSize: 12, color: "#ccc" },
  senderName: { fontWeight: "bold", marginBottom: 5, color: "#fff" },
});

export default GroupChatScreen;
