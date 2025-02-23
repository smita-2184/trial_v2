import React, { useState } from 'react';
import { useAuthStore } from '../store/auth';

interface LoginFormData {
  username: string;
  password: string;
  course?: string;
  gender?: string;
  major?: string;
  semester?: number;
  isRegistering: boolean;
}

export function Login() {
  const { signIn, signUp, error, clearError } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    course: 'B.Sc',
    gender: 'prefer-not-to-say',
    major: 'Chemistry',
    semester: 1,
    isRegistering: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    try {
      if (formData.isRegistering) {
        await signUp(formData.username, formData.password, {
          username: formData.username,
          course: formData.course!,
          gender: formData.gender!,
          major: formData.major!,
          semester: formData.semester!,
          role: 'user'
        });
      } else {
        await signIn(formData.username, formData.password);
      }
    } catch (err) {
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow alphanumeric characters and underscores
    const sanitizedValue = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
    setFormData({ ...formData, username: sanitizedValue });
  };

  return (
    <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center p-4">
      <div className="bg-[#2C2C2E] rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">
          {formData.isRegistering ? 'Create Account' : 'Sign In'}
        </h1>

        {/* Test Credentials Info */}
        {!formData.isRegistering && (
          <div className="mb-4 p-4 bg-[#3A3A3C] rounded-lg">
            <p className="text-sm font-medium mb-2">Test Credentials:</p>
            <p className="text-sm text-gray-400">Username: Instructor85</p>
            <p className="text-sm text-gray-400">Password: Instructor85</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={handleUsernameChange}
              className="w-full bg-[#3A3A3C] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
              minLength={3}
              maxLength={20}
              placeholder="Only letters, numbers, and underscores"
            />
            <p className="text-xs text-gray-400 mt-1">
              Only letters, numbers, and underscores allowed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-[#3A3A3C] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {formData.isRegistering && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Course</label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="w-full bg-[#3A3A3C] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="B.Sc">B.Sc</option>
                  <option value="B.A">B.A</option>
                  <option value="M.Sc">M.Sc</option>
                  <option value="M.A">M.A</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-[#3A3A3C] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Major</label>
                <select
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  className="w-full bg-[#3A3A3C] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="Biology">Biology</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                  className="w-full bg-[#3A3A3C] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Please wait...' : formData.isRegistering ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({ ...prev, isRegistering: !prev.isRegistering }));
              clearError();
            }}
            className="w-full text-sm text-blue-400 hover:text-blue-300"
            disabled={loading}
          >
            {formData.isRegistering 
              ? 'Already have an account? Sign in' 
              : 'Need an account? Create one'}
          </button>
        </form>
      </div>
    </div>
  );
}