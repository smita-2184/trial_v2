import React from 'react';

export function TermsAndConditions() {
  return (
    <div className="container mx-auto px-4 py-8 prose prose-invert max-w-none min-h-[calc(100vh-200px)]">
      <h1>Terms and Conditions</h1>
      
      <section>
        <h2>1. Services Overview</h2>
        <p>
          Study Assistant provides educational tools including:
          - Code editing and execution environment
          - Mathematical computation and visualization
          - AI-powered learning assistance
          - Document viewing and annotation
          - Interactive learning features
        </p>
      </section>

      <section>
        <h2>2. User Rights and Responsibilities</h2>
        <ul>
          <li>Users must be at least 16 years old or have parental consent</li>
          <li>Users are responsible for maintaining account security</li>
          <li>Content created must not violate intellectual property rights</li>
          <li>Users must not misuse the AI features or computational resources</li>
        </ul>
      </section>

      <section>
        <h2>3. Intellectual Property</h2>
        <p>
          - Users retain rights to their created content
          - The platform's software, design, and features are protected by copyright
          - Third-party libraries and tools are used under their respective licenses
        </p>
      </section>

      <section>
        <h2>4. Service Limitations</h2>
        <ul>
          <li>Code execution is limited to supported languages and resource constraints</li>
          <li>AI features are provided as-is with no guarantee of accuracy</li>
          <li>Service availability may be subject to maintenance or technical issues</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Usage and Storage</h2>
        <p>
          - User data is stored and processed in compliance with GDPR
          - Code and documents may be temporarily stored for functionality
          - Usage analytics are collected for service improvement
        </p>
      </section>
    </div>
  );
} 