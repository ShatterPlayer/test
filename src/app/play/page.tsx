'use client'
import { ApolloSandbox } from '@apollo/sandbox/react';
  
import "./page.css";

export default function EmbeddedSandbox() {
  return (
    <div id='sandbox-container'>
      <ApolloSandbox
        initialEndpoint='http://localhost:3000/api/graphql'
      />
    </div>
  );
}