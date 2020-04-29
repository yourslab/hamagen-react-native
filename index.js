import 'react-native-gesture-handler'; // required to fix an unhandled event due to the asynchronous router
import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
