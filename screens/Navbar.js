import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

const Navbar = ({ setSelectedTab }) => {
  return (
    <View style={styles.navbar}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => setSelectedTab("Profile")}>
        <Icon name="person" size={28} color="#25D366" style={styles.icon} />
        <Text style={styles.navText}>Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => setSelectedTab("Chats")}>
        <Icon name="chat" size={28} color="#25D366" style={styles.icon} />
        <Text style={styles.navText}>Chats</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => setSelectedTab("Groups")}>
        <Icon name="group" size={28} color="#25D366" style={styles.icon} />
        <Text style={styles.navText}>Groups</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => setSelectedTab("Logout")}>
        <Icon name="logout" size={28} color="#d32f2f" style={styles.icon} />
        <Text style={styles.navText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    height: 60,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    fontWeight: "500",
  },
  icon: {
    marginBottom: 2,
  },
});

export default Navbar;
