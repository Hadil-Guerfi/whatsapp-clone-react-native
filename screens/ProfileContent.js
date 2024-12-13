import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, database } from "./../firebaseConfig";
import { ref, set, get } from "firebase/database";
import supabase from "./supabaseClient";

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
  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [phone, setPhone] = useState("");

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const snapshot = await get(
        ref(database, `users/${auth.currentUser.uid}`)
      );
      const userData = snapshot.val();

      if (userData) {
        setProfileImage(userData.picture || null);
        setEmail(userData.email || "");
        setFullname(userData.fullname || "");
        setPseudo(userData.pseudo || "");
        setPhone(userData.phone || "");
      }
    } catch (err) {
      console.error("Error fetching profile data:", err);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      await set(ref(database, `users/${uid}`), {
        email,
        fullname,
        pseudo,
        phone,
        picture: profileImage,
      });
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfileImage = async (uri) => {
    const uploadedImageUrl = await uploadImageToSupabase(uri);
    if (!uploadedImageUrl) return;

    setLoading(true);
    try {
      setProfileImage(uploadedImageUrl);
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
    fetchProfileData();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : (
        <Image
          source={
            profileImage ? { uri: profileImage } : require("../assets/logo.png")
          }
          style={styles.profileImage}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={pickImageFromGallery}>
        <Text style={styles.buttonText}>Choose from Gallery</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        editable={false} // Email is not editable
      />

      <TextInput
        style={styles.input}
        value={fullname}
        onChangeText={setFullname}
        placeholder="Full Name"
      />

      <TextInput
        style={styles.input}
        value={pseudo}
        onChangeText={setPseudo}
        placeholder="Pseudo"
      />

      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone"
        keyboardType="phone-pad"
      />

      <Button title="Save" onPress={handleSave} color="#3498db" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
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
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
    width: "100%",
  },
});

export default ProfileScreen;
