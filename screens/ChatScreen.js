import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
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
const ChatScreen = ({ other }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const database = getDatabase();
    const chatKey = [currentUserId, other].sort().join("_");
    const messagesRef = ref(database, `chats/${chatKey}/messages`);
    const messageKeys = new Set();

    const fetchMessages = async () => {
      try {
        const userSnapshot = await get(ref(database, `users/${other}`));
        if (userSnapshot.exists()) {
          setSelectedUser(userSnapshot.val());
        }

        const messagesSnapshot = await get(messagesRef);
        if (messagesSnapshot.exists()) {
          const initialMessages = Object.entries(messagesSnapshot.val()).map(
            ([key, message]) => {
              messageKeys.add(key);
              return { id: key, ...message };
            }
          );
          setMessages(initialMessages);
        }

        onChildAdded(messagesRef, (snapshot) => {
          const messageKey = snapshot.key;
          if (!messageKeys.has(messageKey)) {
            messageKeys.add(messageKey);
            const newMessage = { id: messageKey, ...snapshot.val() };
            setMessages((prev) => [...prev, newMessage]);
          }
        });
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [currentUserId, other]);

  const sendMessage = async () => {
    if (messageText.trim() === "") return;

    const chatKey = [currentUserId, other].sort().join("_");
    const database = getDatabase();
    const newMessageRef = push(ref(database, `chats/${chatKey}/messages`));

    try {
      await set(newMessageRef, {
        senderId: currentUserId,
        text: messageText,
        timestamp: new Date().toISOString(),
      });

      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Chat with {selectedUser ? selectedUser.fullname : "Loading..."}
      </Text>

      {loading ? (
        <Text>Loading messages...</Text>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={
                item.senderId === currentUserId
                  ? styles.myMessage
                  : styles.otherMessage
              }>
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          )}
          inverted
        />
      )}

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
  container: {
    flex: 1,
  },
  header: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
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
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  messageText: {
    fontSize: 16,
    color: "#fff",
  },
  timestamp: {
    fontSize: 12,
    color: "#ccc",
  },
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
});

export default ChatScreen;
