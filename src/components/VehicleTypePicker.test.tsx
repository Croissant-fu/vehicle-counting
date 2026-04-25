import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import VehicleTypePicker from './VehicleTypePicker';

test('renders all 4 vehicle types', () => {
  const { getByText } = render(<VehicleTypePicker selected="moto" onSelect={jest.fn()} />);
  expect(getByText('Moto')).toBeTruthy();
  expect(getByText('Car')).toBeTruthy();
  expect(getByText('Rickshaw')).toBeTruthy();
  expect(getByText('Other')).toBeTruthy();
});

test('calls onSelect with the vehicle type key', () => {
  const onSelect = jest.fn();
  const { getByText } = render(<VehicleTypePicker selected="moto" onSelect={onSelect} />);
  fireEvent.press(getByText('Car'));
  expect(onSelect).toHaveBeenCalledWith('car');
});
