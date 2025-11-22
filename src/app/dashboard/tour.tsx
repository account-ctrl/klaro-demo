'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Joyride, { Step, CallBackProps } from 'react-joyride';

const tourSteps: Step[] = [
  {
    target: 'body',
    content: 'Welcome to KlaroBarangay! Let\'s take a quick tour of your new dashboard.',
    placement: 'center',
    title: 'Welcome!',
  },
  {
    target: '#kpi-cards',
    content: 'This is your command center. Get a high-level overview of key metrics like total residents, documents issued, and funds collected at a glance.',
    title: 'Your Dashboard KPIs',
  },
  {
    target: '#ai-chat-widget',
    content: 'Have a question? Ask Klaro AI. You can ask things like "How many senior citizens are in Purok 1?" or "Summarize the ongoing projects."',
    title: 'AI-Powered Insights',
  },
  {
    target: '#sidebar-nav',
    content: 'Use the sidebar to navigate between all the core modules, from managing residents and households to handling blotter cases and finances.',
    title: 'Main Navigation',
  },
  {
    target: '#user-profile-menu',
    content: 'Click here to manage your profile, view settings, or log out of your account.',
    title: 'Your Account',
  },
  {
    target: 'body',
    content: 'You\'re all set! You can now start exploring the platform. If you need help, look for the support button.',
    placement: 'center',
    title: 'Tour Complete!',
  },
];

export const Tour = () => {
  const searchParams = useSearchParams();
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Start the tour if the 'tour=true' parameter is in the URL
    if (searchParams.get('tour') === 'true') {
      setRunTour(true);
    }
  }, [searchParams]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (['finished', 'skipped'].includes(status)) {
      setRunTour(false);
      // Optional: remove the tour parameter from URL without reloading
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  };

  return (
    <Joyride
      steps={tourSteps as any}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6', // blue-500
          zIndex: 10000,
        },
        tooltip: {
            borderRadius: '.5rem',
        },
        buttonNext: {
            borderRadius: '.5rem',
        },
        buttonBack: {
            borderRadius: '.5rem',
        }
      } as any}
    />
  );
};
