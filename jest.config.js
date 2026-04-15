module.exports = {
  preset: 'jest-expo',
  // @testing-library/react-native v12+ auto-extends jest matchers on import;
  // no separate setupFilesAfterEnv entry is required.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-screens|react-native-safe-area-context)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
