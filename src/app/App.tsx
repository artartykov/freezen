import type { ComponentProps } from 'react';
import { HomePage } from '@pages/home';
import './styles/global.css';

export function App({ hero }: ComponentProps<typeof HomePage>) {
  return <HomePage hero={hero} />;
}
