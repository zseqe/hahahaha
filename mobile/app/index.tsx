import { View, Text, TouchableOpacity, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Camera, Image as ImageIcon, History } from "lucide-react-native";

export default function Home() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-[#F7FAF7]">
            {/* Header */}
            <View className="h-16 px-4 flex-row items-center justify-between border-b-2 border-gray-200 bg-white pt-2 pb-2">
                <View className="flex-row items-center overflow-hidden">
                    <Text className="text-xl font-bold text-gray-900">Plant Finder</Text>
                </View>
                <View className="flex-row gap-2">
                    {/* We can place the Lang Switcher here later if needed */}
                    <TouchableOpacity
                        className="h-10 w-10 rounded-lg border-2 border-gray-300 bg-white items-center justify-center"
                        onPress={() => router.push("/history")}
                    >
                        <History size={20} color="#1f2937" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="px-4 pt-5 pb-8 space-y-4">
                {/* Main Action Card */}
                <View className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                    <View className="flex-row items-start gap-3">
                        <View className="h-12 w-12 rounded-lg bg-emerald-100 items-center justify-center">
                            <Camera size={24} color="#064e3b" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-xl font-extrabold text-emerald-950">Identify Plant</Text>
                            <Text className="text-base font-semibold text-emerald-800 mt-1">
                                Take a photo or choose from gallery to identify a medicinal plant.
                            </Text>
                        </View>
                    </View>

                    <View className="mt-4 flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 rounded-lg bg-emerald-800 flex-row items-center justify-center gap-2 py-3 px-2"
                            onPress={() => router.push("/camera")}
                        >
                            <Camera size={20} color="white" />
                            <Text className="text-white font-bold text-[15px]">Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 rounded-lg bg-emerald-100 flex-row items-center justify-center gap-2 py-3 px-2"
                        // onPress={() => pickImage()}
                        >
                            <ImageIcon size={20} color="#064e3b" />
                            <Text className="text-emerald-900 font-bold text-[15px]">Gallery</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tips Section */}
                <View className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 mt-4">
                    <Text className="font-extrabold text-amber-900 text-lg">Tips for best results:</Text>
                    <View className="mt-2 ml-2">
                        <Text className="text-base font-semibold text-amber-900 mb-1">• Ensure good lighting</Text>
                        <Text className="text-base font-semibold text-amber-900 mb-1">• Focus clearly on the leaves</Text>
                        <Text className="text-base font-semibold text-amber-900 mb-1">• Include the whole plant if possible</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
