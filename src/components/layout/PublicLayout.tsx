import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { Chatbot } from '../common/Chatbot';

export const PublicLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a225a] text-white">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
      <Chatbot />
    </div>
  );
};
