'use client';

import { Button } from '@/components/ui/button';
import { ChevronDown, Check, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SortingDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SortingDropdown({ value, onChange }: SortingDropdownProps) {
  const sortOptions = [
    { value: 'Most Popular', label: 'Most Popular', description: 'Highest volume + participants' },
    { value: 'Newest', label: 'Newest', description: 'Recently created' },
    { value: 'Ending Soon', label: 'Ending Soon', description: 'Closes soonest first' },
    { value: 'Highest Volume', label: 'Highest Volume', description: 'Most points traded' },
    { value: 'Most Participants', label: 'Most Active', description: 'Most participants' },
    { value: 'Most Controversial', label: 'Most Controversial', description: 'Closest to 50/50' }
  ];

  const handleSortChange = (sortOption: string) => {
    onChange(sortOption);
  };

  const currentOption = sortOptions.find(opt => opt.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-accent-bg border-border-input text-gray-400 hover:text-white hover:bg-panel-bg min-w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-400">Sort by</span>
              <span className="text-sm font-semibold">
                {currentOption?.label || value}
              </span>
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="bg-panel-bg border-border-input w-72 p-1"
        sideOffset={8}
        align="end"
      >
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className={`cursor-pointer p-3 rounded-lg m-1 transition-colors ${
              value === option.value
                ? 'bg-main-cta text-white'
                : 'text-gray-300 hover:text-white hover:bg-accent-bg'
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col flex-1">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs opacity-70 mt-1">{option.description}</span>
              </div>
              {value === option.value && (
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0 ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}