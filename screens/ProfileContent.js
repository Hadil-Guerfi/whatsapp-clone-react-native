//ProfileContent
import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { ref, set, get } from "firebase/database";
import { auth, database } from "./../firebaseConfig";

const ProfileContent = ({ user }) => {
  const [email, setEmail] = useState(user.email);
  const [fullname, setFullname] = useState(user.fullname);
  const [pseudo, setPseudo] = useState(user.pseudo);
  const [phone, setPhone] = useState(user.phone);

  const handleSave = async () => {
    try {
      const uid = auth.currentUser.uid;

      // Update user data in Firebase
      await set(ref(database, `users/${uid}`), {
        email,
        fullname,
        pseudo,
        phone,
      });

      // Fetch the updated data to ensure consistency
      const snapshot = await get(ref(database, `users/${uid}`));
      const updatedData = snapshot.val();

      // Update fields with the latest values
      user.fullname = updatedData.fullname;
      user.pseudo = updatedData.pseudo;
      user.phone = updatedData.phone;
      // setEmail(updatedData.email);
      // setFullname(updatedData.fullname);
      // setPseudo(updatedData.pseudo);
      // setPhone(updatedData.phone);

      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Edit Profile</Text>

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
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
  },
});

export default ProfileContent;
