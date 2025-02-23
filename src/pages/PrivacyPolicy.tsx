import React from 'react';

export function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 prose prose-invert max-w-none min-h-[calc(100vh-200px)]">
      <h1>Privacy Policy</h1>

      <section>
        <h2>1. Data Collection</h2>
        <h3>We collect the following data:</h3>
        <ul>
          <li>Account information (email, username)</li>
          <li>User-created content (code, documents, notes)</li>
          <li>Usage data (features used, interaction patterns)</li>
          <li>Technical data (browser type, IP address)</li>
        </ul>
      </section>

      <section>
        <h2>2. GDPR Compliance</h2>
        <h3>Your rights under GDPR:</h3>
        <ul>
          <li>Right to access your data</li>
          <li>Right to rectification</li>
          <li>Right to erasure ("right to be forgotten")</li>
          <li>Right to data portability</li>
          <li>Right to object to processing</li>
        </ul>
      </section>

      <section>
        <h2>3. Data Processing</h2>
        <p>We process data for:</p>
        <ul>
          <li>Providing core service functionality</li>
          <li>Improving user experience</li>
          <li>Security and fraud prevention</li>
          <li>Legal compliance</li>
        </ul>
      </section>

      <section>
        <h2>4. Third-Party Services</h2>
        <p>We use the following services:</p>
        <ul>
          <li>Google AI for code assistance</li>
          <li>Firebase for authentication and storage</li>
          <li>Monaco Editor for code editing</li>
          <li>Various mathematical and visualization libraries</li>
        </ul>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to ensure data security:
        </p>
        <ul>
          <li>Encryption in transit and at rest</li>
          <li>Regular security audits</li>
          <li>Access controls and authentication</li>
          <li>Secure data processing procedures</li>
        </ul>
      </section>

      <section>
        <h2>6. Contact Information</h2>
        <p>
          For privacy-related inquiries:<br />
          Email: privacy@studyassistant.com<br />
          Data Protection Officer: dpo@studyassistant.com
        </p>
      </section>
    </div>
  );
} 