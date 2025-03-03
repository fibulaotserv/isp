import React, { useState } from 'react';

interface FormattedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  formatter: (value: string) => string;
  unformatter: (value: string) => string;
  maxRawLength?: number;
}

export default function FormattedInput({
  formatter,
  unformatter,
  maxRawLength,
  value,
  onChange,
  ...props
}: FormattedInputProps) {
  const [displayValue, setDisplayValue] = useState(value ? formatter(value.toString()) : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = unformatter(e.target.value);
    
    if (maxRawLength && rawValue.length > maxRawLength) {
      return;
    }

    const formattedValue = formatter(rawValue);
    setDisplayValue(formattedValue);

    if (onChange) {
      // Create a synthetic event with the unformatted value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: rawValue
        }
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <input
      {...props}
      value={displayValue}
      onChange={handleChange}
    />
  );
}