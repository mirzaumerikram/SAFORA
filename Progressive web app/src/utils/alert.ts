import { Alert, Platform } from 'react-native';

const SaforaAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
        // @ts-ignore
        alert(`${title}\n\n${message}`);
    } else {
        Alert.alert(title, message);
    }
};

export default SaforaAlert;
