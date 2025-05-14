import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Dimensions 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const MobileMenu = ({ isVisible, onClose }) => {
  const navigation = useNavigation();
  const [slideAnim] = useState(new Animated.Value(-width));
  
  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const navigateTo = (screen) => {
    onClose();
    setTimeout(() => navigation.navigate(screen), 300);
  };

  const menuItems = [
    { icon: '🏠', label: 'Home', screen: 'Home' },
    { icon: '📄', label: 'Upload Document', screen: 'DocumentUpload' },
    { icon: '📁', label: 'My Documents', screen: 'DocumentList' },
    { icon: '⚙️', label: 'Settings', screen: 'Settings' },
  ];

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        <Animated.View 
          style={[
            styles.menuContainer,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>MedRec</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.menuItems}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => navigateTo(item.screen)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              MedRec v0.1.0
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  dismissArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menuContainer: {
    width: width * 0.75,
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    flexDirection: 'column',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#7f8c8d',
  },
  menuItems: {
    flex: 1,
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 15,
    width: 30,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 16,
    color: '#2c3e50',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
  },
});

export default MobileMenu;