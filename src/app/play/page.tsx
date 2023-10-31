'use client'
import { ApolloSandbox } from '@apollo/sandbox/react';
  
export default function EmbeddedSandbox() {
  return (
    <ApolloSandbox
      initialEndpoint='http://localhost:3000'
    />
  );
}