import { db } from './firestore';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  getDoc,
} from 'firebase/firestore';

export async function followUser(currentUserId: string, targetUserId: string) {
  await setDoc(doc(db, 'following', `${currentUserId}_${targetUserId}`), {
    followerId: currentUserId,
    followingId: targetUserId,
    createdAt: new Date().toISOString(),
  });
}

export async function unfollowUser(currentUserId: string, targetUserId: string) {
  await deleteDoc(doc(db, 'following', `${currentUserId}_${targetUserId}`));
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  const docRef = doc(db, 'following', `${currentUserId}_${targetUserId}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
}

export async function getFollowing(userId: string): Promise<string[]> {
  const q = query(collection(db, 'following'), where('followerId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data().followingId);
}

export async function getFollowers(userId: string): Promise<string[]> {
  const q = query(collection(db, 'following'), where('followingId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data().followerId);
}

export async function searchUsers(searchText: string): Promise<any[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((u: any) =>
      u.username?.toLowerCase().includes(searchText.toLowerCase())
    );
}