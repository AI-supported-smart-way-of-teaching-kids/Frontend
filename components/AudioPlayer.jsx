import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

export default function AudioPlayer({ uri }) {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [duration, setDuration] = useState(null);
    const [position, setPosition] = useState(null);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const loadSound = async () => {
        try {
            setIsLoading(true);
            const { sound: newSound, status } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );
            setSound(newSound);
            setIsPlaying(true);
            setDuration(status.durationMillis);
        } catch (error) {
            console.warn('Error loading sound', error);
        } finally {
            setIsLoading(false);
        }
    };

    const onPlaybackStatusUpdate = (status) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                setIsPlaying(false);
                // Optional: reset to start
                // sound.setPositionAsync(0); 
            }
        }
    };

    const togglePlayback = async () => {
        if (!sound) {
            await loadSound();
        } else {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayback}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={24}
                        color="#fff"
                    />
                )}
            </TouchableOpacity>

            <View style={styles.infoContainer}>
                <View style={styles.labelRow}>
                    <Ionicons name="volume-medium" size={16} color="#666" />
                    <Text style={styles.labelText}>Audio Question</Text>
                </View>
                <View style={styles.progressContainer}>
                    {/* Simple progress bar representation */}
                    <View style={[styles.progressBar, { width: duration ? `${(position / duration) * 100}%` : '0%' }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E8FF',
        padding: 12,
        borderRadius: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: '#E9D5FF',
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    labelText: {
        marginLeft: 6,
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 14,
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#8B5CF6',
    },
});
