import { createContext, useContext, useState } from 'react';

const UnitContext = createContext({ unit: 'mSv', toggle: () => {} });

export function UnitProvider({ children }) {
  const [unit, setUnit] = useState(() => localStorage.getItem('rm_unit') || 'mSv');

  function toggle() {
    const next = unit === 'mSv' ? 'µSv' : 'mSv';
    setUnit(next);
    localStorage.setItem('rm_unit', next);
  }

  return <UnitContext.Provider value={{ unit, toggle }}>{children}</UnitContext.Provider>;
}

export function useUnit() {
  return useContext(UnitContext);
}
