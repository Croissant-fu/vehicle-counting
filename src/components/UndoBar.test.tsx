import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UndoBar from './UndoBar';

test('displays the total count', () => {
  const { getByText } = render(<UndoBar total={42} onUndo={jest.fn()} />);
  expect(getByText('42')).toBeTruthy();
});

test('calls onUndo when undo pressed', () => {
  const onUndo = jest.fn();
  const { getByTestId } = render(<UndoBar total={5} onUndo={onUndo} />);
  fireEvent.press(getByTestId('undo-btn'));
  expect(onUndo).toHaveBeenCalledTimes(1);
});
