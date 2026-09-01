import { Redirect } from 'expo-router';

// Auth removed — open the app straight to the home menu.
export default function IndexScreen() {
  return <Redirect href="/home-menu" />;
}
