import { FileType } from '@/lib/types';

interface FilterTabsProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  counts: {
    total: number;
    document: number;
    image: number;
    video: number;
  };
}

export default function FilterTabs({ activeFilter, setActiveFilter, counts }: FilterTabsProps) {
  return (
    <div className="mt-4 max-w-3xl mx-auto">
      <div className="flex items-center space-x-1 border-b border-neutral-200 overflow-x-auto">
        <button 
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
            activeFilter === 'all' 
              ? 'text-primary-600 border-b-2 border-primary' 
              : 'text-neutral-600 hover:text-neutral-900'
          } focus:outline-none`}
          onClick={() => setActiveFilter('all')}
        >
          All ({counts.total})
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
            activeFilter === 'document' 
              ? 'text-primary-600 border-b-2 border-primary' 
              : 'text-neutral-600 hover:text-neutral-900'
          } focus:outline-none`}
          onClick={() => setActiveFilter('document')}
        >
          Documents ({counts.document})
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
            activeFilter === 'image' 
              ? 'text-primary-600 border-b-2 border-primary' 
              : 'text-neutral-600 hover:text-neutral-900'
          } focus:outline-none`}
          onClick={() => setActiveFilter('image')}
        >
          Images ({counts.image})
        </button>
        <button 
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
            activeFilter === 'video' 
              ? 'text-primary-600 border-b-2 border-primary' 
              : 'text-neutral-600 hover:text-neutral-900'
          } focus:outline-none`}
          onClick={() => setActiveFilter('video')}
        >
          Videos ({counts.video})
        </button>
      </div>
    </div>
  );
}
