import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Layout } from './components/Layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><App /></Layout>,
  },
  {
    path: '/terms',
    element: <Layout><TermsAndConditions /></Layout>,
  },
  {
    path: '/privacy',
    element: <Layout><PrivacyPolicy /></Layout>,
  },
  // Add other routes here
]); 