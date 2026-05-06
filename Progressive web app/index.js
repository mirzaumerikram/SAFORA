import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
// Vercel Force Rebuild v3 - Fixing crash
import App from './App';

if (Platform.OS === 'web') {
    document.title = 'SAFORA — Driver';
}
registerRootComponent(App);
