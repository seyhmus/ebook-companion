import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export default function ApiKeyModal() {
  const [keyInput, setKeyInput] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if a key is already stored on boot
    SecureStore.getItemAsync('groq_api_key').then((storedKey) => {
      if (!storedKey) {
        setIsVisible(true); // Show modal if no key exists yet
      }
    });
  }, []);

  const handleSave = async () => {
    if (keyInput.trim().startsWith('gsk_')) { 
      // Groq keys always start with gsk_
      await SecureStore.setItemAsync('groq_api_key', keyInput.trim());
      setIsVisible(false);
      alert('Groq API Key secured successfully!');
    } else {
      alert('Invalid key format. Groq keys typically begin with gsk_');
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Configure Groq API Gateway</Text>
          <Text style={styles.modalSub}>Your key remains localized entirely on your device hardware secure enclave.</Text>
          
          <TextInput
            style={styles.input}
            placeholder="gsk_..."
            placeholderTextColor="#999"
            secureTextEntry={true}
            value={keyInput}
            onChangeText={setKeyInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save to Device Secure Storage</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalView: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    lineHeight: 16,
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#007AFF',
    height: 44,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});