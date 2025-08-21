import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_live_51RiPHDLvKNaGPjzpkmBGQNR6z2YDeZma2wEFJbmRM8WeyKF2oVsJhKcjvxmxtrSRPIbB3vx0VugEHJeI4iEfdLpY00XMMH2zbA');

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};