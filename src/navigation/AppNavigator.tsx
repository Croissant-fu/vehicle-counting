import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SessionsListScreen from '../screens/SessionsListScreen';
import SessionSetupScreen from '../screens/SessionSetupScreen';
import CountingScreen from '../screens/CountingScreen';
import SessionReviewScreen from '../screens/SessionReviewScreen';
import { Session } from '../types';

export type RootStackParamList = {
  SessionsList: undefined;
  SessionSetup: undefined;
  Counting: { session: Session };
  SessionReview: { sessionId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SessionsList">
        <Stack.Screen name="SessionsList" component={SessionsListScreen} options={{ title: 'My Sessions' }} />
        <Stack.Screen name="SessionSetup" component={SessionSetupScreen} options={{ title: 'New Session' }} />
        <Stack.Screen name="Counting" component={CountingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SessionReview" component={SessionReviewScreen} options={{ title: 'Session Review' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
