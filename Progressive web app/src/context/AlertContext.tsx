import React, { createContext, useContext, useState, useCallback } from 'react';
import { CustomAlert } from '../components/common/CustomAlert';

interface AlertContextType {
    showAlert: (title: string, message: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    const showAlert = useCallback((t: string, m: string) => {
        setTitle(t);
        setMessage(m);
        setVisible(true);
    }, []);

    const hideAlert = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <CustomAlert 
                visible={visible} 
                title={title} 
                message={message} 
                onClose={hideAlert} 
            />
        </AlertContext.Provider>
    );
};

export const useSaforaAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useSaforaAlert must be used within an AlertProvider');
    }
    return context.showAlert;
};

// Singleton for utility access
let globalShowAlert: (title: string, message: string) => void = () => {};
export const setGlobalAlert = (fn: typeof globalShowAlert) => {
    globalShowAlert = fn;
};
export const saforaAlert = (title: string, message: string) => {
    console.log('[SAFORA] Custom Alert Triggered:', title);
    if (globalShowAlert && globalShowAlert.name !== '') {
        globalShowAlert(title, message);
    } else {
        // Fallback for extreme cases (still better than doing nothing)
        alert(`SAFORA: ${title}\n\n${message}`);
    }
};
