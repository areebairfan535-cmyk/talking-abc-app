import { Ionicons } from '@expo/vector-icons';
import { Link, router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { saveAuthUser } from '@/lib/auth';
import { loginUser, requestPasswordReset } from '@/lib/database';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetStep, setResetStep] = useState<'login' | 'email'>('login');

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);

      return () => subscription.remove();
    }, [])
  );

  async function handleLogin() {
    if (!email.trim()) {
      return Alert.alert('Validation', 'Please enter your username or email address.');
    }
    if (!password) return Alert.alert('Validation', 'Please enter your password.');

    try {
      setIsSubmitting(true);
      const user = await loginUser({
        email: email.trim(),
        password,
      });
      await saveAuthUser(user);
      router.replace('/home-menu');
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestResetCode() {
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      return Alert.alert('Validation', 'Please enter your email address.');
    }

    const normalizedEmail = email.trim();

    try {
      setIsSubmitting(true);
      const resetResponse = await requestPasswordReset({ email: normalizedEmail });
      if (resetResponse.needsRegistration) {
        Alert.alert('Account not found', 'Please create an account first, then sign in.');
        return;
      }

      router.push({
        pathname: '/verify-code',
        params: {
          email: normalizedEmail,
          delivery: resetResponse.delivery,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send reset code.';

      Alert.alert(
        'Reset failed',
        message.includes('Cannot reach backend')
          ? 'Backend is not running. Start the backend, then send the email code again.'
          : message.includes('Email is not configured')
          ? 'Email sending is not configured yet. Add SMTP settings on the backend, then try again.'
          : message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBackToLogin() {
    setResetStep('login');
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.keyboardView}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.brandMark}>
            <Text style={styles.brandText}>ABC</Text>
          </View>
          <Text style={styles.title}>Talking ABC</Text>
          <Text style={styles.subtitle}>A playful alphabet app for confident early learning.</Text>
        </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {resetStep === 'login' ? 'Welcome back' : 'Forgot password'}
            </Text>

          <Text style={styles.label}>{resetStep === 'login' ? 'Username or email' : 'Email address'}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="ali@example.com"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            cursorColor="#6d28d9"
            selectionColor="#ddd6fe"
          />

          {resetStep === 'login' ? (
            <>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, styles.passwordInput]}
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

              <TouchableOpacity
                onPress={() => setResetStep('email')}
                style={styles.forgotButton}
                activeOpacity={0.75}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          ) : null}

            <TouchableOpacity
              onPress={resetStep === 'login' ? handleLogin : handleRequestResetCode}
              style={[styles.signInButton, isSubmitting && styles.disabledButton]}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
            <Text style={styles.signInText}>
              {isSubmitting
                ? resetStep === 'login'
                  ? 'Signing in...'
                  : 'Please wait...'
                  : resetStep === 'login'
                    ? 'Sign in'
                    : 'Send code'}
              </Text>
            <Ionicons name={resetStep === 'email' ? 'mail' : 'arrow-forward'} size={21} color="#fff" />
          </TouchableOpacity>

          {resetStep === 'login' ? (
            <Text style={styles.createText}>
              New here?{' '}
              <Link href="/register" asChild>
                <Text style={styles.createLink}>Create an account</Text>
              </Link>
            </Text>
          ) : (
            <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={18} color="#6d28d9" />
              <Text style={styles.createLink}>Back to sign in</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f4f1',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 120,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandMark: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  brandText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    color: '#2f2550',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
    marginTop: 8,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    color: '#2f2550',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 18,
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
    marginBottom: 10,
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
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    paddingVertical: 6,
  },
  forgotText: {
    color: '#6d28d9',
    fontSize: 14,
    fontWeight: '900',
  },
  signInButton: {
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
  signInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  createText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 22,
  },
  createLink: {
    color: '#6d28d9',
    fontWeight: '900',
  },
  backButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
});
