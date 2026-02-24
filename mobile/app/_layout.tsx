import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

export default function Layout() {
    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: "#F7FAF7" },
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="camera" options={{ presentation: "fullScreenModal" }} />
                <Stack.Screen name="history" options={{ presentation: "modal" }} />
            </Stack>
        </>
    );
}
