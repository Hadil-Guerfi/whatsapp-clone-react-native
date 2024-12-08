import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform, // This Platform import is already present
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
import * as DocumentPicker from "expo-document-picker";
import * as Permissions from "expo-permissions";

const ChatScreen = ({ other }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true); // Track loading state
  const [file, setFile] = useState(null); // Track the selected file
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
    if (messageText.trim() === "" && !file) return; // Don't send empty messages or without a file

    const chatKey = [currentUserId, other].sort().join("_");
    const database = getDatabase();
    const newMessageRef = push(ref(database, `chats/${chatKey}/messages`));

    try {
      const messageData = {
        senderId: currentUserId,
        text: messageText,
        timestamp: new Date().toISOString(),
      };

      // If a file is selected, you can include the file URL or other details
      if (file) {
        messageData.file = {
          uri: file.uri, // File URI
          name: file.name, // File name
          type: file.type, // File type
        };
      }

      await set(newMessageRef, messageData);
      setMessageText("");
      setFile(null); // Reset file after sending
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const { status } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);
      if (status !== "granted") {
        alert("Permission to access files is required!");
      }
    }
  };
  const pickFile = async () => {
    try {
      console.log("Picking file...");

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "text/plain"], // Allowed file types
      });

      if (result.type === "success") {
        setFile(result);
        console.log("Selected file details:", {
          name: result.name,
          type: result.mimeType,
          uri: result.uri,
        });
      } else {
        console.log("File picking cancelled.");
      }
    } catch (error) {
      console.error("Error picking document:", error);
      alert("Error picking document: " + error.message); // Optionally show an alert to the user
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
              {item.file && (
                <View>
                  <Text style={styles.messageText}>File: {item.file.name}</Text>
                </View>
              )}
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
        <TouchableOpacity onPress={pickFile} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Pick File</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {file && (
        <View style={styles.fileInfo}>
          <Text>Selected file: {file.name}</Text>
        </View>
      )}
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
  fileInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
});

export default ChatScreen;
