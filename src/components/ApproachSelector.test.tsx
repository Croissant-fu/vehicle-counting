import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ApproachSelector from './ApproachSelector';

describe('ApproachSelector - cardinal', () => {
  test('renders N S E W buttons', () => {
    const { getByText } = render(
      <ApproachSelector legs={null} selected="N" onSelect={jest.fn()} />
    );
    expect(getByText('N')).toBeTruthy();
    expect(getByText('S')).toBeTruthy();
    expect(getByText('E')).toBeTruthy();
    expect(getByText('W')).toBeTruthy();
  });

  test('calls onSelect with tapped direction', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ApproachSelector legs={null} selected="N" onSelect={onSelect} />
    );
    fireEvent.press(getByText('S'));
    expect(onSelect).toHaveBeenCalledWith('S');
  });

  test('highlights the selected direction', () => {
    const { getByTestId } = render(
      <ApproachSelector legs={null} selected="E" onSelect={jest.fn()} />
    );
    expect(getByTestId('approach-E')).toHaveStyle({ backgroundColor: expect.stringContaining('#') });
  });
});

describe('ApproachSelector - custom legs', () => {
  const legs = ['North Gate', 'East Gate', 'South Gate'];
  test('renders custom leg buttons instead of N S E W', () => {
    const { getByText, queryByText } = render(
      <ApproachSelector legs={legs} selected="North Gate" onSelect={jest.fn()} />
    );
    expect(getByText('North Gate')).toBeTruthy();
    expect(queryByText('N')).toBeNull();
  });
});
