import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Shield, Bell, Moon, Globe, CircleHelp as HelpCircle, Info, Lock, Download, Trash2, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [autoDownload, setAutoDownload] = React.useState(true);

  const handleDataExport = () => {
    Alert.alert(
      'Export Data',
      'This will export all your chat history and files. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Exporting data...') },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your chats, files, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => console.log('Clearing data...'),
        },
      ]
    );
  };

  const SettingsItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    children,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    children?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={styles.settingsIcon}>{icon}</View>
        <View style={styles.settingsText}>
          <Text style={styles.settingsTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingsItemRight}>
        {children}
        {showArrow && onPress && (
          <ChevronRight size={20} color="#999" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          
          <SettingsItem
            icon={<Shield size={22} color="#25D366" />}
            title="Privacy Settings"
            subtitle="Control who can see your profile and activity"
            onPress={() => console.log('Privacy settings')}
          />
          
          <SettingsItem
            icon={<Lock size={22} color="#25D366" />}
            title="Encryption Status"
            subtitle="End-to-end encryption is active"
            showArrow={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <SettingsItem
            icon={<Bell size={22} color="#25D366" />}
            title="Push Notifications"
            subtitle="Receive notifications for new messages"
            showArrow={false}
          >
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#ddd', true: '#25D366' }}
            />
          </SettingsItem>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <SettingsItem
            icon={<Moon size={22} color="#25D366" />}
            title="Dark Mode"
            subtitle="Use dark theme"
            showArrow={false}
          >
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#ddd', true: '#25D366' }}
            />
          </SettingsItem>
          
          <SettingsItem
            icon={<Globe size={22} color="#25D366" />}
            title="Language"
            subtitle="English"
            onPress={() => console.log('Language settings')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage & Data</Text>
          
          <SettingsItem
            icon={<Download size={22} color="#25D366" />}
            title="Auto-Download Media"
            subtitle="Automatically download images and videos"
            showArrow={false}
          >
            <Switch
              value={autoDownload}
              onValueChange={setAutoDownload}
              trackColor={{ false: '#ddd', true: '#25D366' }}
            />
          </SettingsItem>
          
          <SettingsItem
            icon={<Download size={22} color="#25D366" />}
            title="Export Data"
            subtitle="Download all your chat history and files"
            onPress={handleDataExport}
          />
          
          <SettingsItem
            icon={<Trash2 size={22} color="#dc2626" />}
            title="Clear All Data"
            subtitle="Permanently delete all chats and files"
            onPress={handleClearData}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingsItem
            icon={<HelpCircle size={22} color="#25D366" />}
            title="Help Center"
            subtitle="Get help and support"
            onPress={() => console.log('Help center')}
          />
          
          <SettingsItem
            icon={<Info size={22} color="#25D366" />}
            title="About"
            subtitle="App version and information"
            onPress={() => console.log('About')}
          />
        </View>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>SecureChat</Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.versionText}>
            End-to-end encrypted messaging
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  settingsSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 16,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textAlign: 'center',
  },
});