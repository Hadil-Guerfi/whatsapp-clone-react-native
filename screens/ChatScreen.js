import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Linking,
  Alert,
  Modal,
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
import * as ImagePicker from "expo-image-picker";
import supabase from "./supabaseClient"; // Import the Supabase client
import * as Location from "expo-location"; // Import Location API
import { Ionicons, MaterialIcons } from "react-native-vector-icons"; // Import vector icons

const uploadImageToSupabase = async (uri) => {
  const fileName = uri.split("/").pop();
  const fileExt = fileName.split(".").pop().toLowerCase();
  const fileType =
    fileExt === "jpg" || fileExt === "jpeg"
      ? "image/jpeg"
      : fileExt === "png"
      ? "image/png"
      : null;

  if (!fileType) {
    Alert.alert("File Error", "Unsupported file type.");
    return null;
  }

  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from("images")
      .upload(`images/${Date.now()}_${fileName}`, buffer, {
        contentType: fileType,
      });

    if (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Error", error.message);
      return null;
    }

    const { data: publicData, error: urlError } = supabase.storage
      .from("images")
      .getPublicUrl(data.path);

    if (urlError) {
      console.error("URL Error:", urlError);
      return null;
    }

    return publicData.publicUrl;
  } catch (err) {
    console.error("Unexpected Error:", err);
    Alert.alert("Error", err.message);
    return null;
  }
};

const ChatScreen = ({ other }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUserId = auth.currentUser?.uid;
  const [locationLoading, setLocationLoading] = useState(false); // State for showing location-loading indicator

  const sendLocation = async () => {
    setLocationLoading(true); // Show loading indicator while fetching location

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need location access to share it."
        );
        setLocationLoading(false);
        return;
      }

      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      const locationUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

      const newMessage = {
        senderId: currentUserId,
        text: `📍 Location: ${locationUrl}`,
        timestamp: Date.now(),
        file: null,
      };

      const database = getDatabase();
      const chatKey = [currentUserId, other].sort().join("_");
      const messagesRef = ref(database, `chats/${chatKey}/messages`);

      await set(push(messagesRef), newMessage);
    } catch (error) {
      console.error("Error sharing location:", error);
      Alert.alert("Location Error", error.message);
    } finally {
      setLocationLoading(false); // Hide loading indicator
    }
  };
  useEffect(() => {
    const database = getDatabase();
    const chatKey = [currentUserId, other].sort().join("_");
    const messagesRef = ref(database, `chats/${chatKey}/messages`);
    const messageKeys = new Set();

    const fetchMessages = async () => {
      try {
        const messagesSnapshot = await get(messagesRef);
        if (messagesSnapshot.exists()) {
          const initialMessages = Object.entries(messagesSnapshot.val()).map(
            ([key, message]) => {
              messageKeys.add(key);
              return { id: key, ...message };
            }
          );

          // Sort messages by timestamp in descending order
          const sortedMessages = initialMessages.sort(
            (a, b) => b.timestamp - a.timestamp
          );
          setMessages(sortedMessages);
        }

        onChildAdded(messagesRef, (snapshot) => {
          const messageKey = snapshot.key;
          if (!messageKeys.has(messageKey)) {
            messageKeys.add(messageKey);
            const newMessage = { id: messageKey, ...snapshot.val() };

            // Add the new message and sort again
            setMessages((prev) =>
              [newMessage, ...prev].sort((a, b) => b.timestamp - a.timestamp)
            );
          }
        });
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [currentUserId, other]);

  const pickImageFromGallery = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need permission to access your library."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName,
        type: "image",
      });
    }
  };

  const takePhoto = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need permission to access camera.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setFile({
        uri: result.assets[0].uri,
        name: result.assets[0].fileName,
        type: "image",
      });
    }
  };

  const sendMessage = async () => {
    if (messageText.trim() === "" && !file) {
      Alert.alert(
        "Validation Error",
        "Please enter a message or select a file."
      );
      return;
    }

    let fileUrl = "";

    if (file && file.type === "image") {
      fileUrl = await uploadImageToSupabase(file.uri);
      if (!fileUrl) return;
    }

    const newMessage = {
      senderId: currentUserId,
      text: messageText.trim(),
      timestamp: Date.now(),
      file: fileUrl ? { uri: fileUrl, type: "image" } : null,
    };

    try {
      const database = getDatabase();
      const chatKey = [currentUserId, other].sort().join("_");
      const messagesRef = ref(database, `chats/${chatKey}/messages`);

      await set(push(messagesRef), newMessage);

      setMessageText("");
      setFile(null);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Send Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Existing FlatList for messages */}
      <FlatList
        data={messages}
        keyExtractor={(item, index) => `${item.senderId}_${item.timestamp}`} // Use senderId and timestamp for a unique key
        inverted
        renderItem={({ item }) => (
          <View
            style={
              item.senderId === currentUserId
                ? styles.myMessage
                : styles.otherMessage
            }>
            <Text style={styles.messageText}>
              {item.text.includes("https://www.google.com/maps") ? (
                <Text
                  style={{ color: "blue" }}
                  onPress={() =>
                    Linking.openURL(item.text.replace("📍 Location: ", ""))
                  }>
                  {item.text}
                </Text>
              ) : (
                item.text
              )}
            </Text>

            {item.file && item.file.type === "image" && (
              <Image
                source={{ uri: item.file.uri }}
                style={styles.messageImage}
              />
            )}
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
        />

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.sendButton}>
          <Ionicons name="image-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <Modal
          transparent={true}
          animationType="slide"
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={pickImageFromGallery}>
              <Text style={styles.modalButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={takePhoto}>
              <Text style={styles.modalButtonText}>Take a Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#e74c3c" }]}
              onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <MaterialIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={sendLocation}
          style={[styles.sendButton, { backgroundColor: "#2ecc71" }]}
          disabled={locationLoading}>
          <Ionicons
            name="location-outline"
            size={20}
            color="#fff"
            // style={{ marginHorizontal: 5 }}
          />
        </TouchableOpacity>
      </View>

      {/* Existing file preview */}
      {file && file.type === "image" && (
        <Image source={{ uri: file.uri }} style={{ width: 100, height: 100 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, marginTop: 10 },
  inputContainer: { flexDirection: "row" },
  input: {
    flex: 1,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
  },
  sendButton: {
    marginLeft: 5,
    backgroundColor: "#3498db",
    padding: 5,
    paddingTop: 10,
    borderRadius: 5,
  },
  sendButtonText: { color: "#fff" },
  myMessage: {
    backgroundColor: "#2ecc71",
    alignSelf: "flex-end",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  otherMessage: {
    backgroundColor: "#3498db",
    alignSelf: "flex-start",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  messageText: { color: "#fff" },
  messageImage: {
    width: 200,
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },
  timestamp: { fontSize: 10, color: "#ccc", marginTop: 5 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    width: "80%",
    alignItems: "center",
  },
  modalButtonText: { color: "#000", fontSize: 16 },
});

export default ChatScreen;
