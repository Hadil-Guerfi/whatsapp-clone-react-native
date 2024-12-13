import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth } from "./../firebaseConfig";
import supabase from "./supabaseClient";
import { ref, set, get } from "firebase/database";
import { database } from "../firebaseConfig"; // Assurez-vous que `database` est correctement importé

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
      .upload(`profiles/${auth.currentUser.uid}_${fileName}`, buffer, {
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

const ProfileScreen = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfileImage = async () => {
    setLoading(true);
    try {
      const snapshot = await get(
        ref(database, `users/${auth.currentUser.uid}`)
      );
      const userData = snapshot.val();

      if (userData?.picture) {
        setProfileImage(userData.picture);
      }
    } catch (err) {
      console.error("Error fetching profile image:", err);
      Alert.alert("Error", "Could not load profile image.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfileImage = async (uri) => {
    const uploadedImageUrl = await uploadImageToSupabase(uri);
    if (!uploadedImageUrl) return;

    setLoading(true);
    try {
      await set(
        ref(database, `users/${auth.currentUser.uid}/picture`),
        uploadedImageUrl
      );
      setProfileImage(uploadedImageUrl);
      Alert.alert("Success", "Profile image updated!");
    } catch (err) {
      console.error("Error updating profile image:", err);
      Alert.alert("Error", "Could not update profile image.");
    } finally {
      setLoading(false);
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "We need access to your library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      updateProfileImage(result.assets[0].uri);
    }
  };

  useEffect(() => {
    fetchProfileImage();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <Image
          source={
            profileImage ? { uri: profileImage } : require("../assets/logo.png") // Add a default profile image in assets folder
          }
          style={styles.profileImage}
        />
      )}
      <TouchableOpacity style={styles.button} onPress={pickImageFromGallery}>
        <Text style={styles.buttonText}>Choose from Gallery</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default ProfileScreen;
