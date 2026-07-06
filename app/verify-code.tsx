import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { saveAuthUser } from '@/lib/auth';
import { requestPasswordReset, verifyResetCode } from '@/lib/database';

export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ delivery?: string; email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const delivery = typeof params.delivery === 'string' ? params.delivery : '';
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerifyCode = useCallback(
    async (nextCode: string) => {
      if (isSubmitting) {
        return;
      }
      if (!email) {
        return Alert.alert('Email missing', 'Please go back and enter your email again.');
      }
      if (nextCode.length !== 6) {
        return Alert.alert('Validation', 'Please enter the 6 digit code from your email.');
      }

      try {
        setIsSubmitting(true);
        const user = await verifyResetCode({ email, code: nextCode });
        await saveAuthUser(user);
        router.replace('/home-menu');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not verify this code.';
        Alert.alert(
          'Code failed',
          message.includes('Cannot reach backend') || message.includes('could not find driver')
            ? 'Backend is not ready. Start the backend, then send a fresh code.'
            : message
        );
        setCode('');
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, isSubmitting]
  );

  useEffect(() => {
    if (code.length === 6 && !isSubmitting) {
      handleVerifyCode(code);
    }
  }, [code, handleVerifyCode, isSubmitting]);

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 6));
  }

  async function handleResendCode() {
    if (!email) {
      return Alert.alert('Email missing', 'Please go back and enter your email again.');
    }

    try {
      setIsResending(true);
      await requestPasswordReset({ email });
      setCode('');
      Alert.alert('Code sent', 'Please check your email for the new code.');
    } catch (error) {
      Alert.alert('Reset failed', error instanceof Error ? error.message : 'Could not send reset code.');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.brandMark}>
              <Ionicons name="mail-open" size={34} color="#fff" />
            </View>
            <Text style={styles.title}>Enter code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {email || 'your email'}.
              {delivery === 'local' ? ' The code was saved to the backend log because SMTP is not configured yet.' : ''}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Email code</Text>
            <TextInput
              value={code}
              onChangeText={handleCodeChange}
              autoComplete="one-time-code"
              autoFocus
              autoCorrect={false}
              cursorColor="#6d28d9"
              importantForAutofill="yes"
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              placeholderTextColor="#94a3b8"
              selectionColor="#ddd6fe"
              style={styles.codeInput}
              textContentType="oneTimeCode"
            />

            <TouchableOpacity
              onPress={() => handleVerifyCode(code)}
              style={[styles.signInButton, isSubmitting && styles.disabledButton]}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.signInText}>{isSubmitting ? 'Signing in...' : 'Verify and sign in'}</Text>
              <Ionicons name="arrow-forward" size={21} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendCode}
              style={styles.secondaryButton}
              disabled={isResending}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh" size={18} color="#6d28d9" />
              <Text style={styles.secondaryText}>{isResending ? 'Sending...' : 'Send code again'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.secondaryButton} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={18} color="#6d28d9" />
              <Text style={styles.secondaryText}>Change email</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    paddingBottom: 120,
    paddingHorizontal: 20,
    paddingTop: 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#6d28d9',
    borderRadius: 24,
    elevation: 8,
    height: 86,
    justifyContent: 'center',
    shadowColor: '#6d28d9',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    width: 86,
  },
  title: {
    color: '#2f2550',
    fontSize: 34,
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
    backgroundColor: '#fff',
    borderRadius: 24,
    elevation: 8,
    padding: 20,
    shadowColor: '#9a8f86',
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  label: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: '#faf5ff',
    borderColor: '#ddd6fe',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    height: 58,
    letterSpacing: 0,
    marginBottom: 16,
    paddingHorizontal: 15,
    textAlign: 'center',
  },
  signInButton: {
    alignItems: 'center',
    backgroundColor: '#6d28d9',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.72,
  },
  signInText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
  secondaryText: {
    color: '#6d28d9',
    fontWeight: '900',
  },
});
