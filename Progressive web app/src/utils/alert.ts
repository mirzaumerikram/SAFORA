import { Alert, Platform } from 'react-native';
import { saforaAlert } from '../context/AlertContext';

const SaforaAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
        saforaAlert(title, message);
    } else {
        Alert.alert(title, message);
    }
};

export default SaforaAlert;
