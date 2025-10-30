'use client';

import { useState } from 'react';

export const useBetMetrics = () => {
  // Browns vs Steelers spread bet metrics
  const [brownsSpread, setBrownsSpread] = useState(-2);
  const [steelersPercentage, setSteelersPercentage] = useState(87);

  // Rams vs Bills spread bet metrics
  const [ramsSpread, setRamsSpread] = useState(7);
  const [billsPercentage, setBillsPercentage] = useState(80);

  // Stephen Curry over/under bet metrics
  const [curryOverValue, setCurryOverValue] = useState(28.5);
  const [curryOdds, setCurryOdds] = useState(-110);
  const [curryValue, setCurryValue] = useState(-81);
  const [curryProgress, setCurryProgress] = useState(85);

  // Saints/Buccaneers over/under bet metrics
  const [saintsOverValue, setSaintsOverValue] = useState(45.5);
  const [saintsOdds, setSaintsOdds] = useState(-110);
  const [buccaneersValue, setBuccaneersValue] = useState(-79);
  const [buccaneersProgress, setBuccaneersProgress] = useState(83);

  return {
    // Browns vs Steelers
    brownsSpread,
    setBrownsSpread,
    steelersPercentage,
    setSteelersPercentage,
    
    // Rams vs Bills
    ramsSpread,
    setRamsSpread,
    billsPercentage,
    setBillsPercentage,
    
    // Stephen Curry
    curryOverValue,
    setCurryOverValue,
    curryOdds,
    setCurryOdds,
    curryValue,
    setCurryValue,
    curryProgress,
    setCurryProgress,
    
    // Saints/Buccaneers
    saintsOverValue,
    setSaintsOverValue,
    saintsOdds,
    setSaintsOdds,
    buccaneersValue,
    setBuccaneersValue,
    buccaneersProgress,
    setBuccaneersProgress,
  };
};

