/**
 * Telnyx Bare React Native Demo
 *
 * Minimal single-file integration showing the @telnyx/react-voice-commons-sdk
 * surface area on a bare (non-Expo) React Native project. Conditional rendering
 * across three states: disconnected (login form) → connected (dialer) → in call.
 *
 * The VoipClient is created once at module scope and used from the component
 * tree. RxJS observables (connectionState$, activeCall$) are consumed with
 * useEffect + useState.
 */

import React, {useEffect, useState} from 'react';
import {
  NativeModules,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createTelnyxVoipClient,
  createCredentialConfig,
  TelnyxConnectionState,
  TelnyxCallState,
  TelnyxVoiceApp,
  type Call,
} from '@telnyx/react-voice-commons-sdk';

const voipClient = createTelnyxVoipClient({debug: true});

function App(): React.JSX.Element {
  const [connectionState, setConnectionState] = useState<TelnyxConnectionState>(
    voipClient.currentConnectionState,
  );
  const [activeCall, setActiveCall] = useState<Call | null>(
    voipClient.currentActiveCall,
  );

  useEffect(() => {
    const connSub = voipClient.connectionState$.subscribe(setConnectionState);
    const callSub = voipClient.activeCall$.subscribe(setActiveCall);
    return () => {
      connSub.unsubscribe();
      callSub.unsubscribe();
    };
  }, []);

  return (
    // <TelnyxVoiceApp> handles the heavy lifting: auto-wires
    // callKitCoordinator.setVoipClient(), processes pending VoIP push on
    // cold launch (so accepting an incoming call from a terminated app
    // state actually connects the WebRTC leg), and reconnects on app
    // foreground via stored credentials.
    <TelnyxVoiceApp voipClient={voipClient} enableAutoReconnect={true} debug={true}>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.title}>Telnyx Bare Demo</Text>
          <Text style={styles.status}>{connectionState}</Text>
        </View>

        {activeCall ? (
          <ActiveCallView call={activeCall} />
        ) : connectionState === TelnyxConnectionState.CONNECTED ? (
          <DialerView />
        ) : (
          <LoginView connectionState={connectionState} />
        )}
      </SafeAreaView>
    </TelnyxVoiceApp>
  );
}

// ----- Login --------------------------------------------------------------

function LoginView({
  connectionState,
}: {
  connectionState: TelnyxConnectionState;
}): React.JSX.Element {
  const [sipUser, setSipUser] = useState('');
  const [sipPassword, setSipPassword] = useState('');

  // Prefill from the credentials the SDK persisted on the previous login.
  // The SDK stores them under these keys inside its loginFromStoredConfig flow.
  useEffect(() => {
    (async () => {
      const [savedUser, savedPassword] = await Promise.all([
        AsyncStorage.getItem('@telnyx_username'),
        AsyncStorage.getItem('@telnyx_password'),
      ]);
      if (savedUser) setSipUser(savedUser);
      if (savedPassword) setSipPassword(savedPassword);
    })();
  }, []);

  const isConnecting = connectionState === TelnyxConnectionState.CONNECTING;

  const handleLogin = async () => {
    try {
      // Fetch the VoIP push token captured by AppDelegate.mm
      // (TelnyxVoipPushHandler stored it in UserDefaults under `voip_push_token`).
      // Without this the Telnyx backend can't target the device for VoIP pushes.
      let pushToken: string | undefined;
      try {
        pushToken = await NativeModules.VoicePnBridge?.getVoipToken();
      } catch (e) {
        console.warn('Could not fetch VoIP push token:', e);
      }

      const config = createCredentialConfig(sipUser, sipPassword, {
        pushNotificationDeviceToken: pushToken,
      });
      await voipClient.login(config);
    } catch (error) {
      console.warn('Login failed:', error);
    }
  };

  return (
    <View style={styles.pane}>
      <Text style={styles.label}>SIP Username</Text>
      <TextInput
        style={styles.input}
        value={sipUser}
        onChangeText={setSipUser}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="e.g. myuser"
      />
      <Text style={styles.label}>SIP Password</Text>
      <TextInput
        style={styles.input}
        value={sipPassword}
        onChangeText={setSipPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      <TouchableOpacity
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isConnecting || !sipUser || !sipPassword}>
        <Text style={styles.buttonText}>
          {isConnecting ? 'Connecting…' : 'Log in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ----- Dialer -------------------------------------------------------------

function DialerView(): React.JSX.Element {
  const [destination, setDestination] = useState('');

  const handleCall = async () => {
    try {
      await voipClient.newCall(destination);
    } catch (error) {
      console.warn('Call failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await voipClient.logout();
    } catch (error) {
      console.warn('Logout failed:', error);
    }
  };

  return (
    <View style={styles.pane}>
      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        value={destination}
        onChangeText={setDestination}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="e.g. +15551234567 or sip-user"
      />
      <TouchableOpacity
        style={[styles.button, !destination && styles.buttonDisabled]}
        onPress={handleCall}
        disabled={!destination}>
        <Text style={styles.buttonText}>Call</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={handleLogout}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Log out
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ----- Active Call --------------------------------------------------------

function ActiveCallView({call}: {call: Call}): React.JSX.Element {
  const [callState, setCallState] = useState<TelnyxCallState>(call.currentState);
  const [isMuted, setIsMuted] = useState(call.currentIsMuted);
  const [isHeld, setIsHeld] = useState(call.currentIsHeld);

  useEffect(() => {
    const stateSub = call.callState$.subscribe(setCallState);
    const muteSub = call.isMuted$.subscribe(setIsMuted);
    const holdSub = call.isHeld$.subscribe(setIsHeld);
    return () => {
      stateSub.unsubscribe();
      muteSub.unsubscribe();
      holdSub.unsubscribe();
    };
  }, [call]);

  return (
    <View style={styles.pane}>
      <Text style={styles.callDestination}>{call.destination}</Text>
      <Text style={styles.callState}>{callState}</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={() => call.toggleMute()}>
          <Text style={styles.controlButtonText}>
            {isMuted ? 'Unmute' : 'Mute'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlButton, isHeld && styles.controlButtonActive]}
          onPress={() => (isHeld ? call.resume() : call.hold())}>
          <Text style={styles.controlButtonText}>
            {isHeld ? 'Resume' : 'Hold'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.hangupButton]}
        onPress={() => call.hangup()}>
        <Text style={styles.buttonText}>Hang up</Text>
      </TouchableOpacity>
    </View>
  );
}

// ----- Styles -------------------------------------------------------------

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#fff'},
  header: {
    padding: 24,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
  },
  title: {fontSize: 22, fontWeight: '700'},
  status: {fontSize: 13, color: '#666', marginTop: 4},
  pane: {padding: 24, gap: 12},
  label: {fontSize: 13, color: '#444', fontWeight: '600'},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0a84ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {backgroundColor: '#a8cdfa'},
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  secondaryButton: {backgroundColor: '#f0f0f0'},
  secondaryButtonText: {color: '#333'},
  hangupButton: {backgroundColor: '#ff3b30'},
  callDestination: {fontSize: 28, fontWeight: '700', textAlign: 'center'},
  callState: {fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24},
  row: {flexDirection: 'row', gap: 12, justifyContent: 'center'},
  controlButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButtonActive: {backgroundColor: '#ffd60a'},
  controlButtonText: {fontSize: 16, fontWeight: '600', color: '#333'},
});

export default App;
