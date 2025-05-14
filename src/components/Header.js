import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { isWeb } from '../utils/platform';
import MobileMenu from './MobileMenu';

const Header = ({
  title = 'MedRec',
  showBackButton = false,
  rightComponent = null,
}) => {
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          {showBackButton ? (
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.menuButton,
                pressed && styles.buttonPressed
              ]}
              onPress={toggleMenu}
            >
              <Text style={styles.menuButtonText}>☰</Text>
            </Pressable>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.rightContainer}>
          {rightComponent}
        </View>
      </View>
      
      <MobileMenu isVisible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    ...(isWeb && {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    }),
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 16,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flexShrink: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f7',
    cursor: isWeb ? 'pointer' : 'default',
    ...(isWeb ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  menuButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f7',
    cursor: isWeb ? 'pointer' : 'default',
    ...(isWeb ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  backButtonText: {
    fontSize: 22,
    color: '#3498db',
    fontWeight: 'bold',
  },
  menuButtonText: {
    fontSize: 22,
    color: '#3498db',
    fontWeight: 'bold',
  },
});

export default Header;