"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";
import AuthButton from "@/components/auth/AuthButton";
import NotificationBell from "@/components/notifications/NotificationBell";

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-pink-100 via-purple-50 to-blue-100 border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">KPulse</span>
              <span className="text-lg font-bold text-gray-900 sm:hidden">K</span>
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <SearchBar />
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-3">
            <NotificationBell />
            <AuthButton />
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden pb-4">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
