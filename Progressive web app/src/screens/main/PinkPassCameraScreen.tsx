import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraType, FlashMode, VideoQuality } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import theme from '../../utils/theme';
import apiService from '../../services/api';

const PinkPassCameraScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5);
    const cameraRef = useRef<Camera>(null);

    React.useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            const audioStatus = await Camera.requestMicrophonePermissionsAsync();
            setHasPermission(status === 'granted' && audioStatus.status === 'granted');
        })();
    }, []);

    if (hasPermission === null) {
        return <View style={styles.container} />;
    }
    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No access to camera or microphone.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btn}>
                    <Text style={styles.btnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const startRecording = async () => {
        if (cameraRef.current && !isRecording) {
            setIsRecording(true);
            setTimeLeft(5);

            // Start countdown timer
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            try {
                const videoData = await cameraRef.current.recordAsync({
                    maxDuration: 5,
                    quality: VideoQuality['480p'], // Keep payload small
                    mute: true,
                });

                clearInterval(timer);
                processVideo(videoData.uri);
            } catch (error) {
                console.error("Recording failed", error);
                clearInterval(timer);
                setIsRecording(false);
            }
        }
    };

    const processVideo = async (uri: string) => {
        setIsProcessing(true);
        try {
            // Convert to base64
            const base64Video = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Send to backend
            const response = await apiService.post('/pink-pass/enroll', {
                video: base64Video
            });

            Alert.alert("Success", "Pink Pass verification successful!");
            navigation.navigate('PinkPass'); // Go back to status page
            
        } catch (error: any) {
            console.error("Verification error:", error);
            const msg = error.response?.data?.reason || error.message || "Failed to verify. Please try again.";
            Alert.alert("Verification Failed", msg);
            setIsRecording(false);
            setTimeLeft(5);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <Camera
                style={styles.camera}
                type={CameraType.front}
                ref={cameraRef}
                ratio="16:9"
            >
                {/* Overlay Mask for Face */}
                <View style={styles.overlay}>
                    <View style={styles.maskTop} />
                    <View style={styles.maskCenter}>
                        <View style={styles.maskSide} />
                        <View style={styles.ovalFrame}>
                            {/* Inner transparent oval where the face goes */}
                        </View>
                        <View style={styles.maskSide} />
                    </View>
                    <View style={styles.maskBottom}>
                        {isProcessing ? (
                            <View style={styles.processingContainer}>
                                <ActivityIndicator size="large" color={theme.colors.secondary} />
                                <Text style={styles.instructionText}>Analyzing face & gender...</Text>
                                <Text style={styles.subText}>This may take a few seconds</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.instructionText}>
                                    {isRecording ? `Keep blinking naturally... ${timeLeft}s` : 'Position face inside oval & blink'}
                                </Text>

                                <TouchableOpacity 
                                    style={[styles.recordBtn, isRecording && styles.recordingBtn]}
                                    onPress={startRecording}
                                    disabled={isRecording}
                                >
                                    <View style={styles.recordInner} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Camera>
            
            {!isRecording && !isProcessing && (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    overlay: { flex: 1, position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    maskTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    maskBottom: { flex: 1.5, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
    maskCenter: { flexDirection: 'row', height: 350 },
    maskSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    ovalFrame: {
        width: 250,
        height: 350,
        borderRadius: 150,
        borderWidth: 3,
        borderColor: theme.colors.secondary,
        backgroundColor: 'transparent',
    },
    instructionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    subText: {
        color: '#aaa',
        fontSize: 12,
        marginTop: 5,
    },
    recordBtn: {
        width: 70, height: 70,
        borderRadius: 35,
        backgroundColor: 'transparent',
        borderWidth: 4,
        borderColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
    },
    recordingBtn: {
        borderColor: theme.colors.danger,
    },
    recordInner: {
        width: 50, height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.danger,
    },
    closeBtn: {
        position: 'absolute', top: 50, left: 20,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center',
    },
    closeText: { color: '#fff', fontSize: 20 },
    text: { color: '#fff', textAlign: 'center', marginTop: 50 },
    btn: { marginTop: 20, alignSelf: 'center', padding: 10, backgroundColor: theme.colors.primary, borderRadius: 8 },
    btnText: { color: '#fff' },
    processingContainer: { alignItems: 'center' }
});

export default PinkPassCameraScreen;
