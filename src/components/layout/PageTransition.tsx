import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('enter');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('exit');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'exit') {
      setTransitionStage('enter');
      setDisplayLocation(location);
    }
  };

  return (
    <div
      className={`page-transition ${transitionStage === 'enter' ? 'page-enter' : 'page-exit'}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}
