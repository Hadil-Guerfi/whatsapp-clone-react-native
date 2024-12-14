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
  ScrollView,
  ImageBackground,
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
import Icon from "react-native-vector-icons/MaterialIcons"; // Example icon set
import * as DocumentPicker from "expo-document-picker"; // Import Document Picker

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

const ChatScreen = ({ other, setSelectedTab }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const currentUserId = auth.currentUser?.uid;
  const [locationLoading, setLocationLoading] = useState(false); // State for showing location-loading indicator
  const [otherInfos, setOtherInfos] = useState(null);

  const uploadFileToSupabase = async (uri, name, mimeType) => {
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { data, error } = await supabase.storage
        .from("images")
        .upload(`files/${Date.now()}_${name}`, buffer, {
          contentType: mimeType,
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
  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*", // Allow all file types
      copyToCacheDirectory: true,
    });

    // Check if the result is successful and contains assets
    if (result.assets && result.assets.length > 0) {
      const file = result.assets[0]; // Get the first file from the assets array

      setFile({
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream", // Fallback MIME type
      });
    } else {
      setFile(null); // If no file selected or operation failed
    }
  };
  const fetchOther = async (other) => {
    const database = getDatabase();
    const otherRef = ref(database, `users/${other}`); // Use the 'other' id here instead of 'userId'

    try {
      const otherSnapshot = await get(otherRef);
      if (otherSnapshot.exists()) {
        setOtherInfos(otherSnapshot.val());
      } else {
        console.log("No data available for this user");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    if (other) {
      const fetchData = async () => {
        await fetchOther(other);
      };

      fetchData();
    } else {
      console.log("No 'other' parameter provided to fetch data");
    }
  }, [other, currentUserId]);

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

  const sendLocation = async () => {
    setLocationLoading(true);

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
      setLocationLoading(false); 
    }
  };

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

  const handleCall = () => {
    if (otherInfos?.phone) {
      Linking.openURL(`tel:${otherInfos.phone}`).catch((err) =>
        console.error("Failed to make a call:", err)
      );
    } else {
      console.warn("Phone number is not available");
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

    console.log(file);

    try {
      // Upload file if selected
      if (file) {
        if (file.type === "image") {
          fileUrl = await uploadImageToSupabase(file.uri);
        } else {
          fileUrl = await uploadFileToSupabase(file.uri, file.name, file.type);
        }

        if (!fileUrl) {
          Alert.alert("File Upload Failed", "Unable to upload the file.");
          return;
        }
      }

      // Construct the message object
      const newMessage = {
        senderId: currentUserId,
        text: messageText.trim(),
        timestamp: Date.now(),
        file: fileUrl
          ? { uri: fileUrl, type: file.type, name: file.name }
          : null,
      };

      // Save the message to the database
      const database = getDatabase();
      const chatKey = [currentUserId, other].sort().join("_");
      const messagesRef = ref(database, `chats/${chatKey}/messages`);

      await set(push(messagesRef), newMessage);

      // Reset input fields
      setMessageText("");
      setFile(null);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Send Error", error.message);
    }
  };

  const deleteChat = async () => {
    try {
      const database = getDatabase();

      const chatKey = [currentUserId, other].sort().join("_");

      const chatRef = ref(database, `chats/${chatKey}`);

      // Confirm before deleting
      Alert.alert("Delete Chat", "Are you sure you want to delete this chat?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            // Delete the chat
            await set(chatRef, null);

            // Navigate to Chats screen
            setSelectedTab("Chats");
          },
          style: "destructive",
        },
      ]);
    } catch (error) {
      console.error("Error deleting group:", error);
      Alert.alert("Delete Error", error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ImageBackground
        style={styles.background}
        source={require("../assets/background.jpg")}
        resizeMode="cover">
        <View style={styles.content}>
          {/* Fixed position container */}
          <View style={styles.fixedContainer}>
            <Image
              source={{ uri: otherInfos?.picture && otherInfos.picture }}
              style={styles.avatar}
            />
            <Text style={styles.title}>
              {otherInfos?.pseudo && otherInfos?.pseudo}
            </Text>
            {otherInfos?.phone && (
              <TouchableOpacity onPress={handleCall} style={styles.callButton}>
                <Icon name="phone" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.deleteButton} onPress={deleteChat}>
              <Ionicons name="trash" size={24} color="red" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, marginTop: 85 }}>
            {messages
              .slice() // Make a copy of the messages array
              .reverse() // Invert the order to mimic FlatList's `inverted` behavior
              .map((item, index) => (
                <View
                  key={`${item.senderId}_${item.timestamp}`} // Unique key using senderId and timestamp
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
                          Linking.openURL(
                            item.text.replace("📍 Location: ", "")
                          )
                        }>
                        {item.text}
                      </Text>
                    ) : (
                      item.text
                    )}
                  </Text>

                  {item.file &&
                    (item.file.type === "image" ? (
                      <Image
                        source={{ uri: item.file.uri }}
                        style={styles.messageImage}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(item.file.uri)}
                        style={styles.fileContainer}>
                        <MaterialIcons
                          name="insert-drive-file"
                          size={50}
                          color="#3498db"
                        />
                        <Text style={styles.fileName}>{item.file.name}</Text>
                      </TouchableOpacity>
                    ))}

                  <Text style={styles.timestamp}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={messageText || (file ? file.name : "")}
              onChangeText={setMessageText}
            />
            <TouchableOpacity style={styles.sendButton} onPress={pickFile}>
              <MaterialIcons name="attach-file" size={24} color="white" />
            </TouchableOpacity>

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
                  <Text style={styles.modalButtonText}>
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={takePhoto}>
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
            <Image
              source={{ uri: file.uri }}
              style={{ width: 100, height: 100 }}
            />
          )}
        </View>
      </ImageBackground>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  fixedContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",

    height: 60,
    gap: 10,

    paddingLeft: 10,
    paddingRight: 10,
    alignItems: "center",
  },
  background: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#25D366",
  },
  inputContainer: {
    flexDirection: "row",
    backgroundColor: "#eee",
    marginBottom: 5,
  },
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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  modalButtonText: { color: "#000", fontSize: 16 },
  callButton: {
    marginLeft: "auto", // Push the button to the end of the row
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center", // Centre verticalement
    alignItems: "center", // Centre horizontalement
    backgroundColor: "rgba(0,0,0,0.5)", // Fond semi-transparent
  },
  modalContent: {
    width: "80%", // Largeur ajustable
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Ombrage pour Android
  },
  modalButton: {
    backgroundColor: "#25D366", // Vert WhatsApp pour plus de cohérence
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 50, // Boutons arrondis
    marginVertical: 10,
    width: "90%", // Largeur relative au conteneur
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 50,
    marginVertical: 10,
    width: "90%",
    alignItems: "center",
    justifyContent: "center",
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    elevation: 2,
  },
  fileName: {
    marginLeft: 10,
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ChatScreen;
