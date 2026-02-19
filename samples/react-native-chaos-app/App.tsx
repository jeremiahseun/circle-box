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
const ALL_FILTER = 'all';
const SEVERITY_OPTIONS = [ALL_FILTER, 'info', 'warn', 'error', 'fatal'];
const THREAD_OPTIONS = [ALL_FILTER, 'main', 'background', 'crash'];

export default function App(): React.JSX.Element {
  const [exports, setExports] = useState<string[]>([]);
  const [debugEvents, setDebugEvents] = useState<CircleBoxDebugEvent[]>([]);
  const [status, setStatus] = useState('Idle');
  const [typeFilter, setTypeFilter] = useState(ALL_FILTER);
  const [severityFilter, setSeverityFilter] = useState(ALL_FILTER);
  const [threadFilter, setThreadFilter] = useState(ALL_FILTER);

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
          const types = new Set([ALL_FILTER, ...events.map((event) => event.type)]);
          if (!types.has(typeFilter)) {
            setTypeFilter(ALL_FILTER);
          }
          setStatus(`Loaded ${events.length} debug event(s)`);
        },
      },
    ],
    [typeFilter],
  );

  const typeOptions = useMemo(() => {
    const values = Array.from(new Set(debugEvents.map((event) => event.type))).sort();
    return [ALL_FILTER, ...values];
  }, [debugEvents]);

  const filteredDebugEvents = useMemo(() => {
    return debugEvents.filter((event) => {
      const typeMatch = typeFilter === ALL_FILTER || event.type === typeFilter;
      const severityMatch = severityFilter === ALL_FILTER || event.severity === severityFilter;
      const threadMatch = threadFilter === ALL_FILTER || event.thread === threadFilter;
      return typeMatch && severityMatch && threadMatch;
    });
  }, [debugEvents, severityFilter, threadFilter, typeFilter]);

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
            <Text style={styles.subtitle}>{`Showing ${filteredDebugEvents.length}/${debugEvents.length}`}</Text>
            <FilterGroup
              label="Type"
              options={typeOptions}
              selected={typeFilter}
              onChange={setTypeFilter}
            />
            <FilterGroup
              label="Severity"
              options={SEVERITY_OPTIONS}
              selected={severityFilter}
              onChange={setSeverityFilter}
            />
            <FilterGroup
              label="Thread"
              options={THREAD_OPTIONS}
              selected={threadFilter}
              onChange={setThreadFilter}
            />
            {filteredDebugEvents.map((event) => (
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

type FilterGroupProps = {
  label: string;
  options: string[];
  selected: string;
  onChange: (value: string) => void;
};

function FilterGroup(props: FilterGroupProps): React.JSX.Element {
  const { label, options, selected, onChange } = props;

  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterRow}>
        {options.map((option) => (
          <Pressable
            key={`${label}-${option}`}
            style={[styles.filterChip, selected === option ? styles.filterChipSelected : null]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.filterChipText, selected === option ? styles.filterChipTextSelected : null]}>
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
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
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  filterChipSelected: {
    borderColor: '#115e59',
    backgroundColor: '#115e59',
  },
  filterChipText: {
    fontSize: 12,
    color: '#1e293b',
  },
  filterChipTextSelected: {
    color: '#f8fafc',
    fontWeight: '600',
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
