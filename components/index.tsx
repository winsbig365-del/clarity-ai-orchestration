import React from 'react';
import {
  View,
  Text as RNText,
  TextInput as RNTextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { theme } from '../constants/theme';

const { colors, spacing, radius, shadow, type: typography } = theme;

type TextVariant = keyof typeof typography;
type TextColor = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'destructive' | 'success' | 'warning' | 'onAccent';
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const colorMap: Record<TextColor, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  accent: colors.accent,
  destructive: colors.destructive,
  success: colors.success,
  warning: colors.warning,
  onAccent: colors.onAccent,
};

// ─── Screen ──────────────────────────────────────────────────

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>;
}

// ─── Text ────────────────────────────────────────────────────

export function Text({
  variant = 'body',
  color = 'primary',
  numberOfLines,
  style,
  children,
}: {
  variant?: TextVariant;
  color?: TextColor;
  numberOfLines?: number;
  style?: TextStyle;
  children: React.ReactNode;
}) {
  const t = typography[variant];
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[{ fontFamily: t.fontFamily, fontSize: t.fontSize, lineHeight: t.lineHeight, color: colorMap[color] }, style]}
    >
      {children}
    </RNText>
  );
}

// ─── Button ──────────────────────────────────────────────────

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bgMap: Record<ButtonVariant, string> = {
    primary: colors.accent,
    secondary: colors.surfaceAlt,
    ghost: 'transparent',
    destructive: colors.destructive,
  };
  const textMap: Record<ButtonVariant, TextColor> = {
    primary: 'onAccent',
    secondary: 'primary',
    ghost: 'accent',
    destructive: 'onAccent',
  };
  const sizeMap = { sm: { py: spacing.sm, px: spacing.lg, fs: 13 }, md: { py: spacing.md, px: spacing.xl, fs: 15 }, lg: { py: spacing.lg, px: spacing['2xl'], fs: 16 } };
  const s = sizeMap[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bgMap[variant],
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
        },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading && <ActivityIndicator color={colorMap[textMap[variant]]} size="small" />}
      <RNText style={{ fontFamily: typography.callout.fontFamily, fontSize: s.fs, color: colorMap[textMap[variant]] }}>
        {title}
      </RNText>
    </Pressable>
  );
}

// ─── Input ───────────────────────────────────────────────────

export function Input({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  multiline,
  maxLength,
  style,
}: {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  style?: ViewStyle;
}) {
  return (
    <RNTextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      multiline={multiline}
      maxLength={maxLength}
      style={[
        {
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          color: colors.text,
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        multiline && { minHeight: 100, textAlignVertical: 'top' },
        style as TextStyle,
      ]}
    />
  );
}

// ─── Card ────────────────────────────────────────────────────

export function Card({
  children,
  style,
  pressable,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  pressable?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        shadow.sm,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (pressable && onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

// ─── EmptyState ──────────────────────────────────────────────

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={{ alignItems: 'center', padding: spacing['3xl'], gap: spacing.md }}>
      {icon ? <RNText style={{ fontSize: 48 }}>{icon}</RNText> : null}
      <Text variant="heading" color="primary">{title}</Text>
      <Text variant="body" color="tertiary" style={{ textAlign: 'center' }}>{description}</Text>
      {action && <Button title={action.label} onPress={action.onPress} variant="secondary" size="sm" />}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />;
}

// ─── Avatar ──────────────────────────────────────────────────

export function Avatar({ letter, size = 36 }: { letter: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <RNText style={{ fontFamily: typography.callout.fontFamily, fontSize: size * 0.4, color: colors.accent }}>
        {letter.toUpperCase()}
      </RNText>
    </View>
  );
}