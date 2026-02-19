import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CircleBox, type CircleBoxDebugEvent, type CircleBoxExportFormat } from 'circlebox-react-native';

const DEFAULT_FORMATS: CircleBoxExportFormat[] = ['json', 'csv', 'json_gzip', 'csv_gzip', 'summary'];

export default function App(): React.JSX.Element {
  const [exports, setExports] = useState<string[]>([]);
  const [debugEvents, setDebugEvents] = useState<CircleBoxDebugEvent[]>([]);
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    void (async () => {
      await CircleBox.start({
        bufferCapacity: 200,
        enableDebugViewer: true,
        installReactNativeErrorHooks: true,
      });

      const hasPending = await CircleBox.hasPendingCrashReport();
      if (hasPending) {
        Alert.alert('Pending Crash Report', 'A pending crash report is available for export.');
      }
    })().catch((error) => {
      setStatus(`Start failed: ${String(error)}`);
    });
  }, []);

  const actions = useMemo(
    () => [
      {
        label: 'Add Breadcrumb',
        onPress: async () => {
          await CircleBox.breadcrumb('User started Checkout', { flow: 'checkout' });
          setStatus('Breadcrumb recorded');
        },
      },
      {
        label: 'Mock Thermal Spike',
        onPress: async () => {
          await CircleBox.breadcrumb('Mock thermal spike', { state: 'critical' });
          setStatus('Mock thermal event recorded');
        },
      },
      {
        label: 'Throw JS Exception',
        onPress: async () => {
          setStatus('Throwing JS exception');
          throw new Error('CircleBox React Native test exception');
        },
      },
      {
        label: 'Unhandled Promise Rejection',
        onPress: async () => {
          setStatus('Scheduling unhandled rejection');
          Promise.reject(new Error('CircleBox React Native promise rejection test'));
        },
      },
      {
        label: 'Export Logs',
        onPress: async () => {
          const files = await CircleBox.exportLogs(DEFAULT_FORMATS);
          setExports(files);
          setStatus(`Exported ${files.length} file(s)`);
        },
      },
      {
        label: 'Load Viewer Snapshot',
        onPress: async () => {
          const events = await CircleBox.debugSnapshot(200);
          setDebugEvents(events);
          setStatus(`Loaded ${events.length} debug event(s)`);
        },
      },
    ],
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>CircleBox RN Chaos</Text>
        <Text style={styles.subtitle}>{status}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              style={styles.button}
              onPress={() => {
                void action.onPress().catch((error) => {
                  setStatus(`Action failed: ${String(error)}`);
                });
              }}
            >
              <Text style={styles.buttonText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {exports.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exports</Text>
            {exports.map((item) => (
              <Text selectable key={item} style={styles.line}>{item}</Text>
            ))}
          </View>
        ) : null}

        {debugEvents.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Viewer</Text>
            {debugEvents.map((event) => (
              <View key={`${event.seq}-${event.type}`} style={styles.eventCard}>
                <Text style={styles.eventTitle}>{`#${event.seq} ${event.type} (${event.severity})`}</Text>
                <Text style={styles.line}>{`thread=${event.thread}`}</Text>
                <Text style={styles.line}>{`attrs=${JSON.stringify(event.attrs)}`}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7faf8',
  },
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f1720',
  },
  subtitle: {
    fontSize: 14,
    color: '#334155',
  },
  section: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f1720',
  },
  button: {
    backgroundColor: '#115e59',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  buttonText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  line: {
    fontSize: 12,
    color: '#1e293b',
  },
  eventCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f1720',
  },
});
