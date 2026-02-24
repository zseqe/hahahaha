import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { X, Camera, RotateCcw } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CameraScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<"back" | "front">("back");
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                console.log("Permission to access location was denied");
                return;
            }
            let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(loc);
        })();
    }, []);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 items-center justify-center p-4 bg-[#F7FAF7]">
                <Text className="text-center text-lg text-gray-900 mb-4 font-bold">We need your permission to show the camera</Text>
                <TouchableOpacity
                    className="bg-emerald-800 px-6 py-3 rounded-lg"
                    onPress={requestPermission}
                >
                    <Text className="text-white font-bold text-base">Grant permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    function toggleCameraFacing() {
        setFacing(current => (current === "back" ? "front" : "back"));
    }

    const takePicture = async () => {
        if (!cameraRef.current || loading) return;
        setLoading(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ base64: true });
            if (photo) {
                // Mocking save to history with location
                const record = {
                    id: Date.now().toString(),
                    plantId: "1", // Mock random plant
                    uri: photo.uri,
                    createdAt: Date.now(),
                    location: location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null,
                };

                const existing = await AsyncStorage.getItem("history");
                const history = existing ? JSON.parse(existing) : [];
                history.push(record);
                await AsyncStorage.setItem("history", JSON.stringify(history));

                router.back();
            }
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-black">
            <View className="absolute top-10 right-4 z-50">
                <TouchableOpacity
                    className="h-12 w-12 bg-white/20 rounded-full items-center justify-center"
                    onPress={() => router.back()}
                >
                    <X size={24} color="white" />
                </TouchableOpacity>
            </View>
            <CameraView style={StyleSheet.absoluteFillObject} facing={facing} ref={cameraRef}>
                <View className="flex-1 bg-transparent flex-row justify-center items-end pb-12 px-6">
                    <TouchableOpacity
                        className="flex-1 items-center"
                        onPress={toggleCameraFacing}
                    >
                        <View className="h-16 w-16 rounded-full bg-white/20 items-center justify-center">
                            <RotateCcw size={28} color="white" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="items-center justify-center focus:opacity-80"
                        onPress={takePicture}
                        disabled={loading}
                    >
                        <View className="h-20 w-20 rounded-full border-4 border-white items-center justify-center bg-transparent">
                            {loading ? (
                                <ActivityIndicator color="white" size="large" />
                            ) : (
                                <View className="h-16 w-16 bg-white rounded-full" />
                            )}
                        </View>
                    </TouchableOpacity>
                    <View className="flex-1" />
                </View>
            </CameraView>
        </View>
    );
}
