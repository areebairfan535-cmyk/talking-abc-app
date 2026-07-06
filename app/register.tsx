import { Ionicons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { registerUser } from '@/lib/database';

export default function RegisterScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = typeof params.email === 'string' ? params.email : '';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateEmail(value: string) {
    return /\S+@\S+\.\S+/.test(value);
  }

  async function handleSubmit() {
    if (!fullName.trim()) return Alert.alert('Validation', 'Please enter your full name.');
    if (!email.trim() || !validateEmail(email)) {
      return Alert.alert('Validation', 'Please enter a valid email.');
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 6) {
      return Alert.alert('Validation', 'Please enter a valid phone number.');
    }
    if (!password || password.length < 6) {
      return Alert.alert('Validation', 'Password must be at least 6 characters.');
    }
    if (!agree) return Alert.alert('Validation', 'Please accept the terms to continue.');

    try {
      setIsSubmitting(true);
      await registerUser({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      Alert.alert('Account created', 'You can sign in now.');
      router.replace('/login');
    } catch (error) {
      Alert.alert('Signup failed', error instanceof Error ? error.message : 'Could not create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={16} color="#6d28d9" />
            <Text style={styles.badgeText}>New learner</Text>
          </View>
          <Text style={styles.title}>Create your profile</Text>
          <Text style={styles.subtitle}>Set up a clean profile and start learning ABC with games.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your name"
            autoCapitalize="words"
            style={styles.input}
            placeholderTextColor="#94a3b8"
            cursorColor="#6d28d9"
            selectionColor="#ddd6fe"
          />

          <Text style={styles.label}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor="#94a3b8"
            cursorColor="#6d28d9"
            selectionColor="#ddd6fe"
          />

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="0300 1234567"
            keyboardType="phone-pad"
            style={styles.input}
            placeholderTextColor="#94a3b8"
            cursorColor="#6d28d9"
            selectionColor="#ddd6fe"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              placeholderTextColor="#94a3b8"
              cursorColor="#6d28d9"
              selectionColor="#ddd6fe"
            />
            <TouchableOpacity
              onPress={() => setShowPassword((value) => !value)}
              style={styles.eyeButton}
              activeOpacity={0.75}
            >
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6d28d9" />
            </TouchableOpacity>
          </View>

          <Pressable style={styles.checkRow} onPress={() => setAgree((value) => !value)}>
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
              {agree ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
            </View>
            <Text style={styles.checkText}>I agree to the terms and privacy policy.</Text>
          </Pressable>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.button, isSubmitting && styles.disabledButton]}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{isSubmitting ? 'Creating...' : 'Create account'}</Text>
            <Ionicons name="arrow-forward" size={21} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" asChild>
              <Text style={styles.footerLink}>Sign in</Text>
            </Link>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f4f1',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 34,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ede9fe',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  badgeText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: '#2f2550',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  label: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 14,
    backgroundColor: '#faf5ff',
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 15,
    marginBottom: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },
  passwordInput: {
    flex: 1,
    marginBottom: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  eyeButton: {
    height: 54,
    width: 56,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#ddd6fe',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#c4b5fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6d28d9',
    borderColor: '#6d28d9',
  },
  checkText: {
    flex: 1,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.72,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  footerText: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 18,
  },
  footerLink: {
    color: '#6d28d9',
    fontWeight: '900',
  },
});
