import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, Linking } from "react-native";
import { useRouter } from "expo-router";
import { X, History as HistoryIcon, MapPin } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HistoryRecord = {
    id: string;
    plantId: string;
    uri: string;
    createdAt: number;
    location?: { lat: number; lng: number } | null;
};

export default function HistoryScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [records, setRecords] = useState<HistoryRecord[]>([]);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const existing = await AsyncStorage.getItem("history");
                if (existing) {
                    const parsed = JSON.parse(existing) as HistoryRecord[];
                    setRecords(parsed.sort((a, b) => b.createdAt - a.createdAt));
                }
            } catch (e) {
                console.log("Failed to fetch history");
            }
        };
        loadHistory();
    }, []);

    return (
        <View className="flex-1 bg-[#F7FAF7]" style={{ paddingTop: insets.top }}>
            <View className="px-4 py-4 flex-row items-center justify-between border-b-2 border-gray-100 bg-white shadow-sm">
                <View>
                    <Text className="text-2xl font-extrabold text-emerald-950">History</Text>
                    <Text className="text-sm font-medium text-emerald-800">Your previous plant scans.</Text>
                </View>
                <TouchableOpacity
                    className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 items-center justify-center"
                    onPress={() => router.back()}
                >
                    <X size={20} color="#374151" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 py-4">
                {records.length === 0 ? (
                    <View className="items-center justify-center mt-20">
                        <HistoryIcon size={48} color="#9CA3AF" opacity={0.3} />
                        <Text className="font-semibold text-gray-500 mt-4 text-center">No history yet.</Text>
                    </View>
                ) : (
                    <View className="gap-3 pb-8">
                        {records.map((rec) => (
                            <TouchableOpacity
                                key={rec.id}
                                className="w-full bg-white border-2 border-gray-200 rounded-lg p-3 flex-row gap-4 items-center mb-3"
                                onPress={() => {
                                    // Navigate to plant details
                                }}
                            >
                                <View className="h-16 w-16 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-100">
                                    <Image source={{ uri: rec.uri }} className="flex-1 rounded-lg" resizeMode="cover" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-bold text-gray-900 text-base" numberOfLines={1}>
                                        Captured Plant
                                    </Text>
                                    <Text className="text-sm text-gray-500 font-medium mt-1">
                                        {new Date(rec.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                {rec.location && (
                                    <TouchableOpacity
                                        className="h-10 w-10 shrink-0 rounded-full bg-emerald-50 items-center justify-center"
                                        onPress={() => {
                                            Linking.openURL(
                                                `https://www.google.com/maps/search/?api=1&query=${rec.location!.lat},${rec.location!.lng}`
                                            );
                                        }}
                                    >
                                        <MapPin size={20} color="#059669" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
