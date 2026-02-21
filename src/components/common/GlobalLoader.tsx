import React from "react";

interface GlobalLoaderProps {
  isLoading: boolean;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      {/* Single Green Loader */}
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full border-4 border-gray-200 border-t-green-600 animate-spin" />
        
        {/* Loading text */}
        <p className="text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-full shadow-lg">
          Loading...
        </p>
      </div>
    </div>
  );
};

export default GlobalLoader;
