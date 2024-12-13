import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Button,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, database } from "./../firebaseConfig";
import { ref, set, get } from "firebase/database";
import supabase from "./supabaseClient";
import Icon from "react-native-vector-icons/MaterialIcons";

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
    <ScrollView contentContainerStyle={styles.container}>
      <ImageBackground
        style={styles.background}
        source={require("../assets/background.jpg")}
        resizeMode="cover">
        <View style={styles.content}>
          <Text style={styles.title}>My Profile</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#00c6ff" />
          ) : (
            <TouchableOpacity onPress={pickImageFromGallery}>
              <Image
                source={
                  profileImage
                    ? { uri: profileImage }
                    : require("../assets/logo.png")
                }
                style={styles.profileImage}
              />
              <View style={styles.iconContainer}>
                <Icon name="edit" size={24} color="#25D366" />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              editable={false}
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
          </View>

          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#25D366",
    marginVertical: 20,
    textShadowColor: "#000",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#ffffff",
    marginBottom: 10,
  },
  changePhotoText: {
    fontSize: 14,
    color: "#00c6ff",
    textAlign: "center",
    textDecorationLine: "underline",
    marginBottom: 20,
  },
  inputContainer: {
    width: "100%",
    marginVertical: 10,
  },
  input: {
    height: 50,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
    marginVertical: 10,
  },
  saveButton: {
    backgroundColor: "#25D366",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: "#00c6ff",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  iconContainer: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    elevation: 3,
  },
});

export default ProfileScreen;
