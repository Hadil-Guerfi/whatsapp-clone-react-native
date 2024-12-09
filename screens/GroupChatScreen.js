import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  Linking,
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

const GroupChatScreen = ({ selectedGroup }) => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    let isMounted = true;
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
      isMounted = false;
    };
  }, [selectedGroup]);

  const sendMessage = async () => {
    if (!messageText.trim() && !file) return;

    let fileUrl = "";

    if (file && file.type === "image") {
      fileUrl = await uploadImageToSupabase(file.uri);
      if (!fileUrl) return;
    }

    const newMessage = {
      senderId: currentUserId,
      text: messageText.trim(),
      timestamp: new Date().toISOString(),
      file: fileUrl ? { uri: fileUrl, type: "image" } : null,
    };

    const database = getDatabase();
    const newMessageRef = push(
      ref(database, `groups/${selectedGroup}/messages`)
    );

    try {
      await set(newMessageRef, newMessage);
      setMessageText("");
      setFile(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

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
        timestamp: new Date().toISOString(),
        file: null,
      };

      const database = getDatabase();
      const newMessageRef = push(
        ref(database, `groups/${selectedGroup}/messages`)
      );

      await set(newMessageRef, newMessage);
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

  const getSenderName = (senderId) => {
    if (senderId === currentUserId) {
      return "Me"; // Return "Me" if the sender is the current user
    }
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
        keyExtractor={(item) => item.id}
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
        inverted
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
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    fontSize: 16,
    marginVertical: 5,
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#e0f7fa",
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
  },
  senderName: {
    fontWeight: "bold",
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: "gray",
    textAlign: "right",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },
  iconButton: {
    padding: 10,
  },
  sendButton: {
    backgroundColor: "#3498db",
    borderRadius: 30,
    padding: 10,
    marginLeft: 10,
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: "#3498db",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
  },
});

export default GroupChatScreen;
