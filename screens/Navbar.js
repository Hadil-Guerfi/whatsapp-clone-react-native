// Navbar.js
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const Navbar = ({ setSelectedTab }) => {
  return (
    <View style={styles.navbar}>
      <View style={styles.navbarMenu}>
        <Button title="My Profile" onPress={() => setSelectedTab('Profile')} color="#3498db" />
        <Button title="Chats" onPress={() => setSelectedTab('Chats')} color="#3498db" />
        <Button title="Groups" onPress={() => setSelectedTab('Groups')} color="#3498db" />
        <Button title="Logout" onPress={() => setSelectedTab('Logout')} color="#e74c3c" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    height: 60,
    backgroundColor: '#3498db',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  
    zIndex: 1,
  },
  navbarTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  navbarMenu: {
    flexDirection: 'row',
  },
});

export default Navbar;
