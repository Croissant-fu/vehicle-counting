import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DirectionButtons from './DirectionButtons';

test('renders Left, Straight, Right buttons', () => {
  const { getByTestId } = render(<DirectionButtons onPress={jest.fn()} />);
  expect(getByTestId('dir-left')).toBeTruthy();
  expect(getByTestId('dir-straight')).toBeTruthy();
  expect(getByTestId('dir-right')).toBeTruthy();
});

test('calls onPress with correct movement', () => {
  const onPress = jest.fn();
  const { getByTestId } = render(<DirectionButtons onPress={onPress} />);
  fireEvent.press(getByTestId('dir-right'));
  expect(onPress).toHaveBeenCalledWith('right');
});
