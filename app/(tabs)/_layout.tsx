import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { MessageCircle, FolderOpen, Image, Plug, Shield } from 'lucide-react-native';
import { theme } from '../../constants/theme';

const { colors, spacing, radius } = theme;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => <FolderOpen size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: 'Media',
          tabBarIcon: ({ color, size }) => <Image size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="connectors"
        options={{
          title: 'Connectors',
          tabBarIcon: ({ color, size }) => <Plug size={size} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => <Shield size={size} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}