import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ImageBackground,
  Button,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
} from "react-native";
import CheckBox from "expo-checkbox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, database } from "../firebaseConfig"; // Firebase auth import
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import * as ImagePicker from "expo-image-picker";
import supabase from "./supabaseClient"; // Supabase client import

const generateUniqueFileName = () => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomId}.jpg`;
};

const uploadImageToSupabase = async (uri) => {
  const fileName = generateUniqueFileName();
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
      .upload(`profile_images/${fileName}`, buffer, {
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

const ImagePickerComponent = ({ setProfileImage }) => {
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        const uploadedImageUrl = await uploadImageToSupabase(uri);
        if (uploadedImageUrl) {
          setProfileImage(uploadedImageUrl);
          console.log(
            "Image uploaded and public URL obtained:",
            uploadedImageUrl
          );
        }
      }
    } catch (error) {
      console.error("Error picking or uploading image:", error);
    }
  };

  return (
    <TouchableOpacity onPress={pickImage} style={styles.galleryButton}>
      <Text style={styles.galleryButtonText}>Pick Image from Gallery</Text>
    </TouchableOpacity>
  );
};

const AuthScreen = ({
  email,
  setEmail,
  password,
  setPassword,
  fullname,
  setFullname,
  pseudo,
  setPseudo,
  phone,
  setPhone,
  isLogin,
  setIsLogin,
  handleAuthentication,
  profileImage,
  setProfileImage,
  rememberMe,
  setRememberMe,
}) => {
  return (
    <View style={styles.container}>
      <ImageBackground
        style={styles.background}
        source={require("../assets/background.jpg")}>
        <Image source={require("../assets/logo.png")} style={styles.logo} />

        <Text style={styles.title}>{isLogin ? "Sign In" : "Sign Up"}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        {!isLogin && (
          <>
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
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
            <ImagePickerComponent setProfileImage={setProfileImage} />
            {profileImage && (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            )}
          </>
        )}
        {isLogin && (
          <View style={styles.rememberMeContainer}>
            <CheckBox
              value={rememberMe}
              onValueChange={setRememberMe}
              style={styles.checkbox}
            />
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </View>
        )}
        <View style={styles.buttonContainer}>
          <Button
            title={isLogin ? "Sign In" : "Sign Up"}
            onPress={handleAuthentication}
            color="#27b141"
          />
        </View>
        <View style={styles.bottomContainer}>
          <Text style={styles.toggleText} onPress={() => setIsLogin(!isLogin)}>
            {isLogin
              ? "Need an account? Sign Up"
              : "Already have an account? Sign In"}
          </Text>
        </View>
      </ImageBackground>
    </View>
  );
};

export default function AuthScreenComponent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullname, setFullname] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [phone, setPhone] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem("email");
        const storedPassword = await AsyncStorage.getItem("password");

        if (storedEmail && storedPassword) {
          setEmail(storedEmail);
          setPassword(storedPassword);
          await handleLogin(storedEmail, storedPassword);
        }
      } catch (error) {
        console.error("Error loading session:", error);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userDataSnapshot = await get(ref(database, `users/${user.uid}`));
      const userData = userDataSnapshot.val();
      setProfileImage(userData.picture || null);

      console.log("User signed in successfully!", userData);

      if (rememberMe) {
        await AsyncStorage.setItem("email", email);
        await AsyncStorage.setItem("password", password);
      }
    } catch (error) {
      console.error("Authentication error:", error.message);
    }
  };

  const handleAuthentication = async () => {
    if (isLogin) {
      await handleLogin(email, password);
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;

        await set(ref(database, `users/${user.uid}`), {
          email: user.email,
          fullname: fullname,
          pseudo: pseudo,
          phone: phone,
          picture: profileImage,
          createdAt: new Date().toISOString(),
        });

        console.log("User signed up and data saved to database!");
      } catch (error) {
        console.error("Authentication error:", error.message);
      }
    }
  };

  return (
    <AuthScreen
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      fullname={fullname}
      setFullname={setFullname}
      pseudo={pseudo}
      setPseudo={setPseudo}
      phone={phone}
      setPhone={setPhone}
      isLogin={isLogin}
      setIsLogin={setIsLogin}
      handleAuthentication={handleAuthentication}
      profileImage={profileImage}
      setProfileImage={setProfileImage}
      rememberMe={rememberMe}
      setRememberMe={setRememberMe}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#fff",
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#075E54",
    marginBottom: 20,
  },
  input: {
    width: "80%",
    padding: 15,
    marginVertical: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#333",
    borderColor: "#ddd",
    borderRadius: 30,
  },
  buttonContainer: { marginBottom: 16, marginTop: 16 },
  bottomContainer: { marginTop: 16 },
  toggleText: { color: "#3498db", textAlign: "center" },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: 16,
  },
  galleryButton: {
    backgroundColor: "#27b141",
    padding: 10,
    marginTop: 16,
    borderRadius: 5,
    alignItems: "center",
  },
  galleryButtonText: { color: "#fff" },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  rememberMeText: { marginLeft: 8 },
  checkbox: {
    width: 20,
    height: 20,
  },
});
