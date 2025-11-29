// services/authService.ts
import { CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// Define the shape of the user data returned by Google
export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  sub: string; // Google's unique ID for the user
}

class AuthService {
  // 1. Handle the response from Google
  login(response: CredentialResponse): GoogleUser | null {
    if (!response.credential) {
      console.error('No credential received');
      return null;
    }

    try {
      // Decode the JWT token to get user info
      const decoded: GoogleUser = jwtDecode(response.credential);
      
      // Save to local storage (optional: for persistence)
      this.saveSession(response.credential);
      
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // 2. Save the token to LocalStorage
  private saveSession(token: string): void {
    localStorage.setItem('google_token', token);
  }

  // 3. Check if a user is already logged in (e.g., on page refresh)
  getCurrentUser(): GoogleUser | null {
    const token = localStorage.getItem('google_token');
    if (!token) return null;

    try {
      return jwtDecode<GoogleUser>(token);
    } catch {
      return null;
    }
  }

  // 4. Logout
  logout(): void {
    localStorage.removeItem('google_token');
  }
}

// Export a singleton instance
export const authService = new AuthService();