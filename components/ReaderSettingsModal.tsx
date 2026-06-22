import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface ReaderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Fast & Efficient)' },
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (High Quality)' },
];

const DEFAULT_PROMPT_PRESET = `You are a background e-reader assistant. Analyze the provided page of text. Return a strict JSON object with exactly three keys. Do not include any markdown formatting, backticks, or conversational text.

Expected JSON Schema:
{
  "summary": "A 2-sentence breakdown of key narrative/thematic progression on this specific page.",
  "uncommon_words": [
    {"word": "example", "definition": "simple contextual definition", "grade_level": "High School / Grade 11"}
  ],
  "contextual_insights": [
    {"subject": "Name/Place/Concept", "insight": "A brief explanation of historical, local, or specific context mentioned on this page that isn't widely known."}
  ]
}`;

export default function ReaderSettingsModal({ visible, onClose }: ReaderSettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-8b-instant');
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    if (visible) {
      SecureStore.getItemAsync('groq_api_key').then((storedKey) => {
        if (storedKey) setApiKey(storedKey);
      });
      SecureStore.getItemAsync('groq_model').then((storedModel) => {
        if (storedModel) setSelectedModel(storedModel);
      });
      SecureStore.getItemAsync('groq_system_prompt').then((storedPrompt) => {
        setSystemPrompt(storedPrompt || DEFAULT_PROMPT_PRESET);
      });
    }
  }, [visible]);

  const handleSaveKey = async () => {
    if (apiKey.trim().startsWith('gsk_') || apiKey.trim() === '') {
      await SecureStore.setItemAsync('groq_api_key', apiKey.trim());
      Alert.alert('Success', 'API Key updated successfully.');
    } else {
      Alert.alert('Error', 'Invalid key format. Groq keys typically begin with gsk_');
    }
  };

  const handleSelectModel = async (modelId: string) => {
    setSelectedModel(modelId);
    await SecureStore.setItemAsync('groq_model', modelId);
  };

  const handleSavePrompt = async () => {
    await SecureStore.setItemAsync('groq_system_prompt', systemPrompt);
    Alert.alert('Success', 'Analysis prompt guidelines updated.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      {/* KeyboardAvoidingView prevents inputs from getting cut off at the bottom */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reader Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeModalText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Section 1: API Key */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>1. API Gateway Key</Text>
              <TextInput
                style={styles.inputField}
                placeholder="gsk_..."
                placeholderTextColor="#ADB5BD"
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.sectionButton} onPress={handleSaveKey}>
                <Text style={styles.sectionButtonText}>Update Key</Text>
              </TouchableOpacity>
            </View>

            {/* Section 2: Model Selection */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>2. Inference Model</Text>
              <View style={styles.radioGroup}>
                {AVAILABLE_MODELS.map((model) => {
                  const isSelected = selectedModel === model.id;
                  return (
                    <TouchableOpacity
                      key={model.id}
                      style={[styles.radioButton, isSelected && styles.radioButtonSelected]}
                      onPress={() => handleSelectModel(model.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radioDot, isSelected && styles.radioDotSelected]} />
                      <Text style={[styles.radioLabel, isSelected && styles.radioLabelSelected]}>
                        {model.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 3: System Prompt */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>3. Analysis Prompt</Text>
              <TextInput
                style={[styles.inputField, styles.textAreaField]}
                placeholder="Enter custom JSON instructions..."
                placeholderTextColor="#ADB5BD"
                value={systemPrompt}
                onChangeText={setSystemPrompt}
                multiline={true}
                numberOfLines={6}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.sectionButton} onPress={handleSavePrompt}>
                <Text style={styles.sectionButtonText}>Update Prompt Guidelines</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalBody: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  inputField: {
    height: 44,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#212529',
    backgroundColor: '#F8F9FA',
    marginBottom: 12,
  },
  textAreaField: {
    height: 140,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
    lineHeight: 16,
  },
  sectionButton: {
    height: 36,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  radioGroup: {
    gap: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ADB5BD',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDotSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 13,
    color: '#495057',
  },
  radioLabelSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
});