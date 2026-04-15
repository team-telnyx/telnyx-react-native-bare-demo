/**
 * @format
 */

// Polyfill URL / URLSearchParams. Hermes/RN's built-ins are incomplete —
// `URLSearchParams.set` (and .get, .has, .delete) throw "not implemented",
// which the @telnyx/react-voice-commons-sdk hits when it builds the WebSocket
// URL on reconnect. Must be imported before any code that uses URL/URLSearchParams.
import 'react-native-url-polyfill/auto';

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
