import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "@/screens/LoginScreen";
import { RegisterScreen } from "@/screens/RegisterScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#fef7e5" } }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
