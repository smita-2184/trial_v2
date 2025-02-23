import React from 'react';
import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#2C2C2E] text-gray-300 py-8 mt-auto flex-shrink-0">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-white font-semibold mb-4">Study Assistant</h3>
            <p className="text-sm">
              An advanced educational platform combining AI-powered learning tools, 
              interactive coding environments, mathematical visualization, and comprehensive 
              study assistance for STEM subjects.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-sm">
              <li>AI-Powered Study Tools</li>
              <li>Interactive Code Editor</li>
              <li>Mathematical Visualization</li>
              <li>Physics & Chemistry Labs</li>
              <li>Document Analysis</li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/gdpr" className="hover:text-white transition-colors">
                  GDPR Compliance
                </Link>
              </li>
              <li>
                <Link to="/licenses" className="hover:text-white transition-colors">
                  Open Source Licenses
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li>Email: support@studyassistant.com</li>
              <li>Location: Based in the European Union</li>
              <li>Support Hours: Mon-Fri, 9:00-17:00 CET</li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">
              © {currentYear} Study Assistant. All rights reserved. Developed and maintained in the EU.
              Protected by EU intellectual property laws and GDPR compliant.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <Link to="/accessibility" className="text-sm hover:text-white transition-colors">
                Accessibility
              </Link>
              <Link to="/sitemap" className="text-sm hover:text-white transition-colors">
                Sitemap
              </Link>
              <a 
                href="https://ec.europa.eu/info/law/law-topic/data-protection_en" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm hover:text-white transition-colors"
              >
                EU Data Protection
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 