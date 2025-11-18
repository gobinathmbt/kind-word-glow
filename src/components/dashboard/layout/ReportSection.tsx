import React, { useRef, useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';

interface ReportSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ title, icon, children }) => {
  const [visibleIndices, setVisibleIndices] = useState<Set<number>>(new Set([0])); // First component loads immediately
  const observerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    
    observerRefs.current.forEach((ref, index) => {
      if (!ref) return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisibleIndices((prev) => new Set(prev).add(index));
            }
          });
        },
        {
          root: null,
          rootMargin: '100px', // Start loading 100px before component enters viewport
          threshold: 0.1,
        }
      );

      observer.observe(ref);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [children]);

  const childrenArray = React.Children.toArray(children);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-6">
        {childrenArray.map((child, index) => (
          <div
            key={index}
            ref={(el) => (observerRefs.current[index] = el)}
          >
            {React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<any>, {
                  shouldLoad: visibleIndices.has(index),
                })
              : child}
          </div>
        ))}
      </div>
    </div>
  );
};
