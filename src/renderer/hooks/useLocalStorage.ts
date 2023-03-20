import { Dispatch, SetStateAction, useState } from 'react';

export default function useLocalStorage<S>(
  key: string,
  initialValue: S | (() => S),
  initialValueCallback?: (arg0: S) => void
): [S, Dispatch<SetStateAction<S>>] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      const result = item ? JSON.parse(item) : initialValue;

      if (result !== initialValue && initialValueCallback instanceof Function) {
        initialValueCallback(result);
      }

      return result;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: Dispatch<SetStateAction<S>> = (value) => {
    try {
      // Allow value to be a function, so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      // Save state
      setStoredValue(valueToStore);

      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };
  return [storedValue, setValue];
}
