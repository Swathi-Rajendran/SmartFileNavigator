import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { FileCounts } from '@/lib/types';
import { Search, FileText, Image, Film, History, Settings, User, Menu } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: fileCounts } = useQuery<FileCounts>({
    queryKey: ['/api/files/counts'],
  });

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:block w-64 bg-white border-r border-neutral-200 flex-shrink-0">
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Logo section */}
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center space-x-2">
              <div className="bg-primary text-white p-1.5 rounded">
                <Search className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-semibold text-neutral-800">
                AI File Search
              </h1>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="p-3 flex-1">
            <div className="space-y-1">
              <Link href="/">
                <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                  location === '/' ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'
                }`}>
                  <Search className="mr-3 h-4 w-4 text-primary-600" />
                  Search
                </div>
              </Link>
              <Link href="/files">
                <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                  location === '/files' ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'
                }`}>
                  <FileText className="mr-3 h-4 w-4 text-neutral-500" />
                  My Files
                </div>
              </Link>
              <Link href="/history">
                <div className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                  location === '/history' ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'
                }`}>
                  <History className="mr-3 h-4 w-4 text-neutral-500" />
                  Recent Searches
                </div>
              </Link>
            </div>
            
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                File Types
              </h3>
              <div className="mt-2 space-y-1">
                <Link href="/files?type=document">
                  <div className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 cursor-pointer">
                    <div className="flex items-center">
                      <FileText className="mr-3 h-4 w-4 text-neutral-500" />
                      Documents
                    </div>
                    <span className="text-xs bg-neutral-100 text-neutral-600 py-1 px-2 rounded-full">
                      {fileCounts?.document || 0}
                    </span>
                  </div>
                </Link>
                <Link href="/files?type=image">
                  <div className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 cursor-pointer">
                    <div className="flex items-center">
                      <Image className="mr-3 h-4 w-4 text-neutral-500" />
                      Images
                    </div>
                    <span className="text-xs bg-neutral-100 text-neutral-600 py-1 px-2 rounded-full">
                      {fileCounts?.image || 0}
                    </span>
                  </div>
                </Link>
                <Link href="/files?type=video">
                  <div className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 cursor-pointer">
                    <div className="flex items-center">
                      <Film className="mr-3 h-4 w-4 text-neutral-500" />
                      Videos
                    </div>
                    <span className="text-xs bg-neutral-100 text-neutral-600 py-1 px-2 rounded-full">
                      {fileCounts?.video || 0}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </nav>
          
          {/* Settings section */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700">
                <span className="text-sm font-semibold">US</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-700">User</p>
                <p className="text-xs text-neutral-500">user@example.com</p>
              </div>
              <button className="ml-auto p-1.5 text-neutral-400 hover:text-neutral-600">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside 
        className={`lg:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-neutral-200 z-30 transform transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Logo section */}
          <div className="p-4 border-b border-neutral-200">
            <div className="flex items-center space-x-2">
              <div className="bg-primary text-white p-1.5 rounded">
                <Search className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-semibold text-neutral-800">
                AI File Search
              </h1>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="p-3 flex-1">
            <div className="space-y-1">
              <Link href="/">
                <div 
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                    location === '/' ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <Search className="mr-3 h-4 w-4 text-primary-600" />
                  Search
                </div>
              </Link>
              <Link href="/files">
                <div 
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                    location === '/files' ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <FileText className="mr-3 h-4 w-4 text-neutral-500" />
                  My Files
                </div>
              </Link>
              <Link href="/history">
                <div 
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer ${
                    location === '/history' ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <History className="mr-3 h-4 w-4 text-neutral-500" />
                  Recent Searches
                </div>
              </Link>
            </div>
            
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                File Types
              </h3>
              <div className="mt-2 space-y-1">
                <Link href="/files?type=document">
                  <div 
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <div className="flex items-center">
                      <FileText className="mr-3 h-4 w-4 text-neutral-500" />
                      Documents
                    </div>
                    <span className="text-xs bg-neutral-100 text-neutral-600 py-1 px-2 rounded-full">
                      {fileCounts?.document || 0}
                    </span>
                  </div>
                </Link>
                <Link href="/files?type=image">
                  <div 
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <div className="flex items-center">
                      <Image className="mr-3 h-4 w-4 text-neutral-500" />
                      Images
                    </div>
                    <span className="text-xs bg-neutral-100 text-neutral-600 py-1 px-2 rounded-full">
                      {fileCounts?.image || 0}
                    </span>
                  </div>
                </Link>
                <Link href="/files?type=video">
                  <div 
                    className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                    onClick={() => setMobileSidebarOpen(false)}
                  >
                    <div className="flex items-center">
                      <Film className="mr-3 h-4 w-4 text-neutral-500" />
                      Videos
                    </div>
                    <span className="text-xs bg-neutral-100 text-neutral-600 py-1 px-2 rounded-full">
                      {fileCounts?.video || 0}
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </nav>
          
          {/* Settings section */}
          <div className="p-4 border-t border-neutral-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700">
                <span className="text-sm font-semibold">US</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-neutral-700">User</p>
                <p className="text-xs text-neutral-500">user@example.com</p>
              </div>
              <button className="ml-auto p-1.5 text-neutral-400 hover:text-neutral-600">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-50">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
          <button 
            className="p-1.5 text-neutral-500 hover:text-neutral-700 focus:outline-none"
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="bg-primary text-white p-1 rounded">
              <Search className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-800">
              AI File Search
            </h1>
          </div>
          <button className="p-1.5 text-neutral-500 hover:text-neutral-700 focus:outline-none">
            <User className="h-5 w-5" />
          </button>
        </header>

        {/* Page content */}
        {children}
      </main>
    </div>
  );
}
