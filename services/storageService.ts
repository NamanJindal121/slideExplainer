import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  ref, 
  uploadString, 
  getDownloadURL, 
  deleteObject, 
  listAll 
} from 'firebase/storage';
import { db, storage, auth } from './firebase';
import { Presentation } from '../types';

// Helper to get current user ID
const getUserId = () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in.");
  return user.uid;
};

// 1. Upload to a SHARED storage path
const uploadImage = async (presentationId: string, slideIndex: number, dataUrl: string) => {
  // We remove 'users/{uid}' from the path so it's easier to access globally
  const imageRef = ref(storage, `public_presentations/${presentationId}/slide_${slideIndex}.jpg`);
  
  await uploadString(imageRef, dataUrl, 'data_url');
  return getDownloadURL(imageRef);
};

export const savePresentation = async (presentation: Presentation): Promise<void> => {
  const userId = getUserId();
  const userName = auth.currentUser?.displayName || 'Anonymous';
  const userPhoto = auth.currentUser?.photoURL || '';

  // NEW: Save to root 'presentations' collection instead of under 'users'
  const presRef = doc(db, 'presentations', presentation.id);

  try {
    const slidePromises = presentation.slides.map(async (slide, index) => {
      if (slide.imageUrl.startsWith('http')) return slide;
      const publicUrl = await uploadImage(presentation.id, index, slide.imageUrl);
      return { ...slide, imageUrl: publicUrl };
    });

    const updatedSlides = await Promise.all(slidePromises);

    const cloudPresentation = {
      ...presentation,
      thumbnailUrl: updatedSlides[0]?.imageUrl || '',
      slides: updatedSlides,
      // Metadata to identify the author
      authorId: presentation.authorId || userId,
      authorName: presentation.authorName || userName,
      authorPhoto: presentation.authorPhoto || userPhoto
    };

    await setDoc(presRef, cloudPresentation);
    
  } catch (error) {
    console.error("Error saving presentation:", error);
    throw error;
  }
};

export const getPresentations = async (): Promise<Presentation[]> => {
  // Query the global collection
  const presentationsRef = collection(db, 'presentations');
  const q = query(presentationsRef, orderBy('lastModified', 'desc'));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Presentation);
};

export const deletePresentation = async (id: string): Promise<void> => {
  // Note: Firestore Security Rules will prevent non-owners from doing this
  await deleteDoc(doc(db, 'presentations', id));

  // Cleanup storage
  const folderRef = ref(storage, `public_presentations/${id}`);
  try {
    const fileList = await listAll(folderRef);
    await Promise.all(fileList.items.map(fileRef => deleteObject(fileRef)));
  } catch (error) {
    console.warn("Cleanup warning:", error);
  }
};