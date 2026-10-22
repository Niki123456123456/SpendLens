import { useTranslation } from '../i18n';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Category } from '../../shared/receipt';
export const colors = { bg: '#F7F8FA', ink: '#172C30', muted: '#77878A', green: '#236B58', mint: '#DBF1E7', line: '#E9EEEB', purple: '#7868BE', white: '#FFFFFF' };
export const categoryColors: Record<Category, string> = { food: '#35765D', mobility: '#90B4E2', household: '#C3AFE2', health: '#D7AA72', leisure: '#E7AFAF', other: '#A7B3B2' };
export function Label({ children, style }: { children: React.ReactNode; style?: object }) { return <Text style={[styles.label, style]}>{children}</Text>; }
export function Title({ children }: { children: React.ReactNode }) { return <Text style={styles.title}>{children}</Text>; }
export function Body({ children, style }: { children: React.ReactNode; style?: object }) { return <Text style={[styles.body, style]}>{children}</Text>; }
export function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Button({ title, onPress, secondary = false, icon, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, { opacity: disabled ? .45 : pressed ? .7 : 1 }]}>
    {icon && <Ionicons name={icon} size={20} color={secondary ? colors.ink : 'white'} />}<Text style={[styles.buttonText, secondary && { color: colors.ink }]}>{title}</Text>
  </Pressable>;
}
export function Screen({ children }: { children: React.ReactNode }) { return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.screen}>{children}</ScrollView></SafeAreaView>; }
export function Field({ label, ...props }: TextInputProps & { label: string }) { return <View style={{ gap: 7, flexGrow: 1 }}><Label>{label}</Label><TextInput accessibilityLabel={label} placeholderTextColor="#A0ADAA" {...props} style={[styles.input, props.style]} /></View>; }
export function Notice({ text, bad = false }: { text: string; bad?: boolean }) { return <View accessibilityRole="alert" style={{ padding: 14, backgroundColor: bad ? '#FCEBE6' : colors.mint, borderRadius: 12 }}><Text style={{ color: bad ? '#9B4234' : colors.green, lineHeight: 21, fontSize: 13 }}>{text}</Text></View>; }
export function Loading() {
  const { t } = useTranslation();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.green} /><Body>{t('SpendLens wird geladen …')}</Body></View>;
}
export const styles = StyleSheet.create({
  screen: { padding: 24, gap: 24, paddingBottom: 44, maxWidth: 760, width: '100%', alignSelf: 'center' },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -1.1, color: colors.ink },
  label: { fontSize: 12, color: colors.muted, fontWeight: '600', letterSpacing: .3 },
  body: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  card: { padding: 22, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 16 },
  button: { minHeight: 52, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.green, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  buttonText: { fontSize: 14, fontWeight: '600', color: colors.white },
  input: { borderWidth: 1, borderColor: '#DFE7E3', backgroundColor: 'white', borderRadius: 11, padding: 13, color: colors.ink, fontSize: 15, minHeight: 48 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});
