import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

// We map Firebase's "User" type to your specific needs
export interface GoogleUser {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL: string | null;
}

class AuthService {
  // 1. Trigger the Google Popup
  async loginWithGoogle(): Promise<GoogleUser | null> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return this.mapUser(result.user);
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  }

  // 2. Logout
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  // 3. Auth State Listener (Replaces manual localStorage check)
  // This callback fires whenever the user logs in, logs out, or the app refreshes
  onUserChanged(callback: (user: GoogleUser | null) => void) {
    return onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? this.mapUser(firebaseUser) : null;
      callback(user);
    });
  }

  // Helper to format Firebase user to your app's interface
  private mapUser(user: User): GoogleUser {
    return {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    };
  }
}

export const authService = new AuthService();